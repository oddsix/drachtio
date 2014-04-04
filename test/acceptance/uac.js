var appRemote
,assert = require('assert')
,spawn = require('child_process').spawn
,exec = require('child_process').exec
,should = require('should')
,config = require('./fixtures/config')
,appLocal
,appRemote
,siprequest ;

describe('uac connects ok', function() {

    before(function(done){
       appRemote = require('../../examples/uac/app') ;
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

    it('should receive 200 OK', function(done) {
        this.timeout(3000) ;
        siprequest(config.request_uri, {
            body: config.sdp
        }, function( err, req, res ) {
            should.not.exist(err) ;
            res.should.have.property('statusCode',200); 
            res.should.have.property('body') ;
            appLocal.idle.should.be.true ;
            appRemote.idle.should.be.true ;
            done() ;
        }) ;
    }) ;
}) ;
