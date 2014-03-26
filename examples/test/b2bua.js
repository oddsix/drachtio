var drachtio = require('../..')
,app = drachtio()
,siprequest = app.uac
,RedisStore = require('drachtio-redis')(drachtio) 
,d = require('../fixtures/data')
,SipDialog = drachtio.SipDialog 
,debug = require('debug')('drachtio:b2bua') ;

app.connect({
    host: 'localhost'
    ,port: 8022
    ,secret: 'cymru'
}) ;

app.use( drachtio.session({store: new RedisStore({host: 'localhost', prefix:''})})) ;
app.use( drachtio.dialog() ) ;
app.use( app.router ) ;

app.invite(function(req, res) {

    siprequest( 'sip:msml@209.251.49.158', {
        message: {
            headers:{
                'content-type': 'application/sdp'
                ,from: '1234'
                ,'p-asserted-identity': 'sip:1234@localhost'
            }
            ,body: req.body            
        }
        ,session: req.session
    }, function( err, invite, uacRes ) {
        if( err ) throw( err ) ;

        if( uacRes.statusCode >= 200 ) uacRes.ack() ;

        var headers = {} ;
        if( uacRes.statusCode === 200 ) headers['content-type'] = uacRes.get('content-type').type ;
        
        res.send( uacRes.statusCode, {
            headers: headers
            ,body: uacRes.body
        }) ;
    }) ;
}) ;

app.on('sipdialog:create', function(e) {
    var dialog = e.target ;
    e.session[ (dialog.role === SipDialog.UAC ? 'uacLeg' : 'uasLeg')] = dialog ;
 })
.on('sipdialog:terminate', function(e) {
    e.session.uacLeg && e.session.uacLeg.terminate() ;
    e.session.uasLeg && e.session.uasLeg.terminate() ;
}) ;
