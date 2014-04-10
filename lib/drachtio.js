/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter
  , proto = require('./proto')
  , merge = require('utils-merge')
  , debug = require('debug')('drachtio:drachtio') ;


/**
 * Expose 'createAgent'
 *
 */
exports = module.exports = createAgent;

exports.version = '0.0.1';
exports.Request = require('./uac/request') ;


function createAgent() {
  /* we may be called as either app( err, req, res ) or app( req, res ) */
  function app(err, req, res) { 2 == arguments.length ? app.handle(null, err, req): app.handle( err, req, res ); }
  merge(app, proto);
  merge(app, EventEmitter.prototype);
  app.route = '/';
  app.stack = [];

  for (var i = 0; i < arguments.length; ++i) {
    app.use(arguments[i]);
  }
  app.init();

  // expose for drachtio-session or others to monkey patch
  app.Response = require('./response') ;
  app.Request = require('./request') ;
  app.SipRequest = require('./uac/request') ;

  return app;
};
