'use strict'

socketio = require 'socket.io'
async = require 'async'

module.exports = (ndx) ->
  io = null
  sockets = []
  callbacks =
    connection: []
    disconnect: []
  safeCallback = (name, obj) ->
    for cb in callbacks[name]
      cb obj
  io = socketio.listen ndx.server

  io.on 'connection', (socket) ->
    #console.log 'socket connection'
    sockets.push socket
    safeCallback 'connection', socket
    socket.on 'user', (user) ->
      socket.user = user
    socket.on 'disconnect', ->
      #console.log 'socket disconnect'
      sockets.splice sockets.indexOf(socket, 1)
      safeCallback 'disconnect', socket
  ndx.socket = 
    on: (name, callback) ->
      callbacks[name].push callback
      @
    off: (name, callback) ->
      callbacks[name].splice callbacks[name].indexOf(callback), 1
      @
    emitToUsers: (users, name, data) ->
      async.each sockets, (socket) ->
        if users.indexOf(socket.user) isnt -1
          socket.emit name, data