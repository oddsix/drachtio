var drachtio = require('../..')
,app = module.exports = drachtio() 
,invite = app.siprequest
,bye = app.siprequest.bye
,config = require('../fixtures/config') 
,assert = require('assert')
,debug = require('debug')('b2bua') ;

var uacCallid, uasCallid ;

app.connect( config.connect_opts ) ;

app.invite( function(req, res) {
    uacCallid = req.get('call-id') ;
	var request = invite( config.remote_uri2, {
		body: req.body
	}) ;

    request.pipe( res, function( uacRes ){
        debug('pipe returned with final response status %d on uac call leg %s', uacRes.statusCode, uacRes.get('call-id'));
        uacCallid = uacRes.get('call-id') ;
    })
}) ;

app.bye(function(req, res){
    res.send(200) ;

    var otherCallid ;
    if( uacCallid === req.get('call-id') ) otherCallid = uasCallid ;
    else otherCallid = uacCallid ;

    console.log('b2bua sending BYE') ;
    bye({headers: {'call-id': otherCallid}}, function(err, req, res) {
        console.log('b2bua got response to BYE, emitting status event')
        //for test harness in test/acceptance/b2bua.js
        app.emit('status', {success: true}) ;        
    }) ;

 }) ;





