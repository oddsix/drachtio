var drachtio = require('../..')
,app = drachtio()
,d = require('../fixtures/data')
,RedisStore = require('drachtio-redis')()
,session = require('drachtio-session')
,debug = require('debug')('drachtio:uas-delay-answer') ;

app.connect({
    host: '10.228.9.22'
    ,port: 8022
    ,secret: 'cymru'
}) ;

app.use( session({store: new RedisStore({host: 'localhost'}) }) ) ;

app.invite(function(req, res) {

    req.session.start_time = new Date() ;

    setTimeout(function() {
        res.send(2000, {
            body: d.dummySdp
        }) ;        
    }, 5000) ;

    req.cancel( function( req, res ){
        debug('request was canceled') ;
        res.send(200) ;
    }) ;
}) ;

app.bye(function(req,res){
    res.send(200) ;
    var now = new Date() ;
    debug('caller hung up after %d seconds', Math.round((now-req.session.start_time)/1000)) ;
}) ;




