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
      var cb, j, len, ref, results;
      ref = callbacks[name];
      results = [];
      for (j = 0, len = ref.length; j < len; j++) {
        cb = ref[j];
        results.push(cb(obj));
      }
      return results;
    };
    io = socketio.listen(ndx.server);
    io.on('connection', function(socket) {
      sockets.push(socket);
      safeCallback('connection', socket);
      socket.on('user', function(user) {
        var j, len, s;
        for (j = 0, len = sockets.length; j < len; j++) {
          s = sockets[j];
          if (s.id === socket.id) {
            s.user = user;
            break;
          }
        }
        return safeCallback('user', socket);
      });
      return socket.on('disconnect', function() {
        var i, j, len, s;
        for (i = j = 0, len = sockets.length; j < len; i = ++j) {
          s = sockets[i];
          if (s.id === socket.id) {
            sockets.splice(i, 1);
            break;
          }
        }
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
          var j, len, user;
          if (socket.user) {
            for (j = 0, len = users.length; j < len; j++) {
              user = users[j];
              if (user && user[ndx.settings.AUTO_ID].toString() === socket.user[ndx.settings.AUTO_ID].toString()) {
                socket.emit(name, data);
              }
            }
          }
          return callback();
        });
      },
      users: function(cb) {
        var output;
        output = [];
        return async.each(sockets, function(socket, callback) {
          if (socket.user) {
            output.push(JSON.parse(JSON.stringify(socket.user)));
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
