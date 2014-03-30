var util = require('util')
,SipMessage = require('./sip/sipmessage')
, merge = require('utils-merge')
,helpers = require('./utils/callback-helpers')
,debug = require('debug')('drachtio:response');

module.exports = Response ;

function Response(agent, req){
	this.agent = agent ;
	this.headersSent = false ;

	if( req.type === 'request') {
		SipMessage.call(this, {}); 
		this.req = req ;
		this.source = 'application' ;
	}
	else {
		SipMessage.call(this, req); 
		this.source = 'network' ;
	}
}

util.inherits(Response, SipMessage);

Response.prototype.setHeader = function( header, value ) {
	this.headers[header] = value ;
	return this; 
}
/**
 * Send a response.
 *
 * Examples:
 *
 *		res.send(486)
 * 		res.send( 486, 'Busy Here Right Now')
 *		res.send(500, {
 *			headers: {
 *				'Error-Info': 'Database down'
 *			}
 * 		})
 *     res.send(200, {
 *			body: {}
 * 			,headers: {}
 *		});
 *
 * @param code
 * @param status
 * @param opts: headers and body
 * @return undefined
 * @api public
 */


Response.prototype.send = function( code, status, opts ) {
	var self = this ;
	if( this.source === 'network' ) throw new Error('cannot call send on a response that we have received') ;
	if( typeof code !== 'number' && 0 == this.statusCode ) throw new Error('must supply response code as first parameter to Response.send') ;

	if( !this.req.active ) {
		debug('res.send returning without sending since request has been cancelled');
		return ;
	}

	if( this.req.method === 'CANCEL') {
		debug('sending response to incoming CANCELs is unnecessary, discarding..') ;//TODO: what about callbacks that might have been provided?
		return ;
	}

	opts = opts || {} ;

	if( 'object' == typeof status ) {
		opts = status ;
		status = undefined;
	}
	if( 'function' == typeof opts ) {
		opts = {} ;
	}

	// add any supplied headers to this outgoing message, but not to any future response 
	opts.headers = merge( opts.headers || {}, this.headers) ;

	/* move body into headers as a pseudo-header named 'payload' because drachtio/sofia wants it there */
	this.body = opts.body || this.body ;
	if( this.body ) {
		var body = Buffer.isBuffer(this.body)  ? this.body.toString('utf-8') : this.body ;
		opts.headers.payload = body ;
		delete opts['body'] ;
	}

	/* send request to drachtio to format and send the response */
	merge( opts, {
		transactionId: this.req.transactionId
		,code: code || this.statusCode
		,status: status
	}) ;
	this.agent.sendNotify( 'respondToSipRequest', opts ) ;
	if( code >= 200 ) {
		this.headersSent = true ;
	}
}

Response.prototype.ack = function( opts, callback ) {
	var self = this ;
	if( this.source !== 'network' || this.statusCode < 200 || this.get('cseq').method !== 'INVITE' ) {
		throw new Error('Response.ack only valid for final responses to new INVITEs') ;
	}

	if( typeof opts === 'function') {
		callback = opts ;
		opts = undefined ;
	}

	//TODO: actually send an ack request
}


