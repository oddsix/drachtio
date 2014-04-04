var drachtio = require('../..')
,app = drachtio()
,siprequest = app.uac
,RedisStore = require('drachtio-redis')() 
,session = require('drachtio-session')
,argv = require('minimist')(process.argv.slice(2))
,debug = require('debug')('drachtio:b2bua') ;

if( !argv.host ) return usage() ;

app.connect({
    host: argv.host
    ,port: argv.port || 8022
    ,secret: argv.secret || 'cymru'
}) ;

var sessionStore = new RedisStore({host: 'localhost'}) ;
app.use(session({store: sessionStore})) ;

app.invite(function(req, res) {

    req.session.uasCallId = req.get('call-id') ;

    siprequest( 'sip:msml@209.251.49.158', {
        headers:{
            from: '1234'
            ,'p-asserted-identity': 'sip:1234@localhost'
        }
        ,body: req.body            
        ,session: req.session
    }, function( err, uacReq, uacRes ) {
        if( err ) throw( err ) ;

        if( uacRes.statusCode >= 200 ) {
            uacRes.ack() ;
            req.session.uacCallId = uacReq.get('call-id') ;
            uacReq.session.myCallId = uacReq.get('call-id') ;
            debug('uac session is: ', uacReq.session) ;
         }
        res.send( uacRes.statusCode, {
            body: uacRes.body
        }) ;
    }) ;
}) ;
app.ack( function( req, res ) {
    debug('received ACK, dialogId: %s', req.dialogId) ;
}) ;
app.bye( function( req, res) {
    res.send(200) ;
    debug('got bye session is ', req.session) ;
    if( req.get('call-id') === req.session.uasCallId ) {
        debug('caller hung up') ;
        siprequest.bye({
            headers:{
                'call-id': req.session.uacCallId
            }
        }) ;
    }
    else {
       debug('called party hung up') ;
        siprequest.bye({
            headers:{
                'call-id': req.session.uasCallId
            }
        }) ;        
    }
}) ;

function usage() {
    console.log('usage: node ' + process.argv[1] + ' --host {dractio-server-host}') ;
}