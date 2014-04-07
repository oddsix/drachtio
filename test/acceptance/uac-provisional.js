var appRemote
,assert = require('assert')
,spawn = require('child_process').spawn
,exec = require('child_process').exec
,should = require('should')
,config = require('./fixtures/config')
,appLocal
,appRemote
,siprequest ;

describe('100rel', function() {

    before(function(done){
       appRemote = require('../../examples/uas-provisional/app') ;
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

    it('must support reliable provisional responses', function(done) {
        this.timeout(3000) ;
        var i = 0 ;
        siprequest(config.request_uri, {
            headers: {
                require:'100rel'
                ,supported: '100rel'
            }
            ,body: config.sdp
        }, function( err, req, res ) {
            should.not.exist(err) ;
            res.should.have.property('statusCode',i++ === 0 ? 183 : 200 ); 
            if( res.statusCode === 183 ) {
                res.should.have.property('rseq') ;
                return ;
            }
            res.ack() ;

            res.should.have.property('body') ;
            res.headers['content-type'].should.have.property('type','application/sdp') ;
            res.headers.should.have.property('content-length') ;
            appRemote.ack(function(){
                appLocal.idle.should.be.true ;
                appRemote.idle.should.be.true ;
                done() ;            
            }) ;
        }) ;
    }) ;
}) ;
