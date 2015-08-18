'use strict';

angular.module('liftApp')
    .controller('MedicineCtrl', ['$scope', function ($scope) {
      $scope.activeMedicines = [
        {
          drugName: 'Metformin',
          dosage: '500 mg 2-3 times daily',
          classification: 'Anti Diabetic agents'
        },
        {
          drugName: 'Amidiopine',
          dosage: '2.5 mg once daily',
          classification: 'Calcium Antagonist'
        },
        {
          drugName: 'Catapres',
          dosage: '75-150 mgc twice daily',
          classification: 'Anti Hypertensive'
        },
        {
          drugName: 'Metopolol',
          dosage: '50-100 mg once daily',
          classification: 'Beta Blockers'
        }
      ];
    }]);
