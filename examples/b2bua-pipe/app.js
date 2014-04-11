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

    debugger ;
    request.pipe( res, function( ack ){
        debug('pipe returned with args, ', arguments);
    })
}) ;

app.bye(function(req, res){
    res.send(200) ;

    var otherCallid ;
    if( uacCallid === req.get('call-id') ) otherCallid = uasCallid ;
    else otherCallid = uacCallid ;

    bye({headers: {'call-id': otherCallid}}, function(err, req, res){
        //for test harness in test/acceptance/b2bua.js
        app.emit('status', {success: true}) ;        
    }) ;

 }) ;





