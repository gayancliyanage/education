/* jshint camelcase: false*/
/* global describe, beforeEach, it, inject, expect */

(function() {
  'use strict';

  describe('scceSvg.services', function() {

    beforeEach(module('scceSvg.services'));


    describe('ScceLayout', function() {
      var Layout;

      beforeEach(inject(function(ScceLayout) {
        Layout = ScceLayout;
      }));

      it('should have default', function() {
        expect(new Layout()).toEqual({
          width: 400,
          height: 300,
          margin: {
            top: 10,
            right: 10,
            bottom: 10,
            left: 10
          },
          innerHeight: 280,
          innerWidth: 380
        });
      });

      it('should build layout from content size', function() {
        expect(Layout.contentSizing({
          innerWidth: 100,
          innerHeight: 80,
          margin: {
            bottom: 50,
            left: 80
          }
        })).toEqual({
          width: 190,
          height: 140,
          margin: {
            top: 10,
            right: 10,
            bottom: 50,
            left: 80
          },
          innerHeight: 80,
          innerWidth: 100
        });
      });

      it('should build layout from content and margin size', function() {
        expect(Layout.boxSizing({
          width: 200,
          height: 180,
          margin: {
            bottom: 50,
            left: 80
          }
        })).toEqual({
          width: 200,
          height: 180,
          margin: {
            top: 10,
            right: 10,
            bottom: 50,
            left: 80
          },
          innerWidth: 110,
          innerHeight: 120
        });
      });



    });


  });

})();