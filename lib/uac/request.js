var dispatchRequest = require('../utils/dispatch-request') 
,debug = require('debug')('drachtio:uac:request') ;

module.exports = exports = Request ;

function Request( options ) {

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

	if( this.dialogId || (this.transactionId && this.method === 'CANCEL') || this.request_uri ) {
		this.headers = this.headers || {} ;

		if (this.body && Buffer.isBuffer(this.body)) this.body = this.body.toString('utf8') ;

		if( this.headers ) _.extend( options.headers, this.headers );
		if( this.body ) options.body = this.body ;
		
		/**
		 * we may have no callbacks if the caller is going to pipe the output to a Response object, 
		 * in which case let the pipe method do the sending
		 */
		if( this.callbacks.length > 0 ) this.dispatchRequest( this.agent, this, options, this.callbacks ) ;
		else this.options = options ;

	}
	else {
		throw new Error('options.request_uri is a required argument') ;
	}
} 

Request.prototype.cancelRequest = function() {

	debug('canceling uac request, if not answered yet, the transactionId is %s', this.transactionId) ;

	if( this.transactionId ) {
		var options = {
			method: 'CANCEL'
			,transactionId: this.transactionId
		}
		this.dispatchRequest( this.agent, this, options, [] ) ; //no callbacks for this one
	}

	return  ;
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

	var options = this.options ;
	delete this[options] ;
	this.dispatchRequest( this.agent, this, options, [ callback ] ) ;
}