"use strict";

var check_interval = 3000;
var rmdir_timeout = 1000;

var fs = require('fs'),
  path = require('path'),
  watch = require('../index.js'),
  rmdir = require('rmdir');


var tmp_dir = __dirname;
var createFile = function(f, callback) {
  fs.writeFile(f, '',  function(err) {
    if (err) throw err;
    callback && callback();    
  });
};


describe('watch', function () {
  it('should has these interface', function () {
    expect( typeof watch.on ).toEqual('function');
    expect( typeof watch.off ).toEqual('function');
  });
});

describe('watch', function () {
  it('can watch file create', function () {
    var working_dir = tmp_dir + '/create',
      file = working_dir + '/file',
      init_done = false,
      create_done = false,
      watch_done = false,
      file_got = '',
      foo = {
      cb_create : function() {
        create_done = true;
      },
      cb_watch : function(f) {
        file_got = f;
        watch_done = true;
      },
    };

    spyOn(foo, 'cb_create').andCallThrough();
    spyOn(foo, 'cb_watch').andCallThrough();

    expect(file_got).toEqual('');

    // clean tmp files before test
    runs(function() {
      init_done = false;

      var mkdir = function() {
        fs.mkdir(working_dir, '0755', function() {
          init_done = true;
        });
      };

      fs.exists(working_dir, function (exists) {
        exists ? rmdir(working_dir, mkdir) : mkdir();
      });
    });
    waitsFor(function() {
      return init_done;
    }, 'waiting for init', rmdir_timeout);

    // test create file
    runs(function() {
      watch_done = false;
      create_done = false;

      // watch file
      watch.on(file, foo.cb_watch);
    });

    waits(check_interval);

    runs(function() {
      // create file
      fs.writeFile(file, '',  function(err) {
        if (err) throw err;
        foo.cb_create();
      });
    });

    waitsFor(function() {
      return create_done;
    }, 'wait for create', check_interval);

    runs(function() {
      expect(foo.cb_create).toHaveBeenCalled();
    });

    waitsFor(function() {
      return watch_done;
    }, 'wait for watch', check_interval);

    runs(function() {
      expect(foo.cb_watch).toHaveBeenCalled();
      expect(foo.cb_watch).toHaveBeenCalledWith(file);
      expect(file_got).toEqual(file);
    });

    // clean tmp files after test
    this.after(function() {
      fs.exists(working_dir, function (exists) {
        exists && rmdir(working_dir, function(){});
      });
    });
    
  });

  // it('watch a dir and detect create, change and delete files in a sub dir', function () {
  // });
});

