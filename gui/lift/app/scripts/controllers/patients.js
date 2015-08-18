'use strict';

angular.module('liftApp')
  .controller('PatientsCtrl', ['$scope', '$routeParams', '$filter','selectedPatient', function ($scope, $routeParams, $filter, selectedPatient) {
      $scope.patient = selectedPatient;
      $scope.day = "Yesterday";
      $scope.today = new Date();
      $scope.dateStr = $filter('date')($scope.today, "yyyyMMdd");
      $scope.feelingOptions = ['Bad', 'Good', 'Great', 'Uncomfortable', 'Tired', 'Sleepy', 'Nauseous', 'Other'];
      $scope.status = 'Good';
      $scope.statusOther = '';

      var buildAllPrescriptions = function() {
        var result = {};
        var today = new Date();
        var yesterday = new Date();
        yesterday.setDate(yesterday.getDate()-1);
        var yString = $scope.dateStr = $filter('date')(yesterday, "yyyyMMdd");
        var tString = $scope.dateStr = $filter('date')(today, "yyyyMMdd");
        var p1 = buildPrescription(yString);
        result[yString] = p1;
        var p2 = buildPrescription(tString);
        result[tString] = p2;
        return result;
      };

      function createPrescription(date, prescription) {
        var p = {};
        p.date = date;
        p.taken = 'not-taken';
        p.type = prescription.type;
        p.name = prescription.name;
        p.id = prescription.id;
        if (prescription.type == 'data') {
          p.value = prescription.range.start;
          p.optionData = [];
          for (var i= p.value; i<prescription.range.end;i++) {
            p.optionData.push(i);
          }
        } else {
          p.optionData = [];
          p.optionData.push('Taken');
          p.optionData.push('Not Taken');
          p.optionData.push('Previously Taken at');
          p.value = 'Not Taken';
          p.time = new Date();
        }
        return p;
      }

      var buildPrescription = function(date) {
        var result = [];
        var morning = {name:'Morning', medications: []};
        var afternoon = {name:'Afternoon', medications: []};
        var evening = {name:'Evening', medications: []};
        var prescriptions = $scope.patient.prescriptions;
        angular.forEach(prescriptions, function(prescription){
          var schedule = prescription.schedule;
          if (angular.isArray(schedule)) {

            if (schedule[0] == 1) {
              var p = createPrescription(date, prescription);
              morning.medications.push(p);
            }
            if (schedule[1] == 1) {
              p = createPrescription(date, prescription);
              afternoon.medications.push(p);
            }

            if (schedule[2] == 1) {
              p = createPrescription(date, prescription);
              evening.medications.push(p);
            }

          }
        });

        result.push(morning);
        result.push(afternoon);
        result.push(evening);
        return result;
      };


      $scope.prescriptions = buildAllPrescriptions();


      $scope.selectedPrescriptions = $scope.prescriptions[$scope.dateStr];


      $scope.toggleDay = function() {
        var currentType = $scope.day;
        $scope.day = (currentType == 'Yesterday') ? 'Today' : 'Yesterday';
        var date = new Date();
        date.setDate(date.getDate()-1);
        $scope.today = (currentType == 'Yesterday') ? date : new Date();
        $scope.dateStr = $filter('date')($scope.today, "yyyyMMdd");
        $scope.selectedPrescriptions = $scope.prescriptions[$scope.dateStr];
      }

      $scope.updateMedicineInfo = function(medication, input) {
         medication.taken = input;
      }
  }]);
