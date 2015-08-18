'use strict';

describe('Controller: PatientsCtrl', function () {

  // load the controller's module
  beforeEach(module('liftApp'));

  var selPatient =
  {
    id: 1,
    firstName: 'Patient',
    lastName: 'One',
    name: 'Patient One',
    address: 'Address of the user',
    dateOfBirth: new Date(),
    gender: 'male',
    phoneNumber: '12345678901',
    emailAddress: 'patient1@somewhere.com',
    prescriptions: [
      {
        id: 1,
        name: 'Amoxicillin',
        type: 'tablet',
        quantity: 60,
        dose: 1,
        schedule: [1, 0, 1],
        date: new Date()
      },
      {
        id: 2,
        name: 'Doxycycline 100 mg',
        type: 'capsule',
        quantity: 60,
        dose: 1,
        schedule: [0, 0, 1],
        date: new Date()
      },
      {
        id: 3,
        name: 'Cycloproxyvon 100 mg',
        type: 'capsule',
        quantity: 60,
        dose: 1,
        schedule: [1, 1, 1],
        date: new Date()
      },
      {
        id: 4,
        name: 'Monitor Glucose',
        schedule: [1, 0, 1],
        type: 'data',
        date: new Date(),
        range: {
          start: 80,
          end: 500
        }
      },
      {
        id: 5,
        name: 'Monitor Temperature',
        schedule: [1, 1, 1],
        type: 'data',
        date: new Date(),
        range: {
          start: 90,
          end: 110
        }
      }
    ]
  };
  var PatientsCtrl,
      scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    PatientsCtrl = $controller('PatientsCtrl', {
      $scope: scope,
      selectedPatient: selPatient
    });
  }));

  it('should attach a list of awesomeThings to the scope', function () {
      expect(scope.patient).toBeDefined();
      expect(scope.patient.id).toBe(1);
      expect(scope.day).toBe("Yesterday");
  });

  it('should toggle the days accordingly', function() {
    expect(scope.day).toBe("Yesterday");
    scope.toggleDay();
    expect(scope.day).toBe("Today");
  })
});
