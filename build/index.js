(function() {
  'use strict';
  var socketio;

  socketio = require('socket.io');

  module.exports = function(ndx) {
    var callbacks, io, safeCallback, sockets;
    io = null;
    sockets = [];
    callbacks = {
      connection: [],
      disconnect: []
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
      console.log('socket connection');
      sockets.push(socket);
      safeCallback('connection', socket);
      return socket.on('disconnect', function() {
        console.log('socket disconnect');
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
      }
    };
  };

}).call(this);

//# sourceMappingURL=index.js.map
