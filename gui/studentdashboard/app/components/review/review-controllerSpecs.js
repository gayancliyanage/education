/* jshint camelcase: false*/
/* global describe, beforeEach, module, it, inject, expect */

(function() {
  'use strict';

  describe('scdReview.controllers', function() {
    var _;

    beforeEach(module('scdReview.controllers'));

    beforeEach(inject(function($window) {
      _ = $window._;
    }));


    it('should have test', function() {
      expect(true).toBe(true);
    });

  });

})();
