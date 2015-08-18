'use strict';

var app = angular.module('liftApp');

app.filter('toHumanString', function () {
  return function (input) {
    var map = ['none', 'once', 'twice', 'thrice', 'four times', 'five times']
    var findDailySchedule = function () {
      var total = 0;
      angular.forEach(input, function (time) {
        total += time;
      });
      return map[total] + " daily";
    };

    if (angular.isArray(input)) {
      return findDailySchedule();
    } else {
      return "every " + input + " hours";
    }
  };
});

app.filter('prescriptionFor', function () {
  return function (prescriptions, timeOfDay) {
    var p = [];
    angular.forEach(prescriptions, function (prescription) {
      if (angular.isArray(prescription.schedule) && prescription.schedule[timeOfDay] == 1) {
        this.push(prescription);
      }
    }, p);
    return p;
    return prescriptions;
  }
});

app.filter('rangeFor', function() {
  return function(input, start, end) {
    var s = parseInt(start);
    var e = parseInt(end);
    for(var i=s; i<=e; i++) {
      input.push(i);
    }
    return input;
  }
});
