"use strict";
var fs = require('fs'),
  path = require('path'),
  watcher = require('./watcher'),
  Collector = require('./collector');

function exists (path) {
  return fs.existsSync(path);
}

function isFile (path) {
  if ( ! exists(path)) {
    return false;
  }

  var stats = fs.statSync(path);
  return stats.isFile();
}

function isDir (path) {
  if ( ! exists(path)) {
    return false;
  }

  var stats = fs.statSync(path);
  return stats.isDirectory();
}

var watching_files = {
  _files : {},
  add : function(file_path, callback) {
    if ( ! this.has(file_path)) {
      this._files[file_path] = new Collector();
    }

    this._files[file_path].add(callback);
  },
  remove: function(file_path, callback) {
    if (this.has(file_path)) {
      this._files[file_path].remove(callback);
    }
  },
  has : function(file_path) {
    return this._files.hasOwnProperty(file_path);
  },
  get : function(file_path) {
    if ( ! this.has(file_path)) {
      return [];
    }
    
    return this._files[file_path].getAll();
  },
};

/**
*  @param {string} file_path
*  @param {function()} callback
*  @return watch;
*/
function on (file_path, callback) {
  if (arguments.length < 2) {
    throw new Error('Param missing');
  }

  watching_files.add(file_path, callback);
  watcher.watch(file_path);
  return this;
};

function off (filepath, callback) {}

watcher.changed(function(arr_file_list) {
  arr_file_list.forEach(function(file_name) {
    watching_files.get(file_name).forEach(function(cb) {
      cb(file_name);
    });
  });
});

var watch = {
  on : on,
  off : off,
  isFile : isFile,
  isDir : isDir,
};

module.exports = watch;
