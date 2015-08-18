(function() {
  'use strict';


  angular.module('scdChart.directives', [
    'scdSvg.directives',
    'scdMisc.filters'
  ]).

  service('scdChartArc', ['$window',
    function scdChartArcFactory($window) {
      var d3 = $window.d3;

      return function scdChartArc(radius) {
        return d3.svg.arc()
          .startAngle(function(d) {
            return d.startAngle;
          })
          .endAngle(function(d) {
            return d.endAngle;
          })
          .innerRadius(radius.inner || 0)
          .outerRadius(radius.outer);
      };
    }
  ]).

  /**
   * Meter directive
   *
   * Usage:
   *
   *   <scd-chart-meter
   *     scd-layout="layout"
   *     scd-levels="levels"
   *     scd-reading="reading"
   *   ></scd-chart-meter>
   *
   * Where:
   *
   * - layout would be an layout object
   *   (width, height and magin attribute)
   * - levels would be an array of levels for the meter
   *   eg: [{id: 'danger', min: 0, max: 60}, {id: 'ok', max: 100}]
   * - reading would and object with value, unit and label properties.
   *   eg: {unit: '%', label: "Perecentage Completed", value: 65}
   */
  directive('scdChartMeter', [
    '$window',
    'scdChartArc',
    function scdChartMeterFactory($window, scdChartArc) {
      var d3 = $window.d3,
        _ = $window._;

      return {
        templateUrl: 'views/scdashboard/charts/meter.html',
        restrict: 'E',
        scope: {
          'layout': '=scdLayout',
          'donutWidth': '&scdDonut',
          'levels': '=scdLevels',
          'reading': '=scdReading',
          'options': '=?scdOptions'
        },
        // arguments: scope, iElement, iAttrs, controller
        link: function scdChartMeterPostLink(scope) {
          scope.options = scope.options || {};
          _.defaults(scope.options, {
            getValueAsText: function(reading) {
              if (reading.value === null) {
                return 'N/A';
              } else {
                return reading.value + ' ' + reading.unit;
              }
            },
          });
          scope.scales = {
            degres: null
          };

          function setScales() {
            var min, max;

            scope.scales.degres = d3.scale.linear();
            if (!scope.layout || !scope.levels) {
              return;
            }

            min = scope.levels[0].min;
            max = scope.levels.slice(-1).pop().max;
            scope.scales.degres.domain([min, max]);
            scope.scales.degres.range([0, 180]);
          }


          scope.radius = {};
          scope.levelArc = angular.noop;

          function setRadius() {
            var donutWidth = scope.donutWidth() || 15;

            scope.radius = {};
            if (!scope.layout) {
              return;
            }

            scope.radius.outer = scope.layout.innerWidth / 2;
            if (scope.radius.outer > scope.layout.innerHeight) {
              scope.radius.outer = scope.layout.innerHeight;
            }

            scope.radius.inner = scope.radius.outer - donutWidth;
            scope.levelArc = scdChartArc(scope.radius);
          }

          scope.levelSlices = [];

          function setLevelSlices() {
            var slicesData;

            scope.levelSlices = [];
            if (scope.levels.length < 1) {
              return;
            }

            slicesData = _.reduce(scope.levels, function(data, level) {
              if (level.min === undefined) {
                level.min = data.slice(-1).pop().max;
              }

              data.push({
                id: level.id,
                label: level.label || level.id,
                value: level.max - level.min,
                max: level.max
              });

              return data;
            }, []);

            scope.levelSlices = d3.layout.pie().sort(null).value(function(d) {
              return d.value;
            }).startAngle(-Math.PI / 2).endAngle(Math.PI / 2)(slicesData);
          }

          scope.$watch('layout', setRadius);
          scope.$watch('layout', setScales);
          scope.$watch('levels', setScales);
          scope.$watch('levels', setLevelSlices);
        }
      };
    }
  ]).

  /**
   * scdChartComponents
   *
   * Usage:
   *
   *    <scd-chart-components
   *      scd-layout="layout"
   *      scd-main-data="main"
   *      scd-components="components"
   *     >
   *     </scd-chart-components>
   *
   * Where:
   * - main would be the main stats to show (with label, unit and value
   *   attribute)
   * - components should decompose the main stats. It would be array of object
   *   with id, label and value attribute.
   *
   */
  directive('scdChartComponents', [
    '$window',
    'scdChartArc',
    function scdChartComponentsFactory($window, scdChartArc) {
      var d3 = $window.d3;

      function shifterFactory(arc) {
        return function shifter(slice, margin) {
          var c = arc.centroid(slice),
            x = c[0],
            y = c[1],
            h = Math.sqrt(x * x + y * y);

          return 'translate(' +
            (x / h * margin) + ',' +
            (y / h * margin) +
            ')';
        };
      }

      return {
        templateUrl: 'views/scdashboard/charts/components.html',
        restrict: 'E',
        scope: {
          'layout': '=scdLayout',
          'mainData': '=scdMainData',
          'components': '=scdComponents'
        },
        // arguments: scope, iElement, iAttrs, controller
        link: function scdChartComponentsPostLink(scope) {

          function setHelpers() {
            var radius = {},
              labelMargin;

            scope.arc = scope.shiftSlice = angular.noop;
            scope.shiftLabel = scope.onLeftCenter = angular.noop;
            if (!scope.layout) {
              return;
            }

            if (scope.layout.innerWidth > scope.layout.innerHeight) {
              radius.outer = scope.layout.innerHeight / 2;
            } else {
              radius.outer = scope.layout.innerWidth / 2;
            }

            scope.arc = scdChartArc(radius);
            scope.shiftSlice = shifterFactory(scope.arc);

            labelMargin = radius.outer + scope.layout.margin.bottom / 2;
            scope.shiftLabel = function shiftLabel(slice, margin) {
              margin = (margin || 0) + labelMargin;

              return scope.shiftSlice(slice, margin);
            };

            scope.onLeftCenter = function onLeftCenter(slice) {
              return (slice.endAngle + slice.startAngle) / 2 > Math.PI;
            };

          }

          function setSlices() {
            scope.slices = [];
            if (!scope.components) {
              return;
            }

            scope.slices = d3.layout.pie().sort(null).value(function(d) {
              return d.value;
            })(scope.components);
          }

          scope.$watch('layout', setHelpers);
          scope.$watch('components', setSlices);
        }
      };
    }
  ]).

  /**
   * Show the progression of a stats over time.
   *
   * usage:
   *
   *    <scd-chart-history
   *      scd-layout="layout"
   *      scd-series="series"
   *      scd-ref="ref"
   *      scd-current="current"
   *      scd-options="options"
   *      scd-legend="legend"
   *     >
   *    </scd-chart-history>
   *
   * Where:
   * - `series` should be an array of object with date and value properties,
   *   sorted by chronologic order.
   * - `ref` an object to compare to. It should have a lable and
   *    value properties
   * - `current` should be the current value of the stats. It should have
   *   a label and value property
   * - `options` can define alternive way to extract the value and date out
   *   of the series array. It may have a getValue and getDate properties that
   *   take as argument an item of the series array and return respectively
   *   its value and date.
   * - `legend` should be an object with a y property. Used for the y axis
   *   legend.
   *
   */
  directive('scdChartHistory', [
    '$window',
    function scdChartHistoryFactory($window) {
      var d3 = $window.d3,
        _ = $window._;

      return {
        templateUrl: 'views/scdashboard/charts/history.html',
        restrict: 'E',
        scope: {
          'layout': '=scdLayout',
          'series': '=scdSeries',
          'ref': '=scdRef',
          'current': '=scdCurrent',
          'legend': '=scdLegend',
          'options': '=scdOptions'
        },
        // arguments: scope, iElement, iAttrs, controller
        link: function scdChartHistoryPostLink(scope) {
          scope.ticksFormatter = d3.time.format('%b %y');
          scope.options = scope.options || {};
          _.defaults(scope.options, {
            getValue: function(day) {
              return day.value;
            },
            getDate: function(day) {
              return new Date(day.date);
            },
            domain: [0, 100],
            unit: '%'
          });

          function setScales() {
            scope.xTicks = [];
            scope.scales = {
              x: null,
              y: null,
              yReversed: null
            };

            if (!scope.layout && !scope.series) {
              return;
            }

            scope.scales.x = d3.scale.ordinal();
            scope.scales.y = d3.scale.linear();

            // setup scale domains
            scope.scales.y.domain(scope.options.domain);
            scope.series.forEach(function(day) {
              scope.scales.x(
                scope.options.getDate(day)
              );
            });

            // setup scale ranges
            scope.scales.yReversed = (
              scope.scales.y.copy().range([scope.layout.innerHeight, 0])
            );
            scope.scales.y.range([0, scope.layout.innerHeight]);
            scope.scales.x.rangeBands(
              [0, scope.layout.innerWidth], 0, 0
            );

            // Set x ticks
            scope.xTicks = _.range(1, 4).map(function(i) {
              return  scope.series[Math.round(i*scope.series.length/4)];
            }).map(scope.options.getDate);
          }

          scope.$watch('layout', setScales);
          scope.$watch('series', setScales);
        }
      };
    }
  ]).

  /**
   * Histogram chart
   *
   * Usage:
   *
   *     <scd-chart-histogram
   *       scd-layout="ctrl.performances.byCategory.layout"
   *       scd-series="ctrl.performances.byCategory.series"
   *       scd-options="ctrl.performances.byCategory.options"
   *       scd-legend="{x: 'Score (%)'}"
   *     >
   *     </scd-chart-histogram>
   *
   * Where:
   * - series is an array of object with label, value, unit and ref properties.
   * - legend is an object with `x` property, used to label the bottom axis.
   * - options is an object with `getLabel`, `hasRef`, `getRef`, `getUnit`,
   *   `getValue` and `isFailing`. They are use to extract data out of each
   *   series item.
   *
   */
  directive('scdChartHistogram', [
    '$window',
    function scdChartHistogramFactory($window) {
      var _ = $window._,
        d3 = $window.d3;

      return {
        templateUrl: 'views/scdashboard/charts/histogram.html',
        restrict: 'EA',
        scope: {
          layout: '=scdLayout',
          legend: '=scdLegend',
          options: '=scdOptions',
          ref: '=scdRef',
          series: '=scdSeries',
          onClick: '=scdRowClicked'
        },
        // arguments: scope, iElement, iAttrs, controller
        link: function scdChartHistogramPostLink(scope) {
          scope.scales = {};
          scope.options = scope.options || {};
          _.defaults(scope.options, {
            domain: [0, 100],

            // default row data extractor
            getLabel: function(row) {
              return row.label;
            },
            hasRef: function(row) {
              return !!this.getRef(row);
            },
            getRef: function(row) {
              return row.ref;
            },
            getUnit: function(row) {
              return row.unit;
            },
            getValue: function(row) {
              return row.value;
            },
            getValueAsString: function(row) {
              return scope.options.getValue(row) + ' ' + scope.options.getUnit(row);
            },
            isFailing: function(row) {
              // reference value can be global or per row
              var ref = scope.ref || this.getRef(row),
                value = this.getValue(row);

              return ref && ref.value > value;
            }
          });

          function setHistogramScales() {
            scope.scales.x = null;
            scope.scales.y = null;
            if (!scope.layout || !scope.series) {
              return;
            }

            // init scales
            scope.scales.x = d3.scale.linear();
            scope.scales.y = d3.scale.ordinal();

            // set domain
            if (angular.isArray(scope.options.domain)) {
              scope.scales.x.domain(scope.options.domain);
            } else {
              scope.scales.x.domain(scope.options.domain(scope.series));
            }
            scope.scales.y.domain(_.map(scope.series, 'id'));

            // set ranges
            scope.scales.x.range([0, scope.layout.innerWidth]);
            scope.scales.y.rangeBands([0, scope.layout.innerHeight], 0, 0);
          }

          scope.$watch('layout', setHistogramScales);
          scope.$watch('series', setHistogramScales);
        }
      };
    }
  ])

  ;

})();
