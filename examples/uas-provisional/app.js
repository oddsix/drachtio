var drachtio = require('../..')
,config = require('../fixtures/config') ;

var app = module.exports = drachtio() ;

app.connect( config.connect_opts ) ;

app.invite(function(req, res) {
	res.send( 183,{
		headers: {
			require: '100rel'
			,supported: '100rel'
		}
		,body: config.sdp
	}) ;

	req.prack( function(prack) {
		res.send( 200, {body: config.sdp,headers:{'subject': 'help!'}} ) ;
	}) ;
}) ;

app.ack(function(){
	app.disconnect() ;
})
