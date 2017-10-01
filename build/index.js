(function() {
  'use strict';
  var async, socketio;

  socketio = require('socket.io');

  async = require('async');

  module.exports = function(ndx) {
    var callbacks, io, safeCallback, sockets;
    io = null;
    sockets = [];
    callbacks = {
      connection: [],
      disconnect: [],
      user: []
    };
    safeCallback = function(name, obj) {
      var cb, i, len, ref, results;
      ref = callbacks[name];
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        cb = ref[i];
        results.push(cb(obj));
      }
      return results;
    };
    io = socketio.listen(ndx.server);
    io.on('connection', function(socket) {
      sockets.push(socket);
      safeCallback('connection', socket);
      socket.on('user', function(user) {
        socket.user = user;
        return safeCallback('user', socket);
      });
      return socket.on('disconnect', function() {
        sockets.splice(sockets.indexOf(socket, 1));
        return safeCallback('disconnect', socket);
      });
    });
    return ndx.socket = {
      on: function(name, callback) {
        callbacks[name].push(callback);
        return this;
      },
      off: function(name, callback) {
        callbacks[name].splice(callbacks[name].indexOf(callback), 1);
        return this;
      },
      emitToUsers: function(users, name, data) {
        return async.each(sockets, function(socket, callback) {
          if (users.indexOf(socket.user) !== -1) {
            socket.emit(name, data);
          }
          return callback();
        });
      },
      users: function(cb) {
        var output;
        output = [];
        return async.each(sockets, function(socket, callback) {
          if (socket.user) {
            output.push(socket.user);
          }
          return callback();
        }, function() {
          return typeof cb === "function" ? cb(output) : void 0;
        });
      }
    };
  };

}).call(this);

//# sourceMappingURL=index.js.map
