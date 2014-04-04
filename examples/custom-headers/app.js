var drachtio = require('../..')
,config = require('../fixtures/config') ;

var app = module.exports = drachtio() ;

app.connect( config.connect_opts ) ;

app.options(function(req, res) {
	res.send( 200,{
		headers: {
			'X-custom': 'drachtio rocks!'
		}
	}) ;
}) ;
app.message(function(req, res) {
	res.send( 200,{
		headers: {
			'subject': 'pure awesomeness'
		}
	}) ;
}) ;
