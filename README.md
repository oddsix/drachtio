# drachtio [![Build Status](https://secure.travis-ci.org/davehorton/drachtio.png)](http://travis-ci.org/davehorton/drachtio)

<!-- [![Gittip](http://img.shields.io/gittip/davehorton.png)](https://www.gittip.com/davehorton/)

<sub><sup>All tips will go to support the good causes and great people of
 beautiful, rural Pembrokeshire, Wales, where this code was born.  Iechyd da !!</sup></sub>
-->

[![drachtio logo](http://www.dracht.io/images/definition_only-cropped.png)](http://dracht.io/)

dracht.io is an [express](http://expressjs.com/)-inspired application framework that designed to let node.js developers easily integrate [SIP](http://www.ietf.org/rfc/rfc3261.txt) call and media processing features into their applications using familiar middleware patterns. 

```js
var drachtio = require('drachtio') ;
var app = drachtio() ;

app.connect({host:'localhost', port: 8022, secret: 'cymru', appName:'my simple app'}) ;

app.invite( function( req, res ) {
    res.send(486, {
        headers: {
            'user-agent': "Drachtio rocksz - but he's busy right now!"
        }
    }) ;
}) ;
```
The dracht.io architecture currently consists of the following components:

+ [drachtio-server](https://github.com/davehorton/drachtio-server) - A C++ SIP user agent that is controlled by drachtio clients over a TCP/JSON interface
+ [drachtio](https://github.com/davehorton/drachtio) - The core SIP middleware exposed to applications, providing the ability to build both SIP user agent client (UAC) and user agent server (UAS) applications
+ [drachtio-session](https://github.com/davehorton/drachtio-session) - Adds support for stateful SIP applications as well as resiliency/horizontal scaling of drachtio applications
+ [drachtio-redis](https://github.com/davehorton/drachtio-redis) - A redis client for storing session data
+ [drachtio-dialog](https://github.com/davehorton/drachtio-dialog) - A higher-level framework that introduces the concept of SIP dialogs and simplifies some aspects of application development
+ [drachtio-msml](https://github.com/davehorton/drachtio-msml) - A library that provides the ability to control IP media servers using [Media Server Markup Language](http://tools.ietf.org/html/rfc5707)

More information about the drachtio architecture can be found [here](docs/architecture.md)
## Getting started
### Creating an application
The first thing an application must do is to require the drachtio library and invoke the returned function to create an application.  The application instance that is created is an EventEmitter.
```js
var drachtio = require('drachtio')
,app = drachtio() ;
```
### Connecting to the server
The next thing an application must do is to connect to the drachtio-server that will be providing the SIP endpoint. By default, 
drachtio-server listens for TCP connections from clients on port 8022
Since the sip transport is implemented by drachtio-server, a connection must be established to a drachtio-server in order to control the sip messaging.  The drachtio-server process listens by default on TCP port 8022 for connections from drachtio applications.

```js
app.connect({
    host:'localhost'
    ,port: 8022
    ,secret: 'cymru'
    ,appName: 'myApp'
}, function( err, hostport ) {
    if( err ) console.err('failed to connect to drachtio-server: ' + err) ;
    else console.log('drachtio-server is listening for sip messages on ' + hostport) ;
}) ;
```
> `appName` is an optional parameter; if provided, it is used by drachtio-server to distribute the requests for a sip dialog across
multiple running node instances of your application. 

A 'connect' event is emitted by the app object when the connection has been established; alternatively, a callback can be passed to the connect method, as shown above.  

The callback takes two parameters:
* an error value describing why the connection failed, or null; and
* the sip address (host:port) that drachtio-server is listening on.

## Receiving sip requests

app[verb] methods are used to receive incoming sip requests.  Request and Response objects are provided to the callback: the Request object contains information describing the incoming sip request, while the Response object contains methods that allow the application to control the generation of the sip response. 

> (Note that drachtio-server automatically sends a 100 Trying to all incoming INVITE messages, so it is not necessary for a drachtio app to do so).

```js
app.invite( function( req, res ) {
    res.send( 200, {
        body: mySdp
        headers: {
            'content-type': 'application/sdp'
        }
    }) ;
}) ;
app.register( function( req, res ) {
    res.send( 200, {
        headers: {
            expires: 1800
        }
    }) ;
}) ;
```

## Sending sip requests

SIP requests can be sent using the app.uac[verb] methods:

```js
app.connect({
    host:'localhost'
    ,port: 8022
    ,secret: 'cymru'
}) ;

/* send one OPTIONS ping after connecting */
app.once('connect', function(err) {
    if( err ) throw( err ) ;
    app.uac.options('sip:1234@192.168.173.139', function( err, req, res ) {
        if( err ) console.error( err ) ;
        else debug('received response with status is ', res.statusCode ) ;

        app.disconnect() ;
    }) ;
}) ;
```
The callback receives a Request and Response: in this case, the Request describes the sip request that was sent while the Response describes the sip response that was received.

The signature of the app.uac[verb] function is `(request_uri, opts, callback)`.  As shown in the example above, `opts` can be left out if there is no need to specify sip headers or body of the outgoing message.  

## ACK requests

Sip INVITE messages have the additional feature of being concluded with an sip ACK request. In the case of a drachtio app sending a sip INVITE, the ACK will be automatically generated by the drachtio-server, unless the SIP request was sent with no content.  In that case, the drachtio app can generate the ACK request, specifying appropriate content, using the `ack` method on the Response object.

> When sending an INVITE request, as a convenience the 'uac' method can be used.

```js
var drachtio = require('drachtio') ;
var app = drachtio() 
siprequest = app.uac ;

app.connect({host:'localhost', port: 8022, secret: 'cymru'}) ;

siprequest('sip:1234@192.168.173.139', function( err, req, res ) {
    if( err ) throw( err ) ;

    if( res.statusCode === 200 ) {
        res.ack({
            body: mySdp
            ,headers: {
                'content-type': 'application/sdp'
            }
        }) ;
    }
}) ;

```

## Canceling a request

To cancel a sip INVITE that has been sent by the application, use the `cancelRequest` method on the request object that is returned from the `uac` method, as shown below.

```js
var request = app.uac('sip:234@127.0.0.1:5060',{
    headers:{
        'content-type': 'application/sdp'
    },
    body: sdp
}, function( err, req, res ) {

    if( err ) throw( err ) ;
    if( res.statusCode === 200 ) {
        res.ack() ;
    }
}) ;

//cancel the request 1 second after sending it
setTimeout( function() {
    request.cancelRequest() ;
}, 1000) ;
```

On the other hand, when receiving an INVITE request, the application can check `req.active` to determine whether or not the INVITE request has been canceled (in which case, `req.active` will be `false`).  Additionally, if the application specifically wants to attach a handler that will be invoked when a CANCEL is received, the `req.cancel` method should be used.

> Note: the application does not need to send a response to the CANCEL request; the drachtio-server will already have generated a 200 OK response.

```js
app.invite(function(req, res) {

    res.send(180) ;

    //....time passes

    req.active && res.send(200, {
        headers: {
            'content-type': 'application/sdp'
        }
        ,body: localSdp
    }) ;

    req.cancel( function( req, res ){
        debug('request was canceled by sender')
    }) ;
}) ;

``` 

## Reliable provisional responses

OK, so you want to send an INVITE and receive reliable provisional responses.  Easy, just add a `Require: 100rel` header to the INVITE request and drachtio-server will handle everything for you.

```js
    app.uac('sip:234@127.0.0.1:5060',{
        headers:{
            'content-type': 'application/sdp'
            'supported': '100rel'
            ,'require': '100rel'
        },
        body: sdp
    }, function( err, req, res ) {
        //..handle response
    }) ;
```

> Note that if you want to use reliable provisional responses if the remote side supports them, but establish the call without them if the remote side does not support it, then include a `Supported` header but do not include a `Require` header.

Similiarly, if you want to send reliable provisional responses, just add a `Require: 100rel` header in your response, and drachtio-server will handle sending reliable provisional response for you.  

And, if you want to install a callback handler to be invoked when the PRACK message is subsequently received, just call the `prack` method on the Request object.

> Oh yeah, the `app` will emit a `sipdialog:create-early` event when an early dialog is created at the point where the PRACK is received.  This will allow your app to do thinks like play a prompt over an early connection without propogating answer supervision, for instance.

```js
app.invite(function(req, res) {

    res.send(183, {
        headers: {
            'Content-Type': 'application/sdp'
            ,'Require': '100rel'
        }
        ,body: localSdp
    }) ;

    req.prack(function(prack){

        res.send(200, {
            headers: {
                'Content-Type': 'application/sdp'
            }
            ,body: d.dummySdp
        }) ;       
   }) ;        
}) ;

app.on('sipdialog:create-early', function(e) {
    var dialog = e.target ;
    debug('early dialog has been created: ', dialog) ;
}) ;

```

### Custom headers
You've already seen how to add sip headers to a request message, but how about custom headers? You're not restricted to the industry-standard headers, you can make up your own wacky custom headers if you need to.
```js
app.invite(function(req, res) {
    res.send( 500, 'Internal Server Error - Database down',{
        headers: {
            'X-My-Special-thingy': 'isnt my custom header shiny pretty?'
        }
    }) ;
}) ;
```
> Custom headers don't need to start with "X-", though that is pretty common practice.

On the other hand, there are some headers that you **can't** change.  For instance, the `Call-ID` header can't be changed, since this would potentially break the sip messaging.  If you try to set one of these headers, your attempted header value will be silently discarded (though you will see a warning in the drachtio-server log file).

## Back-to-back user agent (B2BUA)
A B2BUA is a common sip pattern, where a sip application acts as both a User agent client (UAC) and a User agent server (UAS).  The application receives a sip INVITE (acting as an UAS) and then turns around and generates a new INVITE that offers the same session description protocol being offered in the incoming INVITE.  Most sip applications are written as a B2BUA because it offers a great degree of control over each SIP call leg.

Creating a B2BUA is easy: in your `app.invite` handler, simply generate a sip request as shown above, and pipe the resulting object back into the response.

```js
app.invite(function(req, res) {
    var b2bua = siprequest( 'sip:209.251.49.158', {
        headers:{
            'content-type': 'application/sdp'
        }
        ,body: req.body
    }).pipe( res ) ;

    b2bua.on('fail', function(status) {
        debug('b2bua failed with status: ', status) ;
    }) 
    .on('success', function() {
        debug('b2bua connected successfully') ;
    }) ;
}) ;
```

> In the case of failure on the outbound INVITE, the callback is passed an object 
> representing the SIP status line on the response to that INVITE, e.g
>        { phrase: 'Not Implemented', status: 501, version: 'SIP/2.0' }

## Middleware


Express-style middleware can be used to intercept and filter messages.  Middleware is installed using the 'use' method of the app object, as we have seen earlier with the app.router middleware, which must always be installed in order to access the app[verb] methods.  

Additional middleware can be installed in a similar fashion.  Middleware functions should have an arity of 3 (req, res, next), unless they are error-handling callback methods, in which case the signature should be (err, req, res, next).

```js
app.use( function( req, res, next ) {
    /* reject all messages except from one ip address */
    if( req.signaling_address !== '192.168.1.52' ) return res.send(403) ; 
    next() ;
})
app.use( app.router ) ;
```
Middleware can also be invoked only for one type of request, instead of processing every message.
```js
app.use('register', drachtio.digestAuth('dracht.io', function( realm, user, fn) {
    //here we simply return 'foobar' as password; real-world we'd hit a database or something..
    fn( null, 'foobar') ;
})) ;
```
or only for responses:
```js
app.use('response', function(req, res, next) {
    //...e.g. perhaps I want to examine and log response status codes here
 )) ;
```
## Session state
Middleware can also used to install session state that can be accessed through req.session.  
```js
var drachtio = require('drachtio')
var app = drachtio()
var RedisStore = require('drachtio-redis')(drachtio) ;

app.connect({
    host: 'localhost'
    ,port: 8022
    ,secret: 'cymru'
}) ;

app.use( drachtio.session({store: new RedisStore({host: 'localhost'}) }) ) ;
app.use( app.router ) ;

app.invite(function(req, res) {
    req.session.user = 'DaveH' ;
    res.send(200, {
        headers: {
            'content-type': 'application/sdp'
        }
        ,body: localSdp
    }) ;
}) ;

app.bye( function(req, res){
    console.log('user is ' + req.session.user) ;
})
```
## Sip dialog support
Sip dialogs provide an optional, higher level of abtraction.  Using sip dialogs requires using session state, as dialogs are automatically persisted to session state. Sip dialogs are installed using the drachtio.dialog middleware function.
```js
var drachtio = require('drachtio')
var app = drachtio()
var RedisStore = require('drachtio-redis')(drachtio) 

app.connect({
    host: 'localhost'
    ,port: 8022
    ,secret: 'cymru'
}) ;

app.use( drachtio.session({store: new RedisStore({host: 'localhost'}) }) ) ;
app.use( drachtio.dialog() ) ;
app.use( app.router ) ;

app.invite(function(req, res) {

    res.send(200, {
        headers: {
            'content-type': 'application/sdp'
        }
        ,body: mySdp
    }) ;
}) ;

app.on('sipdialog:create', function(e) {
    var dialog = e.target ;
})
.on('sipdialog:terminate', function(e) {
    var dialog = e.target ;
    
    console.log('dialog was terminated due to ' + e.reason ) ;
}) ;

```

## SIP Header Parsing
Note that headers are already pre-parsed for you in incoming requests, making it easy to retrieve specific information elements
```js
app.invite(function(req, res) {
	console.log('remote tag on the incoming INVITE is ' + req.get('from').tag ) ;
	console.log('calling party number on the incoming INVITE is ' + req.get('from').url.user) ;
```

## Additional Documentation

- [Architecture overview](docs/architecture.md)
- [API](docs/api.md)
- [drachtio-msml](https://github.com/davehorton/drachtio-msml)
- [drachtio-middleware](https://github.com/davehorton/drachtio-middleware)
- [drachtio-redis](https://github.com/davehorton/drachtio-redis)



