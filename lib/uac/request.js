var dispatchRequest = require('../utils/dispatch-request') 
,merge = require('utils-merge')
,debug = require('debug')('drachtio:uac:request') ;

module.exports = exports = Request ;

function Request( options ) {
	if( !(this instanceof Request) ) return new Request(options) ;

	this.dispatchRequest = dispatchRequest ;

	var reserved = Object.keys(Request.prototype) ;
	for (var i in options) {
		if (reserved.indexOf(i) === -1) {
			this[i] = options[i];
		} 
		else {
			if (typeof options[i] === 'function') {
				delete options[i] ;
			}
		}
	}
	delete options['agent'] ;
	delete options['callbacks'] ;

	this.init(options) ;
}

Request.prototype.init = function (options) {

	var self = this 
	,app = this.agent.app ;

	options = options || {} ;
	options.headers = options.headers || {} ;

	// valid requests:
	// - a request within a dialog, specified by dialog id
	// - a cancel of an outgoing transaction
	// - a request outside a dialog, sent to a specified request uri
	// - a request within a dialog, specified by sip call-id
	if( this.dialogId || (this.transactionId && this.method === 'CANCEL') || this.request_uri || 'call-id' in options.headers ) {
		this.headers = this.headers || {} ;

		if (this.body && Buffer.isBuffer(this.body)) this.body = this.body.toString('utf8') ;

		merge( options.headers, this.headers );
		if( this.body ) options.body = this.body ;
		
		this.send( options, [ this.processResponses.bind( this ) ] ) ;
	}
	else {
		var e =  new Error('options.request_uri is a required argument') ;
		console.error(e.stack) ;
		throw e ;
	}
} 

Request.prototype.cancel = function() {

	debug('canceling uac request, if not answered yet, the transactionId is %s', this.transactionId) ;

	if( this.transactionId ) {
		var options = {
			method: 'CANCEL'
			,transactionId: this.transactionId
		}
		this.send( options, [] ) ; //no callbacks for this one
	}

	return  ;
}

Request.prototype.processResponses = function( err, req, res, next ) {
	if( this.callbacks && this.callbacks.length > 0 ) this.callbacks[0]( err, req, res, next ) ;
	else debug('Request#processResponses: discarding response as there is no handler') ;

}
Request.prototype.pipe = function( res, opts, cb ) {
	var Response = require('../response') ;
	if( !(res instanceof Response) ) throw new Error('Request#pipe: must supply res as first argument') ;
	
	if( typeof opts === 'function') {
		cb = opts ;
	}
	
	function callback( err, invite, uacRes ) {
      if( err ) throw( err ) ;
      	if( uacRes.statusCode >= 200 ) uacRes.ack( cb ) ;

        var headers = {} ;
        if( uacRes.statusCode === 200 ) headers['content-type'] = uacRes.get('content-type').type ;
        res.send( uacRes.statusCode, {
            headers: headers
            ,body: uacRes.body
        }) ;
 	}

 	/* replace callback with ours above -- there shouldn't be any existing callbacks when .pipe is called */
 	this.callbacks = [callback] ;
}

Request.prototype.send = function(options, callbacks) {
	this.dispatchRequest( this.agent, this, options, callbacks) ;
}