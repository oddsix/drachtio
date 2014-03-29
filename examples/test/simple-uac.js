var app = require('../..')()
,config = require('./fixtures/test-config')
,dummySdp = require('./fixtures/data').dummySdp
,debug = require('debug') ;

app.connect( config ) ;

app.once('connect', function() {
    app.uac.invite('sip:1234@127.0.0.1:41442', {
        message: {
            body: dummySdp
        }
    }, function( err, req, res ) {
        if( err ) {
            console.error( err ) ;
        }
        else {
            debug('status is ', res.statusCode ) ;
        }
    }) ;
}) ;



