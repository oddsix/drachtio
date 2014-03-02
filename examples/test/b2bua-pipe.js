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

    var gotResponse = false ;
//    siprequest( 'sip:msml@209.251.49.158', {
    siprequest( 'sip:208.73.45.95', {
        headers:{
            'content-type': 'application/sdp'
        }
        ,body: req.body
        ,session: req.session
    })
    .pipe( res, function(err){
        if( err ) return debug('b2bua failed with status: ', err) ;
        debug('b2bua connected successfully') ;
    }) ;
}) ;

app.on('sipdialog:create', function(e) {
    var dialog = e.target ;
    var session = e.session ;

    var isUAC = dialog.role === SipDialog.UAC  ;
    if( isUAC ) {
        debug('saving UAC dialog ') ;
        session.uacLeg = dialog ;
    }
    else {
        debug('saving UAS dialog') ;
        session.uasLeg = dialog ;
    }
    session.save() ;
})
.on('sipdialog:terminate', function(e) {
    var dialog = e.target ;
    var session = e.session ;

    debug('dialog with role %s and dialogID %s was terminated due to %s', dialog.role, dialog.dialogID, e.reason ) ;
    if( dialog.role === SipDialog.UAS ) {
        debug('sending bye to B leg') ;
        session.uacLeg.terminate() ;
    }
    else {
        debug('sending bye to A leg') ;
        session.uasLeg.terminate() ;
    }
    
}) ;
