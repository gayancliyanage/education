'use strict';

var Holder = Holder || {};

var app = angular.module('liftApp');
app.directive('linechart', function () {
  return {
    template: '<div></div>',
    restrict: 'E',
    link: function postLink(scope, element) {
      element.text('this is the linechart directive');
    }
  };
});

app.directive('holderFix', function () {
  return {
    link: function (scope, element) {
      Holder.run({images: element[0], nocss: true});
    }
  };
});


app.directive('setFocus', function () {
  return {
    restrict: 'E',
    link: function (scope, element) {
      element[0].focus();
    }
  }
});


app.directive('laDataChart', function ($compile) {

  var makeId = function () {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 5; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
  };

  var classId = null;

  return {
    restrict: 'E',
    scope: {
      data: '=',
      dtype: '@'
    },
    templateUrl: 'views/charts/line.html',
    link: function (scope, element, attrs) {
      var svgC = element.children().get(0);
      if (!classId) {
        classId = "la-" + makeId();
        $(svgC).addClass(classId);
        $(svgC).select()
      }

      scope.$watch('data.maxGlucose', function () {
        renderGraph();
      });
      scope.$watch('data.minGlucose', function () {
        renderGraph();
      });

      scope.$watch('data.maxTemp', function () {
        renderGraph();
      });
      scope.$watch('data.minTemp', function () {
        renderGraph();
      });

      var renderGraph = function () {
        if (classId) {
          var axis = $(svgC).find("svg g.axis");
          if (axis) {
            axis.empty();
          }
        }
        var svg = d3.select("." + classId + " svg g");
        scope.graph = {width: 800, height: 350};
        scope.layout = {top: 40, right: 40, bottom: 40, left: 40};
        scope.totalWidth = scope.graph.width + scope.layout.left + scope.layout.right;
        scope.totalHeight = scope.graph.height + scope.layout.top + scope.layout.bottom;

        var x = d3.time.scale().rangeRound([0, scope.graph.width]);

        x.domain(d3.extent(scope.data, function (d) {
          return d.date;
        }));


        var m = d3.max(scope.data, function (d) {
          var max = d3.max(d3.entries(d.glucose), function (d) {
            return d.value;
          });
          return max;
        });


        var maxGlucose = Math.max(m, scope.data.maxGlucose) + 20;


        m = d3.min(scope.data, function (d) {
          var min = d3.min(d3.entries(d.glucose), function (d) {
            return d.value;
          });
          return min;
        });

        var minGlucose = Math.min(m, scope.data.minGlucose) - 20;


        scope.meanGlucose = d3.mean(scope.data, function (d) {
          var mean = d3.mean(d3.entries(d.glucose), function (d) {
            return d.value;
          });
          return mean;
        });

        m = d3.max(scope.data, function (d) {
          var max = d3.max(d3.entries(d.temp), function (d) {
            return d.value;
          });
          return max;
        });

        var maxTemp = Math.max(m, scope.data.maxTemp) + 2;


        m = d3.min(scope.data, function (d) {
          var min = d3.min(d3.entries(d.temp), function (d) {
            return d.value;
          });
          return min;
        });

        var minTemp = Math.min(m, scope.data.minTemp) - 2;

        scope.meanTemp = d3.mean(scope.data, function (d) {
          var mean = d3.mean(d3.entries(d.temp), function (d) {
            return d.value;
          });
          return mean;
        });

        var y1 = d3.scale.linear().domain([minGlucose, maxGlucose]).range([scope.graph.height / 2, 0]);
        var y2 = d3.scale.linear().domain([minTemp, maxTemp]).range([scope.graph.height / 2, 0]);

        var leftLines = [];
        for (var i = 0; i < 2; i++) {
          var line1 = d3.svg.line().x(function (d) {
            return x(d.date)
          }).y(function (d) {
            return y1(d.glucose[i])
          }).interpolate('linear');
          leftLines.push(line1);
        }

        var rightLines = [];
        for (i = 0; i < 1; i++) {
          var line2 = d3.svg.line().x(function (d) {
            return x(d.date)
          }).y(function (d) {
            return y2(d.temp[i])
          }).interpolate('linear');
          rightLines.push(line2);
        }


        scope.glucoseMean = y1(scope.meanGlucose);
        scope.tempMean = y2(scope.meanTemp);

        scope.glucoseMax = y1(scope.data.maxGlucose);
        scope.glucoseMin = y1(scope.data.minGlucose);
        scope.tempMax = y2(scope.data.maxTemp);
        scope.tempMin = y2(scope.data.minTemp);


        var yAxis1 = d3.svg.axis()
          .scale(y1)
          .orient("left")
          .ticks(6);

        var yAxis2 = d3.svg.axis()
          .scale(y2)
          .orient("right")
          .ticks(10);

        var xAxis = d3.svg.axis()
          .scale(x)
          .orient("bottom")
          .tickPadding(8)
          .tickSize(0)
          .ticks(d3.time.hours, 6);

        //This needs to be put into the template later.

        svg.append("g").attr("class", "x axis ").attr('transform', 'translate(0,' + scope.graph.height / 2 + ')').call(xAxis);
        svg.append("g").attr("class", "y axis glucose").call(yAxis1);
        svg.append("g").attr("class", "y axis temp").attr('transform', 'translate(' + scope.graph.width + ',0)').call(yAxis2);

        scope.leftLinesPath = [];
        scope.rightLinesPath = [];
        for (i = 0; i < 2; i++) {
          var p = leftLines[i](scope.data)
          scope.leftLinesPath.push(p);
        }

        for (i = 0; i < 1; i++) {
          scope.rightLinesPath.push(rightLines[i](scope.data));
        }

        scope.glCircles = [];
        scope.tempCircles = [];
        scope.medData = [];
        var medicineCircles = {};
        //yuck
        angular.forEach(scope.data, function (d) {
          var len = d.glucose.length;

          for (var i = 0; i < len; i++) {
            var circle = {cx: x(d.date), cy: y1(d.glucose[i])};
            scope.glCircles.push(circle);
          }

          len = d.temp.length;
          for (i = 0; i < len; i++) {
            var circle = {cx: x(d.date), cy: y2(d.temp[i])};
            scope.tempCircles.push(circle);
          }
          angular.forEach(d.medicines, function (medicine, index) {
            var s = medicineCircles[medicine.name];
            if (!s) {
              s = {};
              s.name = medicine.name;
              s.dosage = medicine.dosage;
              s.data = [];
              medicineCircles[medicine.name] = s;
            }
            var className = medicine.value == 1 ? "taken" : "not-taken";
            s.data.push({className: className, cx: x(d.date)});
          });
        });

        scope.medData = medicineCircles;
      }
    }
  }

});
