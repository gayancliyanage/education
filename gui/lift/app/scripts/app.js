'use strict';

var app = angular.module('liftApp', [
  'ngCookies',
  'ngResource',
  'ngSanitize',
  'ngRoute',
  'ngProgress',
  'ui.calendar',
  'ui.bootstrap',
]);

app.constant('API_BASE_URL', 'api/v1');

app.config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {
  $routeProvider
      .when('/home', {
        templateUrl: 'views/home.html',
        controller: 'HomeCtrl'
      })
      .when('/medicine', {
        templateUrl: 'views/medicine.html',
        controller: 'MedicineCtrl'
      })
      .when('/testResults', {
        templateUrl: 'views/testResults.html',
        controller: 'TestResultsCtrl'
      })
      .when('/history', {
        templateUrl: 'views/history.html',
        controller: 'HistoryCtrl'
      })
      .when('/meters', {
        templateUrl: 'views/meters.html',
        controller: 'MetersCtrl'
      })
      .when('/clinician', {
        templateUrl: 'views/clinician.html',
        controller: 'ClinicianCtrl'
      })
      .when('/', {
        templateUrl: 'views/login.html',
        controller: 'LoginCtrl'
      })
      .when('/physician', {
        templateUrl: 'views/physician.html',
        controller: 'PhysicianCtrl'
      })
      .when('/supervisor', {
        templateUrl: 'views/physician.html',
        controller: 'SupervisorCtrl'
      })
      .when('/patients/:patient_id', {
        templateUrl: 'views/patients.html',
        controller: 'PatientsCtrl',
        resolve: {
          selectedPatient: ['$route', 'PatientService', function ($route, PatientService) {
            var patientId = $route.current.params.patient_id
            return PatientService.getPatientById(patientId);
          }]
        }
      })
      .when('/patients/:patient_id/charts', {
        templateUrl: 'views/charts.html',
        controller: 'ChartsCtrl',
        resolve: {
          selectedPatient: ['$route', 'PatientService', function ($route, PatientService) {
            var patientId = $route.current.params.patient_id;
            return PatientService.getPatientById(patientId);
          }]
        }
      })
      .otherwise({
        redirectTo: '/'
      });

//  $locationProvider.html5Mode(true);
}]);
