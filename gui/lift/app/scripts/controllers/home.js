'use strict';

angular.module('liftApp')
    .controller('HomeCtrl', ['$scope', function ($scope) {
      $scope.meters = [
        '127',
        'Abdominal Cramps',
        'Benadryl',
        'Calories',
        'Constipation',
        'Decreased Hearing',
        'Ear Ache',
        'Ear Echo Right'
      ];
    }]);
