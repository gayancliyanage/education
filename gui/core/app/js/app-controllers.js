(function() {
  'use strict';

  angular.module('scCoreEducation.controllers', []).

  controller('scceNavBarCtrl', ['$scope', '$location',
    function($scope, $location) {

      $scope.isActive = function(route) {
        return route === $location.path();
      };
    }
  ]).

  controller('scceHomeCtrl', ['$scope',
    function($scope) {
      $scope.files = {};
    }
  ])

  ;

})();