# dracht.io architecture

dracht.io is designed to make it easy for developers to integrate Voice-over IP (VoIP) features into their web applications; or, alternatively, to simply build full-on next generation VoIP applications without a traditional web (i.e. http) facade.  It couples an easy-to-use [express](http://expressjs.com/)-style web application framework with a high-performance [SIP](http://www.ietf.org/rfc/rfc3261.txt) processing engine that is built on the [sofia SIP stack](https://gitorious.org/sofia-sip).  

dracht.io consists of a client and a server component.  The server component is [drachtio-server](https://github.com/davehorton/drachtio-server) - a minimal, high-performance sip agent process which contains no application logic, but provides a SIP endpoint that can be controlled by clients that exchange [JSON](http://www.json.org) messages with the server over a TCP network connection.  The drachtio-server is written in C++ and designed to run as a daemon process, which may be remote or co-located with a drachtio application.

The client component is drachtio, which is a node.js module that enables node applications to receive or make SIP calls, handle SIP registrations, and perform any other type of SIP call control by connecting to a [drachtio-server](https://github.com/davehorton/drachtio-server) instance.  

![drachtio architecture](http://www.dracht.io/images/drachtio-architecture.png)

The diagram above shows an example of 3 node server instances running 2 different drachtio applications, connecting to a drachtio-server that has connections to 3 different telecom carrier SIP networks.  In this diagram, SIP traffic and HTTP traffic are shown as being segmented onto different networks, which is a common network design for highly scalable service platforms.  Alternatively, SIP and HTTP traffic can be co-located on the same network, if desired.  Drachtio is designed to be suitable for carrier-class service provider installations as well as smaller footprint web server-type networks.

The drachtio clients and the drachtio-server pictured above may reside in the same network (even on the same server), or they may connect over an internet connection; e.g. as pictureud a service provider is hosting a drachtio-server and enabling services for remotely connecting web applications.

### Client-server authentication
When a drachtio application establishes a connection to a drachtio-server instance, it authenticates by means of a password, or secret.  The connection is dropped if an invalid password is provided. 
> Alternative and more robust forms of client-server authentication are planned be added to in the near future.

## Middleware architecture

Drachtio uses the concept of middleware to process incoming SIP messages.  The middleware consists of a layered sequence of javascript functions set up as a filter chain, where each function can optionally process or modify the request before passing it up to the next layer.  Each middleware function receives javascript objects representing the SIP request and response messages, as well as a `next` function to call to pass control up to the next level.  Middleware is installed by the `use` function on the app object.  

An example middleware is shown below, which rejects all incoming SIP register messages that don't have an Authorization header

```js
var drachtio = require('drachtio')
,app = drachtio() ;

app.connect({
	host: '192.168.173.1'
	,port: 8023
	,secret: 'cymru'
}) ;

app.use('register', function( req, res, next ) {
	if( !req.get('authorization') ) return res.send(401) ;
	next() ;
}) ;

app.register( function(req, res) {
	//if we got here, we know we have an Authorization header
 	//TODO:...verify registration and call res.send(..) as appropriate
}) ;
```

## Low-level SIP control
drachtio provides the means to send and receive individual SIP messages.  Working at this level, messages are received using the `app[verb]` functions, and are sent using the `app.siprequest` function.  An application can set the values of individual SIP headers - including custom headers -- on any SIP message that is sent.  This offers extensive control over the SIP signaling although it does require a degree of knowledge of SIP.

The example below shows a simple app that responds to a SIP invite request by sending a 200 OK, and later also responds to a bye with a 200 OK.
```js
var drachtio = require('drachtio')
,app = drachtio();

app.connect({
    host: 'localhost'
    ,port: 8022
    ,secret: 'cymru'
}) ;

app.invite(function(req, res) {

    res.send(200, {
        headers: {
            'content-type': 'application/sdp'
        }
        ,body: localSdp
    } ;
}) ;

app.bye( function( req, res){
	res.send( 200 ); 
})
```
### Session-stateful applications

## Higher level abstraction - SIP Dialogs
One of the features that a middleware-based architecture offers is the ability to easily add higher levels of programming abstractions.  drachtio includes optional middleware support for Sip dialogs.  drachtio exposes a Dialog object which represents a SIP call leg and provides methods for controlling the call leg.  The dialog middleware also emits dialog-related events (via the `app` object).  The above example could be written as follows using SIP dialog middleware:
```js
var drachtio = require('drachtio')
,app = drachtio()
,RedisStore = require('drachtio-redis')(drachtio) 

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
        ,body: d.dummySdp
    }) ;
}) ;

app.on('sipdialog:create', function(e) {
    var dialog = e.target ;
    dialog.session.user = 'DaveH' ;
})
.on('sipdialog:terminate', function(e) {
    var dialog = e.target ;
    
    console.log('dialog was terminated due to %s', e.reason ) ;
    console.log('dialog user is: %s', dialog.session.user) ;
}) ;
```
## Related projects

### [drachtio-msml](https://github.com/davehorton/drachtio-msml)
drachtio-msml provides middleware that allows application developers to incorporate audio and video features of IP media servers that support [MSML](http://en.wikipedia.org/wiki/MSML) (Media Server Markup Language).

### [drachtio-middleware](https://github.com/davehorton/drachtio-middleware)
drachtio-middleware is a repository of common middleware that can be used in drachtio applications.

### [drachtio-redis](https://github.com/davehorton/drachtio-redis)
drachtio-redis is a Redis client for drachtio applications, enabling the use of the Redis key-value store to store drachtio dialogs and application session state. 

## Managing session state
The example above introduced the concept of session state.  Session state refers to application content that relates to one SIP dialog (or associated set of SIP dialogs) which needs to be persisted between different javascript callback functions.  This is analagous to web applications, which need to maintain session state (e.g., a shopping cart) between different http requests.  

In the case of web applications, http requests are typically distributed across a bank of web servers so that the server handling one request for a user may not handle the next, related, request from the same user.  Persisting session state across web servers enables applications requiring features like a shopping cart to be written in a scalable way.

With drachtio applications, something similar is necessary.  A long-running SIP dialog will involve many sip requests, and it is desirable if these can distributed across multiple servers with no loss of functionality.  By default, drachtio-server will "home" a SIP dialog to the initial drachtio app that established the dialog; e.g., if an incoming SIP invite is sent to a server that establishes a dialog, then the SIP bye message for that dialog will be sent to the same server, if possible.  However, if a drachtio application server fails, drachtio-server will route messages for existing dialogs that were "homed" to that server will be sent to another server that is running the same application.  Applications, therefore, should use session state to maintain all the information that a stateful application needs.  

Session state is maintained by attaching properties to the dialog object that is provided in app callbacks, as exmplified above.  Session state requires a session store (commonly Redis, though any session store conforming to a simple interface can be used).  The SIP dialog object is automatically saved to the session store by the drachtio framework, and then re-constituted when a `sipdialog` event is emitted. By convention, user-level state information is saved to the dialog.session object. 

In the example above, the value 'DaveH' is saved to the dialog.session.user property in the `sipdialog:create` event handler, and is later made available when the `sipdialog:terminate` handler is called, even if that latter event is emitted on a different server than the one on which the sip dialog was established.  

## High availability
As described above, drachtio supports high availability (HA) where running applications can be resilient to server failure and continue providing a service with no discernable user impact when a server fails.  Do so means distributing applications across multiple servers, and writing applications so as to maintain all application-level variables in session state.






