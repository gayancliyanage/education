(function() {
  'use strict';

  angular.module('scdMisc.services', []).

    /**
   * Utility used to cache loaded collections and to pages through it.
   *
   * TODO: move it to misc module.
   *
   */
  factory('ScdPageCache', [

    function scdPageCacheFactory() {
      return function ScdPageCache(viewSize) {
        this.cache = [];
        this.viewSize = viewSize;
        this.viewPos = [0, 0];
        this.cursor = ''; // cursor of the last series of items added

        this.position = function() {
          return this.viewPos[0];
        };

        this.remaining = function() {
          return this.cache.length - this.viewPos[1];
        };

        this.hasMore = function() {
          if (this.remaining() > 0) {
            return true;
          }

          if ((this.viewPos[1] - this.viewPos[0]) < this.viewSize) {
            return false;
          }

          if (!this.cursor) {
            return false;
          }

          return true;
        };

        this.clear = function() {
          this.cache = [];
          this.viewPos = [0, 0];
        };

        this.add = function(items) {
          this.cache = this.cache.concat(items);
          this.cursor = items.cursor;
        };

        this.view = function() {
          return this.cache.slice(this.viewPos[0], this.viewPos[1]);
        };

        this.next = function(size) {
          size = size || this.viewSize;
          this.viewPos[0] = this.viewPos[1];
          this.viewPos[1] = Math.min(this.viewPos[1] + size, this.cache.length);
          return this.view();
        };

        this.prev = function(size) {
          size = size || this.viewSize;
          this.viewPos[1] = this.viewPos[0];
          this.viewPos[0] = Math.max(0, this.viewPos[0] - size);
          return this.view();
        };
      };
    }
  ])

  ;

})();
