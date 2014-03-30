var drachtio = require('../..')
,app = drachtio()
,d = require('../fixtures/data')
,debug = require('debug')('drachtio:uas-delay-answer') ;

app.connect({
    host: '10.228.9.22'
    ,port: 8022
    ,secret: 'cymru'
}) ;


app.invite(function(req, res) {

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




