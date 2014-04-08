var appRemote
,assert = require('assert')
,spawn = require('child_process').spawn
,exec = require('child_process').exec
,should = require('should')
,config = require('./fixtures/config')
,appLocal
,appRemote
,siprequest ;

describe('cancel invites', function() {

    before(function(done){
       appRemote = require('../../examples/uas-cancel/app') ;
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

    it('must be able to cancel an INVITE', function(done) {
        this.timeout(5000) ;
        var i = 0 ;
        var r = siprequest(config.request_uri, {
            body: config.sdp
        }, function( err, req, res ) {
            should.not.exist(err) ;
            res.should.have.property('statusCode', i++ === 0 ? 180 : 487); 

            if( res.statusCode === 180 ) return ;

            res.ack() ;

            appLocal.idle.should.be.true ;
            appRemote.idle.should.be.true ;
            done() ;
        }) ;

        setTimeout( function() {
            r.cancel() ;
        }, 200) ;
    }) ;
}) ;
