/**
 * Initialization middleware, exposing the
 * request and response to eachother, as well
 * as setting up to receive a later cancel request.
 *
 * @param {Function} app
 * @return {Function}
 * @api private
 */

var cancelableTransactions = {} ;

exports.init = function(app){
 
    return function drachtioInit(req, res, next){
        req.app = res.app = app;

        req.res = res;
        res.req = req;
        req.next = next;

        req.__proto__ = app.request;
        res.__proto__ = app.response;

        // mark INVITE requests as canceled when we receive a CANCEL for that call-id
         if( req.isNewInvite() && 'network' === req.source ) {
            cancelableTransactions[req.transactionId] = req ;

            /* proxy res.send to remove cancel state when sending final response */
            var send = res.send.bind( res) ;
            res.send = function( code, status, opts ) {
                if( code >= 200 ) {
                  delete cancelableTransactions[req.transactionId] ;
                  res.send = send ;
                }
                send( code, status, opts ) ;
            }
        }
        else if( req.method === 'CANCEL' && req.transactionId in cancelableTransactions ) {
            var invite = cancelableTransactions[req.transactionId] ;
            invite.canceled = true ;
            delete cancelableTransactions[req.transactionId] ;
        }

        next();
    }
};
