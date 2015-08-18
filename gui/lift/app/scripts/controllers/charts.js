var app = angular.module('liftApp');

app.controller('ChartsCtrl', ['$scope', '$location', 'selectedPatient', function ($scope, $location, selectedPatient) {
  $scope.patient = selectedPatient;

  var randGlucose = function() {
    return 140 + Math.floor((Math.random() * 60));
  };

  var randTemp = function() {
    return 97.0 + (Math.random() * 4);
  };


  var getDate = function(daysBehind, time) {
    var date = new Date();
    date.setDate(date.getDate() - daysBehind);
    date.setHours(time);
    date.setMinutes(0);
    date.setSeconds(0);
    return date;
  };

  var getData = function(day, time) {
    return {
      date: getDate(day, time),
      glucose: [randGlucose(), randGlucose()+10],
      temp: [randTemp()],
      medicines: [
        {
           name: 'Aspirin 100mg',
           value: Math.floor(Math.random() * 2),
           dosage: '1 tablet'
        },{
          name: 'Istamet',
          value: 1,
          dosage: '1 tablet'
        }, {
          name: 'Olmezest',
          value: Math.floor(Math.random() * 2),
          dosage: '1 tablet'
        }
      ]
    }
  };
  var generateData = function(totalNumberOfDays) {
      var data = [];
      for (var i=totalNumberOfDays-1; i>=0; i--) {
        data.push(getData(i,9));
        data.push(getData(i,12));
        data.push(getData(i,18));
      }
    data.firstMonitorName = "Temperature";
    data.secondMonitorName = "Glucose";
    data.maxGlucose = 210;
    data.minGlucose = 150;
    data.maxTemp = 103;
    data.minTemp = 96;
    return data;
  };


  $scope.chartData = [];

  if($scope.patient.monitor) {

    if($scope.patient.monitor.glucose) {
      var data = generateData(5);
      data.name = "Glucose";
      $scope.chartData.push(data);
    }
    /*if($scope.patient.monitor.bloodPressure) {
      data = generateData(5);
      data.name = "Blood Pressure";
      $scope.chartData.push(data);
    }*/
  }

  $scope.onChangeMax = function() {
    console.log($scope.chartData);
  }
}]);
