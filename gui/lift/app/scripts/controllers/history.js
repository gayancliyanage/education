'use strict';

angular.module('liftApp')
  .controller('HistoryCtrl', ['$scope', function ($scope) {
      $scope.history = [
        {
          date: 'December 5, 2012 6:00 PM',
          text: 'Physician changed the dosage of Amelodopine from 2.5mg to 5mg daily'
        },
        {
          date: 'November 10, 2012 5:00 PM',
          text: 'Physician order: Take blood pressure every 4 hours'
        },
        {
          date: 'November 09, 2012 6:00 PM',
          text: 'Clinical Visit: Dr. Mendez at Philippine General Hospital',
          extraInfo: 'Details...'
        },
        {
          date: 'November 5, 2012 6:00 PM',
          text: 'Physician prescribed the dosage of Amelodopine 2.5mg daily'
        }
      ];
    }]);
