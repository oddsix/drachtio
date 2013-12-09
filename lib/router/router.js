/**
 * Module dependencies.
 */

var Route = require('./route')
  , utils = require('../utils')
  , debug = require('debug')('drachtio:router')
  , _ = require('underscore') ;

/**
 * Expose `Router` constructor.
 */

exports = module.exports = Router;

/**
 * Initialize a new `Router` with the given `options`.
 * 
 * @param {Object} options
 * @api private
 */

function Router(options) {
  var self = this;

  /* map of methods to app-level routes */
  this.mapMethod = {};

  /* map of dialog ids to dialogs */
  this.mapDialog = {} ;

  /* map of UAC transaction ids to callbacks for responses to that transaction request */
  this.mapUacTransaction= {} ;

  /* map of UAS transaction ids to route for handling cancels */
  this.mapUasTransaction = {} ;

  this.middleware = function router(req, res, next){
    self._dispatch(req, res, next);
  };
}

/**
 * Route dispatcher aka the route "middleware".
 *
 * @param {IncomingMessage} req
 * @param {ServerResponse} res
 * @param {Function} next
 * @api private
 */

Router.prototype._dispatch = function(req, res, next){
  var self = this;

  debug('dispatching %s', req.method );
  var method = req.method.toLowerCase() ;

  /* check to see if this is a response or request within an existing dialog; if so emit corresponding event */
  var dialog = this.matchDialogRequest( req ) ;
  if( dialog ) {
    switch( method ) {
      case 'ack':
      break ;
 //       var fn = dialog.callback ;
        /* not sure what 'this' should be, but don't think we want it to be the dialog */
   //     delete dialog['callback'] ;
     //   fn.apply( dialog, [null, req.msg, dialog] ) ;
      break ;

      case 'bye':
        //dialog.emit('terminated', 'normal far end release') ;
        dialog.terminated = true ;
        delete this.mapDialog[req.dialogId] ;
        debug('after BYE number of active dialogs is %d', _.size(this.mapDialog)) ;
      break ;

      default:
        break ;
    }
  }

  // route dispatch
  (function pass(i, err){
    var route, i;

    // match next route
    function nextRoute(err) {
      pass(req._route_index + 1, err);
    }

    // match route
    if( dialog && method === 'ack' && !dialog.times.connect_time && dialog.ackCallbacks ) {
      /* ACK to a new UAS INVITE, invoke middleware in Res.send( 200, ... ) */
      req.route = route = {method: 'dialog-ack-construction', callbacks: dialog.ackCallbacks };
      debug('found dialog-level route for ACK that completes dialog constructions') ; 
      res = dialog ;  //special case for ACK callback; fn( reg, ack) instead of fn(req, res)    
    }
    else if( dialog && method in dialog.mapRoutes ) {
      /* request inside a dialog; invoke middleware for dialog-level route */
      req.route = route = {method: 'dialog-' + method, callbacks: dialog.mapRoutes[method] };
      debug('found dialog-level route for %s', method) ;
    }
    else if( req.transactionId && req.transactionId in self.mapUacTransaction ) {
      /* response for a UAC transaction (i.e. we sent the request, now getting the response), invoke middleware in uac( ) */
      debug('matched a response message based on transaction id: %s', req.transactionId) ;
      req.route = route = self.mapUacTransaction[req.transactionId];
      if( res.statusCode >= 200 ) {
        debug('delivered final response to transaction %s, deleting it from map, size is now %d', req.transactionId, _.size( self.mapUacTransaction)) ;
        delete self.mapUacTransaction[req.transactionId] ;
      }
    }
    else if( method === 'cancel' && req.transactionId && req.transactionId in self.mapUasTransaction ) {
      /* route for a UAS INVITE that has been canceled, invoke the middleware supplied in req.cancel( ) */
      req.route = route = self.mapUasTransaction[req.transactionId] ;
      delete self.mapUasTransaction[req.transactionId] ;
      debug('found request-level cancel route') ;
    }
    else {
      /* app level routes */
      req.route = route = self.matchRequest(req, i);
      if( req.route ) {
        debug('matched message based on verb %s', req.method) ;
      }
    }

    // no route
    if (!route) return next(err);
 
    debug('matched %s', route.method);

    i = 0;
 
    callbacks(err);
    
    // invoke route callbacks
    function callbacks(err) {
      var fn = route.callbacks[i++];
      try {
        if ('route' == err) {
          nextRoute();
        } else if (err && fn) {
          if (fn.length < 4) return callbacks(err);
          fn(err, req, res, callbacks);
        } else if (fn) {
          if (fn.length < 4) return fn(req, res, callbacks);
          callbacks();
        } else {
          nextRoute(err);
        }
      } catch (err) {
        callbacks(err);
      }
    }
  })(0);
};

