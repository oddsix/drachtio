var appRemote
,assert = require('assert')
,spawn = require('child_process').spawn
,exec = require('child_process').exec
,should = require('should')
,config = require('./fixtures/config')
,async = require('async')
,appLocal
,appRemote
,siprequest ;

describe('delayed sdp offer', function() {
    this.timeout(4000) ;
    before(function(done){
       appRemote = require('../../examples/uas-delayed-offer/app') ;
        appRemote.on('connect', function() {
            appLocal = require('../..')() ;
            siprequest = appLocal.uac ;

            appLocal.connect(config.connect_opts, function(err){
                done() ;
            });        
        }) ;
    }) ;
    after(function(done){
        appLocal.disconnect() ;
        appRemote.disconnect() ;
        done() ;
    }) ;

    it('must be able to provide sdp offer in ack instead of invite', function(done) {
        this.timeout(5000) ;
        var sdpOffer ;
        async.parallel([
            function local( callback ){ 
                siprequest(config.request_uri
                ,function( err, req, res ) {
                    should.not.exist(err) ;
                    res.should.have.property('statusCode',200); 
                    res.should.have.property('body') ;
                    res.should.have.property('headers') ;
                    res.headers['content-type'].should.have.property('type','application/sdp') ;
                    res.headers.should.have.property('content-length') ;

                    res.ack( {body: config.sdp} ) ;

                    setTimeout( function() {
                        siprequest.bye({headers:{'call-id': res.get('call-id')}}, function() {
                            callback() ;
                        }) ;                       
                    }, 100);
                }) ;
            }
            ,function remote( callback ) {
                appRemote.ack( function(ack){
                    sdpOffer = ack.getBody() ;
                }) ;
                appRemote.bye(function(req,res){
                    res.send(200) ;
                    should.exist(sdpOffer);
                    callback();
                }) ;
            }
            ]
            ,function() {
                appLocal.idle.should.be.true ;
                appRemote.idle.should.be.true ;
                done() ;   
            }
        );
    }) ;
}) ;
