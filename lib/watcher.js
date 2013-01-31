"use strict";
var child_process = require('child_process'),
  Collector = require('./collector');

var watching = new Collector();

function watch (pathname) {
  if (watching.addOne(pathname)) {
    worker.sendPath(pathname);
  }
}

var cb_list = [];
function changed (callback) {
  if (typeof callback !== "function") {
    throw new TypeError("callback is not callable");
  }
  cb_list.push(callback);
}

var worker = {
  child: null,
  fork: function() {
    if (this.child !== null) {
      return;
    }

    var child = child_process.fork(__dirname + '/worker.js', {silent: 0});
    child.on('message', function(msg) {
      var cmd = msg[0];
      var data = msg[1];

      switch (cmd) {
        case 'changed':
          cb_list.forEach(function(cb) {
            cb(data);
          });
          break;
        case 'error':
          child.kill();
          break;

        default:
          throw new Error('Watcher: undefined command "'+cmd+'"');
      }
    });

    //console.log(child.stdout);

    child.on('exit', function(code, signal) {
      this.child = null;
      setTimeout(function() {
        this.fork();
        this.child.send(['watchAll', watching.getAll()]);
      }.bind(this), 0);
    }.bind(this));

    this.child = child;
  },
  sendPath: function(pathname) {
    if (this.child === null) {
      this.fork();
    }
    this.child.send(['watch', pathname]);
  },
};

process.on('exit', function() {
  console.log('exit', arguments, worker.child);
  if (worker.child) {
    worker.child.kill();
  }
});

module.exports = {
  watch: watch,
  changed: changed,
};
