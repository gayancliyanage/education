'use strict';

var app = angular.module('liftApp');

app.service('PatientService', ['$q','PATIENTS', function ($q, PATIENTS) {
  return {
    getPatients: function () {
      var defer = $q.defer();
      var patients = PATIENTS.data.patients;
      defer.resolve(patients);
      return defer.promise;
    },

    getPatientsForPhysician: function(physicianId) {
      if(physicianId == -1)
        return this.getPatients();
      var defer = $q.defer();
      var patients = PATIENTS.data.patients;
      var result = [];
      patients.forEach(function(p) {
        if(p.physicianId === physicianId) {
          result.push(p);
        }
      });
      defer.resolve(result);
      return defer.promise;
    },


    addPatient: function (patient) {
      return PATIENTS.data.patients.push(patient);
    },

    addMedication: function (id, medication) {
      var defer = $q.defer();
      this.getPatientById(id).then(function(patient) {
        if (patient) {
          patient.prescriptions.push(medication);
          defer.resolve(patient);
        }
      });
      return defer.promise;
    },

    updateMonitor: function(id, data) {
      var defer = $q.defer();
      this.getPatientById(id).then(function(patient){
        console.log(patient);
        if(patient) {
          patient.monitor = patient.monitor || {};
          patient.monitor[data.type] = data.value;
          defer.resolve(patient);
        }
      });
      return defer.promise;
    },

    getPatientById: function (id) {
      var defer = $q.defer();
      var patients = PATIENTS.data.patients;
      var returnResult = null;
      patients.forEach(function(patient){
          if(patient.id == id) {
            returnResult = patient;
          }
      });
      defer.resolve(returnResult);
      return defer.promise;
    },

    getMedicationInformation: function (id, date) {
      return {};
    }
  }
}]);
