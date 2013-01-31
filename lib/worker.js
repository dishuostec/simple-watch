"use strict";
//var DEBUG = 1;
var delay_call_changed_callback = 10;
var delay_check_change = 10;

var fs = require('fs'),
  path = require('path'),
  sep = path.sep,
  Collector = require('./collector');


if (!Function.prototype.delay) {
  Function.prototype.delay = function (timeout) {
    if (typeof this !== "function") {
      throw new TypeError("Function.prototype.delay - what is trying to be bound is not callable");
    }

    timeout = +timeout;

    var context = this,
      timer;

    return function() {
      var args = Array.prototype.slice.call(arguments, 0);
      clearTimeout(timer);
      timer = setTimeout(function() {
        context.apply(context, args);
      }, timeout);
    };
  };
}

process.on('message', function(msg) {
  var cmd = msg[0];
  var data = msg[1];

  switch (cmd) {
    case 'watch':
      root.watch(data);
      break;

    case 'watchAll':
      data.forEach(function(pathname) {
        root.watch(pathname);
      });
      break;
    
    default:
      throw new Error('Watcher worker: undefined command "'+cmd+'"');
  }
});

var pathname_map = {};

var file_changed = new Collector();

var call_changed_callback = function() {
  var files = file_changed.getAll(true);
  //if (DEBUG) {console.log('changed files: ', files);}
  files = files.map(function(pathname) {
    return pathname_map[pathname];
  });
  process.send(['changed', files]);
}.delay(delay_call_changed_callback);

function Item (parent, name) {
  this.items = {};

  //if (DEBUG) {console.log('new Item:', [typeof parent, parent ? parent.name : '...'], [typeof name, name]);}
  if (parent && name) {
    //if (DEBUG) {console.log('[' + name + '] init');}
    this.parent = parent;
    this.name = name;
    this._expecting = new Collector();
    this._changed = new Collector();

    this.checkChange = this._checkChange.bind(this).delay(delay_check_change);
    this.fileChanged = this._fileChanged.bind(this).delay(delay_check_change);

    this.checkType();
  }
}

Item.prototype.TYPE_DIR = 0;
Item.prototype.TYPE_FILE = 1;
Item.prototype.watcher = null;
Item.prototype.name = null;
Item.prototype.is_target = false;
Item.prototype.type = null;
Item.prototype.parent = null;
Item.prototype.exist = false;

Item.prototype._path = null;

Item.prototype.path = function() {
  if (this._path === null) {
    var parent_path = this.parent.path();

    if (parent_path !== null) {
      this._path = parent_path + sep + this.name;
    } else {
      this._path = this.name;
    }
  }
  //if (DEBUG) {console.log('[' + this.name + '] path:', this._path);}
  return this._path;
};

Item.prototype.checkExist = function() {
  //if (DEBUG) {console.log('[' + this.name + '] checkExist:');}
  this.exist = this.parent && this.parent.exist && fs.existsSync(this.path());
  //if (DEBUG) {console.log('[' + this.name + '] exist:', this.exist);}
  return this.exist;
};

Item.prototype.checkType = function() {
  //if (DEBUG) {console.log('[' + this.name + '] checkType:');}
  if (this.checkExist()) {
    var stats = fs.statSync(this.path());
    if (stats.isFile()) {
      this.type = this.TYPE_FILE;
    } else if (stats.isDirectory) {
      this.type = this.TYPE_DIR;
    }
  } else {
    this.type = null;
  }
  //if (DEBUG) {console.log('[' + this.name + '] type:', this.type);}
};

Item.prototype.expecting = function(item) {
  //if (DEBUG) {console.log('[' + this.name + '] expecting:', item, this._expecting.has(item));}
  return this._expecting.has(item);
};

Item.prototype.expect = function(item) {
  //if (DEBUG) {console.log('[' + this.name + '] expect:', item);}
  this._expecting.add(item);
};

Item.prototype.unExpect = function(item) {
  //if (DEBUG) {console.log('[' + this.name + '] unExpect:', item);}
  this._expecting.removeOne(item);

  if (this._expecting.length() < 1) {
    this.stopWatch();
  }
};

