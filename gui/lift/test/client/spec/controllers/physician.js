'use strict';

describe('Controller: PhysicianCtrl', function () {

  // load the controller's module
  beforeEach(module('liftApp'));

  var PhysicianCtrl,
    scope;


  var patients = [{},{}];
  var newPatient = {
    id: 3,
    name: 'Test Patient',
    firstName: 'Test',
    lastName: 'Patient',
    address: 'Address 1',
    gender: 'male',
    dateOfBirth: new Date(),
    phoneNumber: '1111',
    email: 'san@san.com'
  };

  var addedPatients = [{},{},newPatient];
  var fakeModalInstance = {
    result: {
      then: function(confirmCB, cancelCB) {
        this.confirmCallback = confirmCB;
        this.cancelCallback = cancelCB;
      }
    },
    close: function(item) {
      patients.push(newPatient);
      this.result.confirmCallback(item);
    },
    dismiss: function(type) {
      this.result.cancelCallback(type);
    }
  };

  var patientServiceMock, $timeout, $q;


  beforeEach(function(){
    patientServiceMock = jasmine.createSpyObj('PatientService',['getPatientsForPhysician', 'addPatient']);
  });

  beforeEach(inject(function($modal) {
    spyOn($modal, 'open').andReturn(fakeModalInstance);
  }));

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope, _$modal_, $q,_$timeout_) {
    scope = $rootScope.$new();
    patientServiceMock.getPatientsForPhysician.andReturn($q.when(patients));
    patientServiceMock.addPatient.andReturn($q.when(patients));
    $timeout = _$timeout_;
    PhysicianCtrl = $controller('PhysicianCtrl', {
      $scope: scope,
      $modal: _$modal_,
      PatientService: patientServiceMock
    });
  }));

  it('the controller is initialized properly', function ($q) {

    expect(patientServiceMock.getPatientsForPhysician).toHaveBeenCalled();
    $timeout.flush();
    expect(scope.patients.length).toBe(2);
    expect(scope.patient).toBeDefined();
  });

  it ('should cancel the dialog when dismiss is called', function() {
    expect( scope.canceled ).toBeUndefined();
    expect(scope.patient.firstName).toBeUndefined();
    scope.patient.firstName = 'Test';
    scope.openDialog();
    scope.modalInstance.dismiss('cancel');
    expect( scope.canceled ).toBe( true );
  });

  it ('should add a user to the list of patients after the dialog is dismissed', function() {
    expect(scope.patient.firstName).toBeUndefined();
    expect(patientServiceMock.getPatientsForPhysician).toHaveBeenCalled();
    $timeout.flush();
    expect(scope.patients.length).toBe(2);
    scope.openDialog();
    scope.modalInstance.close(newPatient);
    expect(patientServiceMock.addPatient).toHaveBeenCalled();
    $timeout.flush();
    expect(scope.patients.length).toBe(3);
    expect(scope.patients[2].name).toBe('Test Patient');
    expect(scope.patients[2].id).toBe(3);
  })


});
