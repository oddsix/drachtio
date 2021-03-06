/**
 * Module dependencies.
 */

var util = require('util')
,EventEmitter = require('events').EventEmitter
,net = require('net')
,JsonSocket = require('json-socket')
,uuid = require('node-uuid')
,Request = require('./request')
,Response = require('./response')
,_ = require('underscore')
,debug = require('debug')('drachtio:agent');


/**
 * Expose `Agent`.
*/

module.exports = exports = Agent ;


/** 
	Manages messaging with the drachtio server

	@constructor
	@param {Object} app - the drachtio app
	@api private
*/

function Agent(app){
	if (!(this instanceof Agent)) return new Agent(app);

	EventEmitter.call(this); 

	this.app = app ;
	this.connected = false ;

	/* map of sip request methods to the associated routes invoked 
	when we receive a sip request outside of a dialog with that method */
	this.verbs = {} ;

	/* map of rid to the callback invoked when response is received to a non-sip request */
	this.cbResponse = {} ;

	/* map of transaction id for outgoing (client-initiated) sip requests to the callback 
	   that is invoked when responses are received on that transaction */
	this.cbTransaction = {} ;

}

util.inherits(Agent, EventEmitter);

/**
 * This callback is invoked when we successfully connect and authenticate
 * with the drachtio-server, or in the case of an error trying to do so.
 *
 * @callback connectCallback
 * @param {string} err - error
 * @param {string} [hostport] - sip host and port that drachtio-server is listening on
 */

/**
 * Connect to a drachtio-server instance
 * 
 * @param  {Object}   opts - connection parameters
 * @param  {connectCallback} [cb]   - callback on successful connection
 */
Agent.prototype.connect = function( opts, cb ) {
	debug('agent.connect, opts: ' + JSON.stringify(opts))
	var self = this ;
	if( 1 === arguments.length && _.isFunction( opts ) ) {
		cb = opts ;
		opts = {} ;
	}

	this.port = opts.port || 9022 ;
	this.host = opts.host  ;
	this.secret = opts.secret ;
	this.appName = opts.appName  ;

	if( cb ) this.addListener('connect', cb) ;

	if( !opts.host ) {
		throw new Error('host not provided') ;
	}
	if( !opts.secret ) {
		throw new Error('secret not provided')  ;
	}

	this.socket = new JsonSocket(new net.Socket());
	this.socket.connect( this.port, this.host, function() {
		self.connected = true ;

		var requestId = self.sendRequest('auth', {
			secret: self.secret
			,appName: self.appName
		}) ;
		self.state = 'authenticating' ;
	}) ;

	this.socket.on('error', function(err){
		debug('got socket error while connecting to %s: ', self.host + ':' + self.port, err) ;
		console.log(util.inspect(err)) ;
		if(!self.connected && cb ) {
			cb(err) ;
		}
	}) ;

	this.socket.on('message', function(msg){
		debug('received: ' + JSON.stringify(msg)) ;
		switch(self.state) {
			case 'authenticating':
				if( !msg.data.authenticated ) {
					self.emit('connect', 'failed to authenticate: ' + msg.data.reason ) ;
				}
				else {
					debug('authenticated, emit connect')
					self.state = 'authenticated' ;
					self.routeVerbs() ;
					self.app.set('sip contact address', msg.data.hostport) ;
					process.nextTick( function() {
						self.emit('connect', {hostport: msg.data.hostport}) ;
					}) ;
				}
				break ;

			case 'authenticated':
				self.handle(msg) ;
				break ;

			default:
				throw new Error('undefined state ' + self.state) ;
		}
	}) ;

	this.socket.on('close', function(){
		debug('connection closed to %s', self.host + ':' + self.port) ;
		self.connected = false ;
		self.emit('disconnect') ;
	})
} ;
/**
 * dispatch incoming messages from drachtio-server
 * @param  {Object} msg - incoming message
 */