/**
 * Attempt to match a route for `req`
 * with optional starting index of `i`
 * defaulting to 0.
 *
 * @param {IncomingMessage} req
 * @param {Number} i
 * @return {Route}
 * @api private
 */

Router.prototype.matchRequest = function(req, i){
  var route;

  /* note: currently only support one per verb */
  if (0 === i ) {
    var method = req.method ;
    if( route = this.mapMethod[method] ) {
      return route[0] ; //TODO: need better support for multiple calls to app.invite() with different selectors of some kind
    }
  }
};

/**
 * Attempt to match a dialog for `req`
 *
 * @param {IncomingMessage} req
 * @return {Dialog}
 * @api private
 */

Router.prototype.matchDialogRequest = function(req){
  var dialog;

  if( req.dialogId in this.mapDialog) {
    dialog = this.mapDialog[req.dialogId] ;
    //delete this.mapDialog[req.dialogId] ;
    return dialog ;
  }
};

/**
 * Attempt to match a route for `method`
 * and `url` with optional starting
 * index of `i` defaulting to 0.
 *
 * @param {String} method
 * @param {String} url
 * @param {Number} i
 * @return {Route}
 * @api private
 */

/*
Router.prototype.match = function(method, url, i){
  var req = { method: method, url: url };
  return  this.matchRequest(req, i);
};
*/
/**
 * Route `method`, `path`, and one or more callbacks.
 *
 * @param {String} method
 * @param {String} path
 * @param {Function} callback...
 * @return {Router} for chaining
 * @api private
 */

Router.prototype.route = function(method, callbacks){
  var method = method.toUpperCase()
    , callbacks = _.flatten([].slice.call(arguments, 1));

  // create the route
  debug('defined %s', method);
  var route = new Route(method, callbacks);

  // add it
  (this.mapMethod[method] = this.mapMethod[method] || []).push(route);
  return this;
};

/**
 * Route `method`, `path`, and one or more callbacks.
 *
 * @param {String} method
 * @param {String} path
 * @param {Function} callback...
 * @return {Router} for chaining
 * @api private
 */

Router.prototype.routeDialog = function( dialog ){
  debug('defined route for dialogId %s', dialog.dialogId);
  this.mapDialog[dialog.dialogId] = dialog;
  return this;
};

Router.prototype.routeTransaction = function( transactionId, callbacks ){
  var callbacks = _.flatten([].slice.call(arguments, 1));
  var route = new Route( transactionId, callbacks) ;
  this.mapUacTransaction[transactionId] = route ;
  //TODO: should I make the first callback into an arity of 4, so it can have err
  debug('defined route for responses to transactionId %s', transactionId);

  return this;
};

Router.prototype.routeCancel = function( req, callbacks ) {
  /* 'this' in the cancel middleware will the Request */
 var callbacks = _.map( _.flatten([].slice.call(arguments, 1)), function( fn ) { return _.bind( fn, req ) ;}) ;;
  var route = new Route( req.transactionId, callbacks) ;
  this.mapUasTransaction[req.transactionId] = route ;
  debug('defined route for cancel of incoming INVITE with transactionId %s', req.transactionId);  
}