var appRemote
,assert = require('assert')
,spawn = require('child_process').spawn
,exec = require('child_process').exec
,should = require('should')
,config = require('./fixtures/config')
,appLocal
,appRemote;


describe('custom headers', function() {
    this.timeout(3000) ;

    before(function(done){
       appRemote = require('../../examples/custom-headers/app') ;
        appRemote.on('connect', function() {
            appLocal = require('../..')() ;
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
 
    it('must be able to set a new header', function(done) {
        appLocal.siprequest.options(config.request_uri, function( err, req, res ) {
            should.not.exist(err) ;
            res.should.have.property('statusCode',200); 
            res.headers.should.have.property('X-custom','drachtio rocks!') ;
            appLocal.idle.should.be.true ;
            appRemote.idle.should.be.true ;
            done() ;
        }) ;
    }) ;

    it('must be able to set a well-known header', function(done) {
        appLocal.siprequest.message(config.request_uri, function( err, req, res ) {
            should.not.exist(err) ;
            res.should.have.property('statusCode',200); 
            res.headers.subject.should.have.length(1) ;
            res.headers.subject[0].should.equal('pure awesomeness') ;
            appLocal.idle.should.be.true ;
            appRemote.idle.should.be.true ;
            done() ;
        }) ;
    }) ;
}) ;