Agent.prototype.handle = function( msg ) {
	switch( msg.type ) {			
		case 'notify':
			switch( msg.command ) {
				case 'sip':
					if( msg.data.message.request_uri ) {
						/* incoming sip request */
						var req = new Request( this, msg.data.transactionId, msg.data.dialogId, msg.data.message ) ;
						var res = new Response( this, req ) ;

						this.app( req, res ) ;				
														
					}
					else {
						/* incoming sip response */
						var transactionId = msg.data.transactionId ;
						if( transactionId in this.cbTransaction ) {
							var fn = this.cbTransaction[transactionId] ;
							if( msg.data.message.status.status >= 200 ) {
								this.removeTransactionCallback( transactionId ) ;
							}
							fn( null, msg ) ;
						}
						else {
							console.error('received response for unknown transaction id ' + transactionId) ;
						}
					}
				break ;

				case 'dialog':
					
					//Big question: should dialog events really be generated by drachtio-server, or 
					//should we be doing that?  And if us, then shouldn't it be done by middleware, 
					//rather than here?
					//well, timer events would certainly have to be issued by dractio-server

					debug('got dialog event %s for dialog %s', msg.data.message.eventName, msg.data.dialogId) ;
					//this.getDialog( msg.data.dialogId, function(err, dialog){
					//	dialog && app.emit( msg.data.message.eventName, {
					//		target: dialog 
					//		,data: msg.data.message.eventData
					//	}) ;
						//this.app._router.dispatchDialogEvent( msg.data.dialogId, msg.data.message.eventName, msg.data.message.eventData ) ;
					//}) ;

				break ;

				default:
					throw new Error('unknown notify command: ' + msg.command) ;
				break ;
			}
			break ;

		case 'request':
			throw new Error('unknown request command ' + msg.command) ;
			break ;

		case 'response':
			if( msg.rid in this.cbResponse ) {
				debug('found callback for response with rid %s', msg.rid) ;
				this.cbResponse[msg.rid]( null, msg.data ) ;
				delete this.cbResponse[msg.rid] ;

				return ;
			}

			/* check for response to route request */
			for( var verb in this.verbs ) {
				if( msg.rid === this.verbs[verb].rid ) {
					this.verbs[verb].ackowledged = true ;
					return ;
				}
			}
			throw new Error('error matching respond message with rid ' + msg.rid) ;
			break ;

		default:
			throw new Error('unknown msg type ' + msg.type) ;
			break ;
	}
}

/**
 * disconnect from drachtio-server
 * @param  {Function} [cb] - callback that is invoked when socket is closed
 */
Agent.prototype.disconnect = function( cb ) {
	debug('Agent#disconnect from %s', this.host + ':' + this.port) ;
	if( !this.socket ) throw new Error('socket is not connected') ;
	this.socket.end() ;
}

Agent.prototype.sendRequest = function( command, data, cbResponse ) {
	var rid = uuid.v1() ;
	if( 'sendSipRequest' === command && !data ) {
		debugger;
		throw new Error('Agent#sendRequest: data is required')
	}
	this.socket.sendMessage({
		type: 'request'
		,command: command
		,rid: rid
		,data: data
	}) ;
	if( cbResponse ) {
		this.cbResponse[rid] = cbResponse ;
	}
	return rid ;
}

Agent.prototype.sendNotify = function( command, data ) {
	this.socket.sendMessage({
		type: 'notify'
		,command: command
		,data: data
	}) ;
	return  ;
}

Agent.prototype.sendResponse = function( rid, data ) {
	this.socket.sendMessage({
		type: 'response'
		,rid: rid
		,data: data
	}) ;
}

Agent.prototype.route = function( verb ) {
	if( verb in this.verbs ) throw new Error('duplicate route request for ' + verb) ;
	this.verbs[verb] = {
		sent: false
	} ;
	if( 'authenticated' !== this.state ) return ;
	
	this.routeVerbs() ;
}

Agent.prototype.routeVerbs = function() {
	for( var verb in this.verbs ) {
		if( this.verbs[verb].sent ) continue ;

		this.verbs[verb].sent = true ;
		this.verbs[verb].ackowledged = false ;
		this.verbs[verb].rid = this.sendRequest('route', {
			verb: verb
		}) ;
	}
}

Agent.prototype.addTransactionCallback = function( transactionId, callback ) {
	this.cbTransaction[transactionId] = callback ;
	debug('addTransactionCallback: there are now %d transactions being tracked', _.size(this.cbTransaction) ) ;
}
Agent.prototype.removeTransactionCallback = function( transactionId ) {
	delete this.cbTransaction[transactionId]  ;
	debug('removeTransactionCallback: there are now %d transactions being tracked', _.size(this.cbTransaction) ) ;
}
