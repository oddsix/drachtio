# dracht.io [![Build Status](https://secure.travis-ci.org/davehorton/drachtio.png)](http://travis-ci.org/davehorton/drachtio)

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

## Getting started
### Creating an application
The first thing an application must do is to require the drachtio library and invoke the returned function to create an application.  The application instance that is created is an EventEmitter.
```js
var drachtio = require('drachtio')
,app = drachtio() ;
```
### Connecting to the server
The next thing an application must do is to call the 'connect' method in order to connect to the drachtio-server that will be providing the SIP endpoint. By default, 
drachtio-server listens for TCP connections from clients on port 8022.  Clients must also provide a shared secret as a means of authenticaion.  
```js
app.connect({
    host:'localhost'      //ip address or DNS name of drachtio-server to connect to
    ,port: 8022           //defaults to 8022 if not provided
    ,secret: 'cymru'      //shared secret
    ,appName: 'myApp'      //optional, but needed for session-stateful applications
}, function( hostport ) {
    console.log('successfully connected to a drachtio-server listening for sip messages on ' + hostport) ;
}) ;
```
> `appName` is an optional parameter; if provided, it is used by drachtio-server to distribute the requests for a sip dialog across
multiple running node instances of your application. 

A 'connect' event is emitted by the app object when the connection has been established; alternatively, a callback can be passed to the connect method, as shown above.  

### Receiving sip requests
A drachtio application can both send and receive SIP requests.  To receive SIP requests, app[verb] methods are used.  Request and Response objects are provided to the callback: the Request object contains information describing the incoming sip request, while the Response object contains methods that allow the application to control the generation of the sip response. 

```js
app.invite( function( req, res ) {
    res.send( 200, {
        body: mySdp
    }
}) ;
```
> drachtio-server automatically sends a 100 Trying to all incoming INVITE messages, so a drachtio app does not need to do so.

> A 'Content-Length' header is automatically provided by drachtio-server, so the application should not include that header.

> A 'Content-Type' header of 'application/sdp' will automatically be added by drachtio-server, where appropriate.

The `res.send` method can take up to three arguments: `(code, status, opts)`:
- `code` is required and is the numeric SIP response value
- `status` is optional and is a custom status text value that will appear in the SIP response line; if not provided the default status will be used
- `opts` is optional and is a javascript object containing values that control the generation of the response; most notably a `body` property which provides a value for the body of the SIP response and a `headers` property which provides one or more SIP headers that will be populated in the response.

```js
app.invite( function( req, res ) {
    res.send(480, 'Database down' ) ;{
        headers: {
            'retry-after': "1800 (scheduled maintenance)"
        }
    }) ;
}) ;
```
### Sending sip requests

SIP requests can be sent using the app.siprequest[verb] methods:

```js
/* send one OPTIONS ping and then disconnect */
app.once('connect', function() {
    app.siprequest.options('sip:1234@10.168.12.139', function( err, req, res ) {
        if( err ) console.error( err ) ;
        else debug('received response with status is ', res.statusCode ) ;

        app.disconnect() ;
    }) ;
}) ;
```
The callback receives a Request and Response: in this case, the Request describes the sip request that was sent while the Response describes the sip response that was received.
> `req.source` is a property that will have the value of either 'network' or 'application', depending on whether the request is being received by the application or sent by the application.

> When sending an INVITE, the shorthand form app.siprequest( ) may be used in place of app.siprequest.invite( )

The signature of the app.uac[verb] function is `(request_uri, opts, callback)`.  As shown in the example above, `opts` can be left out if there is no need to specify sip headers or body of the outgoing message.  

When sending a sip request within an existing SIP dialog, only the 'call-id' header needs to be supplied and dractio-server will automatically populate the other dialog-level headers of the message (e.g. Request-URI, CSeq, From, To).
```js
app.siprequest.bye({headers:{'call-id': myCallId}}) ;
```

#### ACK requests

Sip INVITE messages have the additional feature of being concluded with an sip ACK request. In the case of a drachtio app sending a sip INVITE, the ACK will be automatically generated by the drachtio-server, except in the case of a deferred SPP offer where the application has sent an INVITE without any body and is supplying the SDP offer in the ACK.  

However, in all cases, the application must call the `res.ack` method on the Response object because some internal event processing deoends on it.  

```js
var drachtio = require('drachtio') ;
var app = drachtio() ;

app.connect({host:'localhost', port: 8022, secret: 'cymru'}) ;

app.on('connect', function() {

    // deferred SDP offer
    app.siprequest('sip:1234@192.168.173.139', function( err, req, res ) {
        if( err ) throw( err ) ;

        if( res.statusCode >= 200 ) {
            res.ack( 200 == res.statusCode ? {
                body: mySdp
                ,headers: {
                    'content-type': 'application/sdp'
                }
            } : {}) ;
        }
    }) ;
})
```

#### Construction of From header
In many cases, the application will want to populate a calling party number in the user part of the SIP From header, but will not want to have to construct the entire SIP URL.  As a convenience, when providing a From header either the full SIP URL can be provided or simply the user part of the URL.  

