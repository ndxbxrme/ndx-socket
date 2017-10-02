'use strict'

socketio = require 'socket.io'
async = require 'async'

module.exports = (ndx) ->
  io = null
  sockets = []
  callbacks =
    connection: []
    disconnect: []
    user: []
  safeCallback = (name, obj) ->
    for cb in callbacks[name]
      cb obj
  io = socketio.listen ndx.server

  io.on 'connection', (socket) ->
    #console.log 'socket connection'
    sockets.push socket
    safeCallback 'connection', socket
    socket.on 'user', (user) ->
      for s in sockets
        if s.id is socket.id
          s.user = user
          break
      safeCallback 'user', socket
    socket.on 'disconnect', ->
      for s, i in sockets
        if s.id is socket.id
          sockets.splice i, 1
          break
      safeCallback 'disconnect', socket
  ndx.socket = 
    on: (name, callback) ->
      callbacks[name].push callback
      @
    off: (name, callback) ->
      callbacks[name].splice callbacks[name].indexOf(callback), 1
      @
    emitToUsers: (users, name, data) ->
      async.each sockets, (socket, callback) ->
        if socket.user
          for user in users
            if user[ndx.settings.AUTO_ID] is socket.user[ndx.settings.AUTO_ID]
              socket.emit name, data
              break
        callback()
    users: (cb) ->
      output = []
      async.each sockets, (socket, callback) ->
        if socket.user
          output.push socket.user
        callback()
      , ->
        cb? output
      