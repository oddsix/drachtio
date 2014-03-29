var drachtio = require('../..')
,app = drachtio()
,RedisStore = require('drachtio-redis')(drachtio) 
,d = require('../fixtures/data')
,debug = require('debug')('drachtio:uas-delay-answer') ;

app.connect({
    host: '10.228.9.22'
    ,port: 8022
    ,secret: 'cymru'
}) ;

app.use( drachtio.session({store: new RedisStore({host: 'localhost'}) }) ) ;
app.use( app.router ) ;

app.invite(function(req, res) {

    req.session = {
        user: 'daveh'
        ,cdr: {
            start: new Date()
            ,end: Object.create(null)
        }
    }
    req.session.save() ;

    res.send(200, {
        body: d.dummySdp
    }) ;

    req.cancel( function( req, res ){
        debug('request was canceled')
    }) ;
}) ;

app.bye(function(req,res){
    debug('on bye, session is ', req.session) ;
}) ;




