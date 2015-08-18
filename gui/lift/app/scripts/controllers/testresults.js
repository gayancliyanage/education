'use strict';

angular.module('liftApp')
    .controller('TestResultsCtrl', ['$scope', function ($scope) {
      $scope.testResults = [
        {
          testName: 'Urine Test',
          date: '11/14/2013',
          result: 'Normal'
        },
        {
          testName: 'Blood Test',
          date: '11/14/2013',
          result: 'Normal'
        },
        {
          testName: 'Blood Glucose Test',
          date: '11/14/2013',
          result: 'Normal'
        },
        {
          testName: 'Blood Urea Nitrogen (BUN) Test',
          date: '11/14/2013',
          result: 'Normal'
        },
        {
          testName: 'Electrocardiogram (ECG) Test',
          date: '11/12/2013',
          result: 'Normal'
        }
      ];
    }]);
