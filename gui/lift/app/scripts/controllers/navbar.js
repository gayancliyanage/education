'use strict';

angular.module('liftApp')
    .controller('NavbarCtrl', ['$scope', '$location', function ($scope, $location) {
      $scope.menu = [
        {
          'title': 'Overview',
          'link': '/'
        },
        {
          'title': 'Health Meters',
          'link': '/meters'
        },
        {
          'title': 'Medicine',
          'link': '/medicine'
        },
        {
          'title': 'History',
          'link': '/history'
        },
        {
          'title': 'Test Results',
          'link': '/testResults'
        },
        {
          'title': 'Physician',
          'link': '/physician'
        }
      ];

      $scope.isActive = function (route) {
        return route === $location.path();
      };
      $scope.users = [
        {
          name: 'Melba Brewster',
          username: 'melba'
        },
        {
          name: 'Harriett Hodges',
          username: 'hhodges'
        },
        {
          name: 'Thomas Frost',
          username: 'tfrost'
        },
        {
          name: 'Diane Sparks',
          username: 'sparks231'
        }
      ];
      $scope.activeUser = $scope.users[0];

      $scope.chooseUser = function (user) {
        $scope.activeUser = user;
      };
    }]);
