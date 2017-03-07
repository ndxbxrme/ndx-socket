'use strict'

socketio = require 'socket.io'



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