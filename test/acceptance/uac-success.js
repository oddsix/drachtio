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

describe('uac successful dialog establishment', function() {
    this.timeout(4000) ;
    before(function(done){
       appRemote = require('../../examples/uas-success/app') ;
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

    it('must be able to establish a SIP dialog', function(done) {
        this.timeout(5000) ;
        async.parallel([
            function local( callback ){ 
                siprequest(config.request_uri, {
                    body: config.sdp
                }, function( err, req, res ) {
                    res.ack() ;

                    should.not.exist(err) ;
                    res.should.have.property('statusCode',200); 
                    res.should.have.property('body') ;
                    res.headers['content-type'].should.have.property('type','application/sdp') ;
                    res.headers.should.have.property('content-length') ;

                    setTimeout( function() {
                        siprequest.bye({headers:{'call-id': res.get('call-id')}}, function() {
                            callback() ;
                        }) ;                       
                    }, 500);
                }) ;
            }
            ,function remote( callback ) {
                appRemote.bye(function(req,res){
                    res.send(200) ;
                    callback();
                }) ;
            }
            ]
            ,function() {
                appLocal.idle.should.be.true ;
                appRemote.idle.should.be.true ;
                done() ;   
            }
         ) ;
    }) ;
}) ;
