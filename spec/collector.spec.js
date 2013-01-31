"use strict";

var Collector = require('../lib/collector');

describe('Collector', function () {
  var collector;

  beforeEach(function() {
    collector = new Collector();
  });

  it('should has the interface', function () {
    expect( typeof collector.length ).toEqual('function');
    expect( typeof collector.has ).toEqual('function');
    expect( typeof collector.getAll ).toEqual('function');
    expect( typeof collector.flush ).toEqual('function');
    expect( typeof collector.add ).toEqual('function');
    expect( typeof collector.addOne ).toEqual('function');
    expect( typeof collector.remove ).toEqual('function');
    expect( typeof collector.removeOne ).toEqual('function');
  });

  describe('can store items', function(){
    it('check an itetm is already exist', function(){
      collector.container = [1];

      expect( collector.has(0)).toBeFalsy();

      expect( collector.has(1)).toBeTruthy();
    });

    it('add one item', function(){
      collector.container = [1];
      collector.addOne(0);
      expect( collector.length()).toEqual(2);
    });

    it('get them', function(){
      collector.addOne(1);
      collector.addOne(2);
      expect( collector.getAll()).toEqual([1, 2]);
    });

    it('add many items', function(){
      collector.add(1, 2, 3, 4);
      expect( collector.length()).toEqual(4);
      expect( collector.getAll()).toEqual([1, 2, 3, 4]);
    });

    it('ignore an item is already exist', function(){
      collector.add(1, 2, 3, 4);
      expect( collector.length()).toEqual(4);

      collector.add(2, 4, 6, 8);
      expect( collector.getAll()).toEqual([1, 2, 3, 4, 6, 8]);
    });
  });

  describe('can remove items', function(){
    beforeEach(function(){
      collector.add(0, 1, 2, 3, 4);
    });
    
    it('remove one item', function(){
      collector.removeOne(2);
      expect( collector.length()).toEqual(4);
      expect( collector.getAll()).toEqual([0, 1, 3, 4]);
    });
    
    it('remove many items', function(){
      collector.remove(3, 1);
      expect( collector.length()).toEqual(3);
      expect( collector.getAll()).toEqual([0, 2, 4]);
    });
    
    it('do NOT remove non-exists items', function(){
      collector.remove('foo', '0');
      expect( collector.length()).toEqual(5);
      expect( collector.getAll()).toEqual([0, 1, 2, 3, 4]);
    });
  });
  
  describe('can flush container', function(){
    beforeEach(function(){
      collector.add(0, 1, 2, 3, 4);
    });

    it('use flush method', function(){
      expect( collector.length()).toEqual(5);
      collector.flush();
      expect( collector.length()).toEqual(0);
    });

    it('use getAll(true) method', function(){
      expect( collector.length()).toEqual(5);
      expect( collector.getAll(true)).toEqual([0, 1, 2, 3, 4]);
      expect( collector.length()).toEqual(0);
    });
  });
});

