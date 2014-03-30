var app = require('..')()
,siprequest = app.uac
,config = require('./test-config')
,debug = require('debug')('drachtio:example-options-ping') ;

app.connect( config ) ;

app.once('connect', function() {
	siprequest.options('sip:1234@209.251.49.140', function( err, req, res ) {
		if( err ) {
			console.error( err ) ;
		}
		else {
		    debug('status is ', res.statusCode ) ;
		}
	    app.disconnect() ;
	}) ;
}) ;



