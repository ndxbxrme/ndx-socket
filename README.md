# ndx-socket 
### websockets for [ndx-framework](https://github.com/ndxbxrme/ndx-framework)
install with  
`npm install --sve ndx-socket`  
## what it does
ndx-socket provides callbacks for socket connection and disconnect
## example  
`src/server/app.coffee`  
```coffeescript
require 'ndx-server'
.config
  database: 'db'
.use 'ndx-socket'
.controller (ndx) ->
  sockets = []
  ndx.socket.on 'connection', (socket) ->
    #do something with the socket
    sockets.push socket
  ndx.socket.on 'disconnect', (socket) ->
    #socket has disconnected
    sockets.splice sockets.indexOf(socket), 1
```