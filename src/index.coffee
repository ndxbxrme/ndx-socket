'use strict'

socketio = require 'socket.io'
sioc = require 'socket.io-client'
async = require 'async'

module.exports = (ndx) ->
  io = null
  cio = null
  sockets = []
  callbacks =
    connection: []
    disconnect: []
    user: []
    update: []
    insert: []
    delete: []
  fns =
    emitToUsers: (users, name, data) ->
      async.each sockets, (socket, callback) ->
        if socket.user
          for user in users
            if user and user[ndx.settings.AUTO_ID].toString() is socket.user[ndx.settings.AUTO_ID].toString()
              socket.emit name, data
        callback()
    emitToAll: (users, name, data) ->
      async.each sockets, (socket, callback) ->
        if socket.user
          socket.emit name, data
        callback()
    dbFn: (users, name, args) ->
      myargs = JSON.parse JSON.stringify args
      async.eachSeries sockets, (socket, callback) ->
        if socket.user
          myargs.user = socket.user
          asyncCallback myargs.op, args
          , (result) ->
            if not result
              return callback()
            socket.emit myargs.op,
              table: myargs.table
              id: myargs.id
            callback()
        else
          callback()
  asyncCallback = (name, obj, cb) ->
    truth = false
    if callbacks[name] and callbacks[name].length
      async.eachSeries callbacks[name], (cbitem, callback) ->
        if not truth
          cbitem obj, (result) ->
            truth = truth or result
            callback()
        else
          callback()
      , ->
        cb? truth
    else
      cb? true
  safeCallback = (name, obj) ->
    for cb in callbacks[name]
      cb obj
  io = socketio.listen ndx.server
  if ndx.settings.CLUSTER
    cio = sioc.connect 'http://' + ndx.settings.CLUSTER_HOST + ':' + ndx.settings.CLUSTER_PORT, reconnect: true
    cio.on 'connect', ->
      console.log 'client connected'
    cio.on 'call', (data) ->
      fns[data.fn] data.users, data.name, data.data

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
    socket.on 'call', (data) ->
      fns[data.fn] data.users, data.name, data.data
  ndx.socket = 
    on: (name, callback) ->
      callbacks[name].push callback
      @
    off: (name, callback) ->
      callbacks[name].splice callbacks[name].indexOf(callback), 1
      @
    emitToUsers: (users, name, data) ->
      if ndx.settings.CLUSTER
        cio.emit 'call',
          fn: 'emitToUsers'
          users: users
          name: name
          data: data
      else
        fns.emitToUsers users, name, data
    emitToAll: (name, data) ->
      if ndx.settings.CLUSTER
        cio.emit 'call',
          fn: 'emitToAll'
          users: null
          name: name
          data: data
      else
        fns.emitToAll users, name, data
    dbFn: (args) ->
      if ndx.settings.CLUSTER
        cio.emit 'call',
          fn: 'dbFn'
          data: args
      else
        fns.dbFn null, null, args
    users: (cb) ->
      output = []
      async.each sockets, (socket, callback) ->
        if socket.user
          output.push JSON.parse JSON.stringify socket.user
        callback()
      , ->
        cb? output
      