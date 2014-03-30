var util = require('util')
,debug = require('debug')('drachtio:SipMessage')
,sip = require('./sip') ;

exports = module.exports = SipMessage ;

function SipMessage(opts) {

	var self = this ;

	this.headers = opts.headers || {} ;
	this.request_uri = opts.request_uri  ;
	this.status = opts.status ;
	this.body = opts.body ;
  this.source = opts.source ;

  this.source_address = opts.source_address ;
  this.source_port = opts.source_port ;
  this.time = opts.time ;

	this.__defineGetter__('type', function(){
	    if( self.request_uri ) return 'request' ;
	    else if( self.status ) return 'response' ;
      else return 'undefined' ;
	});

  this.__defineGetter__('method', function(){
    if( self.request_uri ) return self.request_uri.method ;
  });
  this.__defineGetter__('statusCode', function(){
    if( self.status ) return self.status.status ;
  });
  this.__defineSetter__('statusCode', function( val ){
    if( self.status ) return self.status.status = val ;
  });
  this.__defineGetter__('canFormDialog', function() {
    return ('INVITE' === this.request_uri.method || 'SUBSCRIBE' === this.request_uri) && !this.get('to').tag ;
  }) ;
}

/* 
	get and set headers
*/
SipMessage.prototype.set = function( hdr, value ) {
	var hdrs = {} ;
	if( typeof hdr === 'string') {
		hdrs[hdr] = value ;
	}
	else {
		_.extend( hdrs, hdr ) ;
	}
	_.each( hdrs, function( value, key, list ) {
		this.headers[key.toLowerCase()] = value ;
	}, this) ;
	return this ;
}

SipMessage.prototype.get = function( hdr ) {
	return this.headers[hdr.toLowerCase()] ;
}

/* 
	get and set body
*/
SipMessage.prototype.setBody = function( value ) {
	this.body = value ;
	return this ;
}

SipMessage.prototype.getBody = function( hdr ) {
	return this.body;
}

/* set status */
SipMessage.prototype.status = function( code ) {
	this.status.code = code ;
	return this ;
}

SipMessage.prototype.isNewInvite = function() {
  return 'INVITE' === this.request_uri.method && !this.get('to').tag ;
}


SipMessage.headers =  [ 'Accept',
  'Accept-Contact',
  'Accept-Encoding',
  'Accept-Langugae',
  'Alert-Info',
  'Allow',
  'Allow-Events',
  'Authentication-Info',
  'Authorization',
  'CSeq',
  'Call-ID',
  'Call-Info',
  'Contact',
  'Content-Disposition',
  'Content-Encoding',
  'Content-Length',
  'Content-Length',
  'Content-Type',
  'Date',
  'ETag',
  'Error',
  'Error-Info',
  'Event',
  'Expires',
  'From',
  'If-Match',
  'In-Reply-To',
  'Max-Forwards',
  'Mime-Version',
  'Min-Expires',
  'Min-SE',
  'Organization',
  'P-Asserted-Identity',
  'P-Preferred-Identity',
  'Path',
  'Priority',
  'Privacy',
  'Proxy-Authenticate',
  'Proxy-Authentication-Info',
  'Proxy-Authorization',
  'Proxy-Require',
  'RAck',
  'RSeq',
  'Reason',
  'Record-Route',
  'Refer-Sub',
  'Referred-By',
  'Referred-To',
  'Reject-Contact',
  'Remote-Party-ID',
  'Replaces',
  'Reply-To',
  'Require',
  'Retry-After',
  'Route',
  'Security-Client',
  'Security-Server',
  'Security-Verify',
  'Server',
  'Service-Route',
  'Session-Expires',
  'Subject',
  'Subscription-State',
  'Supported',
  'Timestamp',
  'To',
  'Unsupported',
  'User-Agent',
  'Via',
  'WWW-Authenticate',
  'Warning' ] ; 

/* create a convenience method for setting each header */
SipMessage.headers.forEach(function(hdr){
	var canonicalName = hdr.toLowerCase().replace(/-/g, '_') ;
	SipMessage.prototype[canonicalName] = function(val){
		this.headers[canonicalName] = val ;
		return this;
	};
});


