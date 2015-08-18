'use strict';

describe('Controller: SupervisorCtrl', function () {

  // load the controller's module
  beforeEach(module('liftApp'));

  var SupervisorCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    SupervisorCtrl = $controller('SupervisorCtrl', {
      $scope: scope
    });
  }));

  it('should attach a list of awesomeThings to the scope', function () {
    
  });
});