Furthermore, since the ip address part of the From header should be the host address of the drachtio server, the application can simply substitute the 'localhost' in the ip address part of the SIP URL for the From header, and drachtio-server will replace it with the correct address before sending.

```js
app.siprequest('sip:1234@192.168.173.139', {
    headers:
        {from: '8005551212'}
}, function( err, req, res ) {...}) ;

//or

app.siprequest('sip:1234@192.168.173.139', {
    headers:
        {from: '"Dave H" <sip:8005551212@localhost>'}
}, function( err, req, res ) {...}) ;
```
> The same convenience is available for the P-Asserted-Identity, P-Charge-Info, and P-Preferred-Identity headers

### Canceling a request

To cancel a sip INVITE that has been sent by the application, use the `cancel` method on the request object that is returned from the `uac` method, as shown below.

```js
var r = appLocal.siprequest(config.request_uri, {
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
```

On the other hand, when receiving an INVITE request, the application can check `req.active` to determine whether or not the INVITE request has been canceled by the sender (in which case, `req.active` will be `false`).  

Additionally, if the application specifically wants to attach a handler that will be invoked when a CANCEL is received, the `req.cancel` method should be used.

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

### Reliable provisional responses

Responding to a SIP INVITE with a reliable provisional response is easy: just add a `Require: 100rel` header to the INVITE request and drachtio-server will handle that for you.  However, after sending a response reliably, your app should wait for the PRACK to be received before sending the final response.  This can be done by providing a handler for the `req.prack` method.

```js
app.invite(function(req, res) {
    res.send( 183,{
        headers: {
            require: '100rel'
            ,supported: '100rel'
        }
        ,body: config.sdp
    }) ;

    req.prack( function(prack) {
        // send final response now that we have received PRACK
        res.send( 200, {body: config.sdp} ) ;
    }) ;
}) ;
```

> Note that if you want to use reliable provisional responses if the remote side supports them, but establish the call without them if the remote side does not support it, then include a `Supported` header but do not include a `Require` header.

Similiarly, if you want to send reliable provisional responses, just add a `Require: 100rel` header in your response, and drachtio-server will handle sending reliable provisional response for you.  

### Back-to-back user agent (B2BUA)
A B2BUA is a common sip pattern, where a sip application acts as both a User agent client (UAC) and a User agent server (UAS).  The application receives a sip INVITE (acting as an UAS) and then turns around and generates a new INVITE that offers the same session description protocol being offered in the incoming INVITE.  Most sip applications are written as a B2BUA because it offers a great degree of control over each SIP call leg.

Creating a B2BUA is easy: in your `app.invite` handler, simply generate a sip request as shown above, and pipe the resulting object back into the response.

```js
app.invite( function(req, res) {
    var request = app.siprequest( config.remote_uri2, {
        body: req.body
    })
    .pipe( res, function( uacRes ){
        debug('pipe returned with final response status %d on uac call leg %s', uacRes.statusCode, uacRes.get('call-id'));
    }) ;
}) ;
```

> Note that the callback function passed to pipe will receive the final response object on the B leg

Note that the above can also be accomplished without using the pipe method as shown below:
```js
app.invite( function(req, res) {
    invite( config.remote_uri2, {
        body: req.body
    }, function( err, uacReq, uacRes ) {
        assert(!err) ;

        res.send( uacRes.statusCode, {
            body: uacRes.body
        }) ;
        if( uacRes.statusCode >= 200 ) uacRes.ack() ;               
    }) ;
}) ;
```
### Middleware


Express-style middleware can be used to intercept and filter messages.  Middleware is installed using the 'use' method of the app object, as we have seen earlier with the app.router middleware, which must always be installed in order to access the app[verb] methods.  

Additional middleware can be installed in a similar fashion.  Middleware functions should have an arity of 3 (req, res, next), unless they are error-handling callback methods, in which case the signature should be (err, req, res, next).

```js
app.use( function( req, res, next ) {
    /* reject all messages except from one ip address */
    if( req.signaling_address !== '192.168.1.52' ) return res.send(403) ; 
    next() ;
})
app.invite( function( req, res ) { //...we only get valid messages here } ) ;
```
Middleware can also be invoked only for one type of request, instead of processing every message.
```js
app.use('register', digestAuthMiddleware('dracht.io', function( realm, user, fn) {
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
### SIP Header Parsing
Note that headers are already pre-parsed for you in incoming requests, making it easy to retrieve specific information elements
```js
app.invite(function(req, res) {
	console.log('remote tag on the incoming INVITE is ' + req.get('from').tag ) ;
	console.log('calling party number on the incoming INVITE is ' + req.get('from').url.user) ;
```

## Additional Documentation

- [drachtio-session](https://github.com/davehorton/drachtio-session)
- [drachtio-dialog](https://github.com/davehorton/drachtio-dialog)
- [drachtio-msml](https://github.com/davehorton/drachtio-msml)
- [drachtio-middleware](https://github.com/davehorton/drachtio-middleware)
- [drachtio-redis](https://github.com/davehorton/drachtio-redis)



