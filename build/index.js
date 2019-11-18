(function() {
  'use strict';
  var async, sioc, socketio;

  socketio = require('socket.io');

  sioc = require('socket.io-client');

  async = require('async');

  module.exports = function(ndx) {
    var asyncCallback, callbacks, cio, fns, io, safeCallback, sockets;
    io = null;
    cio = null;
    sockets = [];
    callbacks = {
      connection: [],
      disconnect: [],
      user: [],
      update: [],
      insert: [],
      "delete": []
    };
    fns = {
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
      emitToAll: function(users, name, data) {
        return async.each(sockets, function(socket, callback) {
          if (socket.user) {
            socket.emit(name, data);
          }
          return callback();
        });
      },
      dbFn: function(users, name, args) {
        var myargs;
        myargs = JSON.parse(JSON.stringify(args));
        return async.eachSeries(sockets, function(socket, callback) {
          if (socket.user) {
            myargs.user = socket.user;
            return asyncCallback(myargs.op, args, function(result) {
              if (!result) {
                return callback();
              }
              socket.emit(myargs.op, {
                table: myargs.table,
                id: myargs.id
              });
              return callback();
            });
          } else {
            return callback();
          }
        });
      }
    };
    asyncCallback = function(name, obj, cb) {
      var truth;
      truth = false;
      if (callbacks[name] && callbacks[name].length) {
        return async.eachSeries(callbacks[name], function(cbitem, callback) {
          if (!truth) {
            return cbitem(obj, function(result) {
              truth = truth || result;
              return callback();
            });
          } else {
            return callback();
          }
        }, function() {
          return typeof cb === "function" ? cb(truth) : void 0;
        });
      } else {
        return typeof cb === "function" ? cb(true) : void 0;
      }
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
    if (ndx.settings.CLUSTER) {
      cio = sioc.connect('http://' + ndx.settings.CLUSTER_HOST + ':' + ndx.settings.CLUSTER_PORT, {
        reconnect: true
      });
      cio.on('connect', function() {
        return console.log('client connected');
      });
      cio.on('call', function(data) {
        return fns[data.fn](data.users, data.name, data.data);
      });
    }
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
      socket.on('disconnect', function() {
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
      return socket.on('call', function(data) {
        return fns[data.fn](data.users, data.name, data.data);
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
        if (ndx.settings.CLUSTER) {
          return cio.emit('call', {
            fn: 'emitToUsers',
            users: users,
            name: name,
            data: data
          });
        } else {
          return fns.emitToUsers(users, name, data);
        }
      },
      emitToAll: function(name, data) {
        if (ndx.settings.CLUSTER) {
          return cio.emit('call', {
            fn: 'emitToAll',
            users: null,
            name: name,
            data: data
          });
        } else {
          return fns.emitToAll(null, name, data);
        }
      },
      dbFn: function(args) {
        if (ndx.settings.CLUSTER) {
          return cio.emit('call', {
            fn: 'dbFn',
            data: args
          });
        } else {
          return fns.dbFn(null, null, args);
        }
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
