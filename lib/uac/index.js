var Request = require('./request') 
,methods = require('../sip/methods')
,_ = require('underscore')
,debug = require('debug')('drachtio:uac') ;

	
// organize params for invite, register, etc
function initParams(request_uri, options, callbacks) {
	
	if (typeof request_uri === 'undefined' && !options.dialogId) throw new Error('undefined is not a valid request_uri or options object.') ;

	var cbArray = _.filter( _.flatten( Array.prototype.slice.call( arguments, 0) ), function( arg ) { return typeof arg === 'function'; } ) ;

	// uac( request_uri, options, callback, ..)
	if (options && typeof options === 'object') {
		options.request_uri = request_uri ;
	} 
	// uac( request_uri, callback, ..)
	else if (typeof request_uri === 'string') {
		options = {request_uri:request_uri } ;
	}
	// uac( option, callback, ..) 
	else {
		options = request_uri ;
		request_uri = options.request_uri; 
	}

	return { request_uri: request_uri, options: options, callbacks: cbArray } ;
}

function makeRequest (agent, request_uri, options, callbacks) {
	options.agent = agent ;
	options.method = options.method || 'INVITE' ;
	options.callbacks = callbacks ;
	var r = new Request(options) ;
	return r;
}

module.exports = uac ;

// default to INVITE
function uac(app, request_uri, options, callbacks) {
  var params = initParams(request_uri, options, callbacks) ;
  params.options.method = 'INVITE' ;
  return makeRequest(app.agent, params.request_uri || null, params.options, params.callbacks) ;
}

// explicit methods
methods.forEach(function(method){
	uac[method] = function (app, request_uri, options, callbacks) {
	  var params = initParams(request_uri, options, callbacks) ;
	  params.options.method = method.toUpperCase() ;
	  debug('sending %s', method)
	  return makeRequest(app.agent, params.request_uri || null, params.options, params.callbacks) ;
	}
}) ;