'use strict';

angular.module('liftApp')
  .controller('SupervisorCtrl', ['$scope','PatientService',function ($scope, PatientService) {
    var getPatients = function() {
      PatientService.getPatients().then(function (patients) {
        $scope.patients = patients;
      });
    };

    getPatients();

  }]);
