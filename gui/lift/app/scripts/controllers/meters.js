'use strict';

angular.module('liftApp')
    .controller('MetersCtrl', ['$scope', function ($scope) {

      $scope.events = [
        {
          date: '11/14/2012 02:00PM',
          event: 'Follow up checkup with Dr. Russel (Cardiologist)'
        },
        {
          date: '11/14/2012 08:00AM',
          event: 'Amelodopine 10mg'
        },
        {
          date: '11/14/2012 06:00AM',
          event: 'Light Jogging'
        },
        {
          date: '11/15/2012 09:00AM',
          event: 'Physical Therapy Session with Dr. Santos(PT)'
        },
        {
          date: '11/15/2012 08:00AM',
          event: 'Metformin 50mg'
        }
      ];
    }]);
