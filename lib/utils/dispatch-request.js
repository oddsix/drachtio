/**
 * Module dependencies.
 */

var helpers = require('./callback-helpers')
debug = require('debug')('drachtio:request-dispatcher') ;


/*
This function 
*/
/**
 * Expose 'dispatchRequest', which sends a sip request out the network (through drachtio) 
 * and sets it up so responses will gert funnelled up through middleware chain, ending by invoking the provided callbacks
 * @param  {[type]} agent     [description]
 * @param  {[type]} uac       [description]
 * @param  {[type]} opts      [description]
 * @param  {[type]} callbacks [description]
 * @return {[type]}           [description]
 */
exports = module.exports = function dispatchRequest( agent, uac, opts, callbacks ) {
	var app = agent.app ;

	callbacks = callbacks || [] ;

	/* have to do it this way to avoid circular dependency - Response depends on SipDialog, which depends on us */
	var Request = require('../request') ;
	var Response = require('../response') ;

	process.nextTick( function() {
		agent.sendRequest( 'sendSipRequest', opts, function(err, msg){
			
			if( err ) {
				console.error('got error trying to send a sip request: ' + err) ;
				throw err ;
				//need to pass this error up the stack 
			}

			if( msg.transactionId || !msg.success ) {


				/* if we have an error, we are going to call the final response callback, skipping any intermediate middleware */

				if( !err && !msg.success ) err = msg.reason ;
				
				if( err ) {
					if( 0 == callbacks.length ) {
						console.log('request rejected: ' + err);
						return ;
					}
					var fn = callbacks.pop() ;
					return fn( err, null, null );
				}

				/* if the final callback arity is 3 then wrap it so it becomes (err, req, res, next) - this is needed for router.js to dispatch to it */
				if( callbacks.length > 0 ) {
					helpers.wrapFinalCallbackForRouter( callbacks ) ;

					/* install our response callbacks in the app Router */
					app.routeTransaction( msg.transactionId, callbacks) ;
				}
				var req = new Request( agent, msg.transactionId, msg.message ) ;
				req.dialogId = msg.dialogId ;

				if( !err && req.isNewInvite() ) {

					/* will enable the uac to cancel the transaction later, if desired */
					uac.transactionId = msg.transactionId ;
				}

				!err && agent.addTransactionCallback( msg.transactionId, function( err, msg ) {

					var res =  new Response( agent, msg.data.message );

					/* hack - sofia doesn't give us the via on the request for some reason, so copy it over from response just so its there */
					req.headers['via'] = res.headers['via'] ;

					/* now invoke the middleware on the response */
					app( req, res ) ;
				}) ;
			}
			else if( !msg.success ) {
				debug('got failure response: ', msg) ;
				//TODO: need to funnel this error up the middleware chain somehow
			}
		}) ;
	}) ;
}