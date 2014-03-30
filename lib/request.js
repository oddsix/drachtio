
/**
 * Module dependencies.
 */

var util = require('util')
,SipMessage = require('./sip/sipmessage')
,EventEmitter = require('events').EventEmitter
,debug = require('debug')('drachtio');

/**
 * Expose `Route`.
*/

module.exports = Request ;

/** 
	Represents a sip request message

	@constructor
	@param {Agent} agent - the underlying drachtio agent which handles messaging the server
	@param {String} transactionId - identifies the sip transaction this request is part of
	@param {String} dialogId - optional, if present identifies the sip transaction this request is part of
	@param {Object} msg - the sip message headers and body
	@api private
*/
function Request(agent, transactionId, dialogId, msg) {
	//EventEmitter.call(this); 

	var self = this ;
	this.agent = agent ;
	this.transactionId = transactionId ;
	this.canceled = false ;

	if( typeof dialogId === 'object') {
		msg = dialogId ;
		dialogId = undefined ;
	}
	if( dialogId ) this.dialogId = dialogId ;

	/* sofia provides body in payload property */
	if( msg.payload ) {
		msg.body = msg.payload ;
		delete msg['payload'] ;
	}
	this.msg = new SipMessage( msg ) ;

	/* bring some of SipMessage into our namespace */
	['type','method','source','source_address','source_port'].forEach( function(prop) {
		self.__defineGetter__(prop, function(){
			return self.msg[prop] ;
		});
	});

	['headers','body','request_uri','status'].forEach( function(prop){
		self.__defineGetter__(prop, function(){
			return self.msg[prop] ;
		});
		self.__defineSetter__(prop, function(val){
			return self.msg[prop] = val;
		});	
	}) ;

	['get','isNewInvite'].forEach( function(method){
		self[method] = self.msg[method] ;
	}) ;

	this.__defineGetter__('active', function(){
		return !self.canceled ;
	});

	this.__defineGetter__('sessionID', function() {
		//return this.msg.get('call-id') + (this.msg.source === 'network' ? ';uas' : ';uac') ;
		return this.msg.get('call-id') ;
	}) ;
}

//util.inherits(Request, EventEmitter);

/**
 * callback that is invoked when a CANCEL is received
 */
Request.prototype.cancel = function() {
	this.agent.app._router.routeRequestWithinInviteTransaction.apply( this.agent.app._router, [this,'cancel'].concat( [].slice.call( arguments ) ) ) ;
}

/**
 * callback that is invoked when a PRACK is received
 */
Request.prototype.prack = function() {
	this.agent.app._router.routeRequestWithinInviteTransaction.apply( this.agent.app._router, [this,'prack'].concat( [].slice.call( arguments ) ) ) ;
}
