"use strict";
function Collector () {
  this.container = [];
}

Collector.prototype.length = function(item) {
  return this.container.length;
};

Collector.prototype.has = function(item) {
  return this.container.indexOf(item) > -1;
};

Collector.prototype.getAll = function(flush) {
  var arr = this.container.slice(0)
  flush && this.flush();
  return arr;
};

Collector.prototype.flush = function() {
  return this.container = [];
};

Collector.prototype.add = function() {
  Array.prototype.slice.call(arguments, 0).forEach(function(item) {
    this.addOne(item);
  }.bind(this));
};

Collector.prototype.addOne = function(item) {
  if (this.has(item)) {
    return false;
  }

  this.container.push(item);
  return true;
};

Collector.prototype.remove = function() {
  Array.prototype.slice.call(arguments, 0).forEach(function(item) {
    this.removeOne(item);
  }.bind(this));
};

Collector.prototype.removeOne = function(item) {
  var index = this.container.indexOf(item);

  if (index !== -1) {
    this.container.splice(index, 1);
  }
};

module.exports = Collector;
