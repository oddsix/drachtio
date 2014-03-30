var Route = require('./route')
  , _ = require('underscore') 
  , debug = require('debug')('drachtio:router') ;

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

  /* map of UAC transaction ids to callbacks for responses to that transaction request */
  this.mapUacTransaction= {} ;

  /* map of UAS invite transaction ids to route for handling requests within that invite transaction (e.g., cancel, prack, update) */
  this.mapUasTransaction = {} ;

  this.middleware = function router(err, req, res, next){
    self._dispatch(err, req, res, next);
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

Router.prototype._dispatch = function(err, req, res, next){
  var self = this;

  debug('dispatching %s', req.method );
  var method = req.method.toLowerCase() ;

  // route dispatch
  (function pass(i, err){
    var route, i;

    // match next route
    function nextRoute(err) {
      pass(req._route_index + 1, err);
    }

    // match route
    if( req.dialog && method === 'ack' && !req.dialog.times.connect_time && req.dialog.ackCallbacks ) {
      /* ACK to a new UAS INVITE, invoke middleware in Res.send( 200, ... ) */
      //TODO: shouldn't I actually be emitting dialog:create instead??  BTW, ackCallbacks will not be rehydrated anyways
      req.route = route = {method: 'dialog-ack-construction', callbacks: dialog.ackCallbacks };
      debug('found dialog-level route for ACK that completes dialog constructions') ; 
      res = dialog ;  //special case for ACK callback; fn( req, ack) instead of fn(req, res)    
    }
    else if( req.transactionId && req.transactionId in self.mapUacTransaction ) {
      /* response for a UAC transaction (i.e. we sent the request, now getting the response), invoke middleware in uac( ) */
      debug('matched a response message based on transaction id: %s', req.transactionId) ;
      req.route = route = self.mapUacTransaction[req.transactionId];
      if( res.statusCode >= 200 ) {
        delete self.mapUacTransaction[req.transactionId] ;
        debug('delivered final response to transaction %s, deleting it from map, size is now %d', req.transactionId, _.size( self.mapUacTransaction)) ;
      }
    }
    else if( -1 != ['cancel','prack','update'].indexOf(method) && req.transactionId in self.mapUasTransaction && method in self.mapUasTransaction[req.transactionId] ) {
      /* route for a UAS INVITE that has received a request within the invite transaction */
      var obj = self.mapUasTransaction[req.transactionId] ;
      req.route = route = obj[method] ;
      //if( 'prack' === method ) res = dialog ;
      //delete obj[method] ;  delete when INVITE transaction concludes
      debug('found request-level route for %s', method) ;
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
 
    var numCallbacks = route.callbacks.length ;

    debug('matched %s with %d callbacks', route.method, numCallbacks);

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
          if (fn.length < 4) fn(req, res, callbacks);

          //special case: final callback is not an error handler, should get called in both error and non-error case
          else if( fn === route.callbacks[numCallbacks-1] ) fn( null, req, res, callbacks) ;

          //otherwise, middleware that takes an error will only be called when there is an error
          callbacks();
        } else {
          nextRoute(err);
        }
      } catch (err) {
        callbacks(err);
      }
    }
  })(0, err);
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

Router.prototype.routeTransaction = function( transactionId, callbacks ){
  var callbacks = _.flatten([].slice.call(arguments, 1));
  var route = new Route( transactionId, callbacks) ;
  this.mapUacTransaction[transactionId] = route ;
  //TODO: should I make the first callback into an arity of 4, so it can have err
  debug('defined route for responses to transactionId %s', transactionId);

  return this;
};

Router.prototype.routeRequestWithinInviteTransaction = function( req, method, callbacks ) {
  /* 'this' in the cancel middleware will the Request */
 var callbacks = _.map( _.flatten([].slice.call(arguments, 2)), function( fn ) { return _.bind( fn, req ) ;}) ;;
  var route = new Route( req.transactionId, callbacks) ;
  this.mapUasTransaction[req.transactionId] = this.mapUasTransaction[req.transactionId] || {} ;
  this.mapUasTransaction[req.transactionId][method] = route ;
  debug('defined route for %s of incoming INVITE with transactionId %s', method, req.transactionId);  
}
