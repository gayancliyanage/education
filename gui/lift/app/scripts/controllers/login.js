'use strict';

var app = angular.module('liftApp');

app.controller('LoginCtrl', ["$rootScope", "$scope" , "$location", "$timeout", function ($rootScope, $scope, $location, $timeout) {
  $scope.users = [
    {
      name: 'Supervisor',
      type: 'supervisor',
      id: -1
    },
    {
      name: 'Physician 1',
      type: 'physician',
      id: 1
    },
    {
      name: 'Physician 2',
      type: 'physician',
      id: 2
    },
    {
      name: 'Physician 3',
      type: 'physician',
      id: 3
    },
    {
      name: 'Patient 1',
      type: 'patient',
      id: 1
    },
    {
      name: 'Patient 2',
      type: 'patient',
      id: 2
    }
  ];

  $scope.login = function (userId, type) {
    $rootScope.loggedInUserId = userId;
    $rootScope.userType = type;
    if(type == 'physician') {
      $timeout(function () {
        $location.url("physician/", true);
      }, 100);
    } else if(type == 'patient'){
      $timeout(function(){
        $location.url("patients/"+userId+"/", true);
      }, 100);
    } else if(type == 'supervisor'){
      $timeout(function(){
        $location.url("physician/", true);
      }, 100);
    }


  };
}]);
