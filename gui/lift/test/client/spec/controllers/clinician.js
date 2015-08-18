'use strict';

describe('Controller: ClinicianCtrl', function () {

  // load the controller's module
  beforeEach(module('liftApp'));

  var ClinicianCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function (_$httpBackend_, $controller, $rootScope) {
    scope = $rootScope.$new();
    ClinicianCtrl = $controller('ClinicianCtrl', {
      $scope: scope
    });
  }));

});
