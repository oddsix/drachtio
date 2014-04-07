var drachtio = require('../..')
,config = require('../fixtures/config') ;

var app = module.exports = drachtio() ;

app.connect( config.connect_opts ) ;

app.invite(function(req, res) {
	res.send( 200,{
		body: config.sdp
	}) ;
}) ;
