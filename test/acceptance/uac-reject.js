var appRemote
,assert = require('assert')
,spawn = require('child_process').spawn
,exec = require('child_process').exec
,should = require('should')
,config = require('./fixtures/config')
,appLocal
,appRemote;

describe('reject invites', function() {

    it('must allow custom status phrases', function(done) {

       appRemote = require('../../examples/uas-reject-with-custom-status/app') ;
        appRemote.on('connect', function() {
            appLocal = require('../..')() ;
 
            appLocal.connect(config.connect_opts, function(err){
                appLocal.uac(config.request_uri, {
                     body: config.sdp
                }, function( err, req, res ) {
                    should.not.exist(err) ;
                    res.should.have.property('statusCode',500); 
                    res.status.should.have.property('phrase','Database down') ;
                    res.ack() ;
                }) ;
            });        
            appRemote.ack(function(){
                setTimeout( function() {
                    appLocal.idle.should.be.true ;
                    appRemote.idle.should.be.true ;

                    appLocal.disconnect() ;
                    appRemote.disconnect() ;
                    done() ;            
                        
                }, 500) ;
            }) ;
        }) ;
     }) ;

   it('must insert default status phrase', function(done) {

       appRemote = require('../../examples/uas-reject-with-default-status/app') ;
        appRemote.on('connect', function() {
            appLocal = require('../..')() ;
 
            appLocal.connect(config.connect_opts, function(err){
                appLocal.uac(config.request_uri, {
                     body: config.sdp
                }, function( err, req, res ) {
                    should.not.exist(err) ;
                    res.should.have.property('statusCode',500); 
                    res.status.should.have.property('phrase','Internal Server Error') ;
                    res.ack() ;
                }) ;
            });        
            appRemote.ack(function(){
                setTimeout( function() {
                    appLocal.idle.should.be.true ;
                    appRemote.idle.should.be.true ;

                    appLocal.disconnect() ;
                    appRemote.disconnect() ;
                    done() ;            
                        
                }, 500) ;
            }) ;
        }) ;
     }) ;

}) ;
