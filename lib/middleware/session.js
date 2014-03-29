
var MKSession = require('./session/multikeysession')
  , debug = require('debug')('drachtio:session')
  , MemoryStore = require('./session/memory')
  , Store = require('./session/store') 
  , SipDialog = require('../sip/sipdialog.js')
  , _ = require('underscore') ;
 
var env = process.env.NODE_ENV;

exports = module.exports = session ;

exports.Store = Store;
exports.Session = MKSession;
exports.MemoryStore = MemoryStore;

/**
 * Warning message for `MemoryStore` usage in production.
 */

var warning = 'Warning: connection.session() MemoryStore is not\n'
  + 'designed for a production environment, as it will leak\n'
  + 'memory, and will not scale past a single process.';



function session(options){
    var options = options || {}
    , store = options.store || new MemoryStore
    , resolvers = _.uniq( (options.resolvers || []).concat( Date, SipDialog) )
    , storeReady = true;

    MKSession.addResolvers( (options.resolvers || []).concat([SipDialog]) ) ;

    // notify user that this store is not
    // meant for a production environment
    if ('production' == env && store instanceof MemoryStore) {
        console.warn(warning);
    }

    function attachSession( req, mks ) {
        Object.defineProperty( req, 'mks', {value:mks}) ;
        Object.defineProperty( req, 'session', {
            get: function() {
                return this.mks.session ;
            }
            ,set: function(val) {
                this.mks.session = val ;
            }
        }) ;
    }

    // generates the new session
    store.generate = function(req){
        if( req.mks ) return  ;
        var mks = req.mks || new MKSession({store:store, prefix:''}) ;
        mks.set( req.sessionID ) ;
        attachSession( req, mks ) ;
    };

    store.on('disconnect', function(){ storeReady = false; });
    store.on('connect', function(){ storeReady = true; });

    return function session(req, res, next) {

        debug('method: %s, source: %s, has session: %s, response source: %s, response status: %s', 
            req.method, req.source, req.hasOwnProperty('session'), res.source, res.statusCode ) ;

        // self-awareness
        if (req.session) return debug('already have req.session, continuing...'), next() ;

        // Handle connection as if there is no session if
        // the store has temporarily disconnected etc
        if (!storeReady) return debug('store is disconnected'), next();

        // generate the session
        function generate() {
            store.generate(req);
        }

        // expose store
        req.sessionStore = store;
        req.resolvers = resolvers ;

        /* new INVITE */
        if( req.isNewInvite() ) {
            if( req.source === 'network' ) generate() ;
            else if( res.statusCode === 200 ) req.mks.set( req.sessionID ) ;
            req.mks.save( function(err){ next() ;}) ;
            return ;
        }

        /* BYE */
        if( req.method === 'BYE' ) {
            if( req.source === 'network') {
                var send = _.bind( res.send, res );

                res.send = function( code, status, opts ) {
                    res.send = send;
                    req.mks.del( req.sessionID, function(){
                        send(code, status, opts);
                    }) ;
                }    
            }
            else {
                req.mks.del( req.sessionID, function() { 
                    next(); 
                }) ;
                return ;
            }
        }

 
        /* load session from storage and attach to request */
        debug('fetching session for req.sessionID %s', req.sessionID);
        MKSession.loadFromStorage({store: store}, req.sessionID, function(err, mks) {
            // error handling
            if (err) {
                debug('error: ', err);
                if ('ENOENT' == err.code) {
                    generate();
                    next();
                } else {
                    next(err);
                }
            // no session
            } else if (!mks) {
                debug('no session found');
                generate();
                next();
                // populate req.session
            } else {
                debug('loaded session from storage');
                attachSession( req, mks) ;
                next();
            }
        }) ;
        return ;
    };
} ;

/**
 * Hash the given `sess` object 
 *
 * @param {Object} sess
 * @return {String}
 * @api private
 */

function hash(sess) {
  return crc16(JSON.stringify(sess, function(key, val){
    return val;
  }));
}
