(function() {
  'use strict';

  angular.module('scceSvg.services', []).

  /**
   * Return a Layout object constructor.
   *
   * A Layout object has the following properties:
   * - `width` and `height`, to represent the svg total width and height
   * - `margin`, to represent the dimensions of the margin around the main
   * svg feature. For a chart it would contain the scales, legend, titles,
   * etc...
   * - `innerWdith` and `innerHeight` to represent the dimensions of the svg
   * main feature.
   *
   * ScceLayout includes 2 method to build the layout from
   * the content size (`ScceLayout.contentSizing`) or from the
   * box size (`ScceLayout.boxSizing`).
   *
   */
  factory('ScceLayout', ['$window',
    function($window) {
      var _ = $window._;

      function Layout(opts) {
        opts = opts || {};

        _.defaults(opts, {
          width: 400,
          height: 300,
          margin: {}
        });

        _.defaults(opts.margin, {
          top: 10,
          right: 10,
          bottom: 10,
          left: 10,
        });

        _.assign(this, opts);

        // Calculate inner height and width
        this.innerHeight = this.height - this.margin.top - this.margin.bottom;
        this.innerWidth = this.width - this.margin.right - this.margin.left;
      }

      Layout.contentSizing = function(opts) {
        opts = opts || {};

        _.defaults(opts, {
          innerWidth: 400,
          innerHeight: 300,
          margin: {}
        });

        _.defaults(opts.margin, {
          top: 10,
          right: 10,
          bottom: 10,
          left: 10,
        });

        return new Layout({
          height: opts.innerHeight + opts.margin.top + opts.margin.bottom,
          width: opts.innerWidth + opts.margin.right + opts.margin.left,
          margin: opts.margin
        });
      };

      Layout.boxSizing = function(opts) {
        return new Layout(opts);
      };

      return Layout;
    }
  ])


  ;

})();