/* jshint camelcase: false*/
/* global describe, beforeEach, module, it, inject, expect */

(function() {
  'use strict';

  describe('scdMisc.services', function() {
    var _;

    beforeEach(module('scdMisc.services'));

    beforeEach(inject(function($window) {
      _ = $window._;
    }));


    describe('ScdPageCache', function() {
      var ScdPageCache;

      beforeEach(inject(function(_ScdPageCache_) {
        ScdPageCache = _ScdPageCache_;
      }));


      it('should hold items', function() {
        var pages = new ScdPageCache(2);

        pages.add([1, 2]);
        expect(pages.view()).toEqual([]);
        expect(pages.next()).toEqual([1, 2]);
        expect(pages.view()).toEqual([1, 2]);
        expect(pages.next()).toEqual([]);
      });

      it('should page items', function() {
        var pages = new ScdPageCache(3);

        pages.add(_.range(6));
        expect(pages.next()).toEqual([0, 1, 2]);
        expect(pages.next()).toEqual([3, 4, 5]);
        expect(pages.prev()).toEqual([0, 1, 2]);
      });

      it('should return empty array when the cache is empty', function() {
        var pages = new ScdPageCache(2);

        expect(pages.next()).toEqual([]);
      });

      it('should return array when the cache is partially empty', function() {
        var pages = new ScdPageCache(2);

        pages.add(_.range(3));
        expect(pages.next()).toEqual([0, 1]);
        expect(pages.next()).toEqual([2]);

        pages.add([3]);
        expect(pages.next()).toEqual([3]);
      });

      it('should clear its cache', function() {
        var pages = new ScdPageCache(2);

        pages.add(_.range(2));
        pages.clear();
        expect(pages.next()).toEqual([]);
      });

      it('should save the cursor', function() {
        var pages = new ScdPageCache(2),
          collection = [];

        collection.cursor = 'some-key';
        pages.add(collection);
        expect(pages.cursor).toBe('some-key');

        collection.cursor = 'some-other-key';
        pages.add(collection);
        expect(pages.cursor).toBe('some-other-key');

        collection.cursor = '';
        pages.add(collection);
        expect(pages.cursor).toBe('');
      });

      it('should give the page position', function() {
        var pages = new ScdPageCache(2);

        pages.add(_.range(4));
        expect(pages.position()).toBe(0);

        pages.next();
        expect(pages.position()).toBe(0);

        pages.next();
        expect(pages.position()).toBe(2);

        pages.next();
        expect(pages.position()).toBe(4);
      });

      it('should give the number of items remaining ahead of the current view', function() {
        var pages = new ScdPageCache(2);

        pages.add(_.range(4));
        expect(pages.remaining()).toBe(4);

        pages.next();
        expect(pages.remaining()).toBe(2);

        pages.next();
        expect(pages.remaining()).toBe(0);
      });

    });

  });

})();
