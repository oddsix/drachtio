var Request = require('./request') 
_ = require('underscore'),
debug = require('debug')('drachtio:uac') ;

	
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

function uac (request_uri, options, callbacks) {

	options.method = options.method || 'INVITE' ;
	options.agent = uac.agent ;
	options.callbacks = callbacks ;
	var r = new Request(options) ;
	return r;
}

module.exports = uac ;

uac.Request = Request ;

uac.initParams = initParams

uac.invite = uac ;


uac.register = function (request_uri, options, callbacks) {
  var params = initParams(request_uri, options, callbacks) ;
  params.options.method = 'REGISTER' ;
  return uac(params.request_uri || null, params.options, params.callbacks) ;
}
uac.info = function (request_uri, options, callbacks) {
  var params = initParams(request_uri, options, callbacks) ;
  params.options.method = 'INFO' ;
  return uac(params.request_uri || null, params.options, params.callbacks) ;
}
uac.subscribe = function (request_uri, options, callbacks) {
  var params = initParams(request_uri, options, callbacks) ;
  params.options.method = 'SUBSCRIBE' ;
  return uac(params.request_uri || null, params.options, params.callbacks) ;
}
uac.notify = function (request_uri, options, callbacks) {
  var params = initParams(request_uri, options, callbacks) ;
  params.options.method = 'NOTIFY' ;
  return uac(params.request_uri || null, params.options, params.callbacks) ;
}
uac.options = function (request_uri, options, callbacks) {
  var params = initParams(request_uri, options, callbacks) ;
  params.options.method = 'OPTIONS' ;
  return uac(params.request_uri || null, params.options, params.callbacks) ;
}
uac.bye = function (request_uri, options, callbacks) {
  var params = initParams(request_uri, options, callbacks) ;
  params.options.method = 'BYE' ;
  return uac(params.request_uri || null, params.options, params.callbacks) ;
}