Item.prototype.changed = function(name) {
  //if (DEBUG) {console.log('[' + this.name + '] changed:', name);}
  if (name === null) {
    return;
  }

  this._changed.add(name);
  this.checkChange();
};

Item.prototype._checkChange = function() {
  //if (DEBUG) {console.log('[' + this.name + '] _checkChange');}

  this._changed.getAll(true)
    .filter(this.expecting.bind(this))
    .forEach(function(name) {
      var item = this.items[name];
      item.create();
      //if (DEBUG) {console.log('[' + this.name + '] loop change:', name);}
      if (item.exist) {
        this.unExpect(name);
      }
    }.bind(this));
};


Item.prototype.create = function() {
  //if (DEBUG) {console.log('[' + this.name + '] create');}
  this.checkType();
  this.watch('create');
};

Item.prototype.stopWatch = function() {
  if (this.watcher) {
    //if (DEBUG) {console.log('[' + this.name + '] stopWatch');}
    this.watcher.close();
    this.watcher = null;
  }
};

Item.prototype.watch = function(event) {
  //if (DEBUG) {console.log('[' + this.name + '] watch:', ! this.exist, this.watcher !== null);}
  if ( ! this.exist
      || this.watcher !== null
  ) {
    //if (DEBUG) {console.log('[' + this.name + '] watch cancle 1');}
    return;
  }

  //if (DEBUG) {console.log('[' + this.name + '] watch type:', this.type);}
  switch (this.type) {
    case this.TYPE_DIR:
      if (this._expecting.length() === 0) {
        //if (DEBUG) {console.log('[' + this.name + '] watch cancle 2');}
        return;
      }
      this.watcher = fs.watch(this.path(), function(event, name) {
        this.changed(name);
      }.bind(this));
    break;
    case this.TYPE_FILE:
      //if (DEBUG) {console.log('[' + this.name + '] watching:', this.path());}
      if (event === 'create') {
        this.fileChanged();
      }
      this.watcher = fs.watch(this.path(), this.fileChanged.bind(this)); 
    break;
  }

  if (this.watcher) {
    this.watcher.on('error', function(e) {
      //console.log(e);
      this.watcher.close();
      this.watcher = null;
      process.send(['error']);
    }.bind(this));
  }
};

Item.prototype._fileChanged = function(event, name) {
  file_changed.add(this._path);
  call_changed_callback();
};

Item.prototype.watch_path = function(path_split) {
  //if (DEBUG) {console.log('[' + this.name + '] watch_path:', path_split);}
  if (path_split.length < 1) {
    return;
  }

  var name = path_split.shift();

  if (this.hasItem(name)) {
    this.items[name].watch_path(path_split);
    return;
  }

  var item = new Item(this, name);
  this.addItem(name, item);

  if ( ! item.exist) {
    this.expect(name);
  }

  this.watch();

  if (path_split.length) {
    item.watch_path(path_split);
  } else {
    item.is_target = true;
    item.watch();
  }
};

Item.prototype.hasItem = function(name) {
  //if (DEBUG) {console.log('[' + this.name + '] hasItem:', name, this.items.hasOwnProperty(name));}
  return this.items.hasOwnProperty(name);
};

Item.prototype.addItem = function(name, item) {
  //if (DEBUG) {console.log('[' + this.name + '] addItem:', name);}
  if (this.hasItem(name)) {
    //if (DEBUG) {console.log('[' + this.name + '] addItem cancel:', name);}
    return false;
  }

  this.items[name] = item;

  return true;
};

var root = new Item(null, null);
root.exist = true;
root.path = function() {
  return null;
};

root.watch = function (p) {
  var pathname = path.resolve(p);
  pathname_map[pathname] = p;

  var path_split = pathname.split(path.sep);
  //if (DEBUG) {console.log('watch:', p, path_split);}
  var name = path_split.shift();

  if (this.hasItem(name)) {
    this.items[name].watch_path(path_split);
    return;
  }

  var item = new Item(this, name);
  this.addItem(name, item);

  if (item.exist) {
    item.watch_path(path_split);
  } else {
    throw new Error('Can not watch path: ' + p + '\ndir not exist: ' + name);
  }
};

