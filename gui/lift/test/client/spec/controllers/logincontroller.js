'use strict';

describe('Controller: LoginCtrl', function () {

  // load the controller's module
  beforeEach(module('liftApp'));

  var LogincontrollerCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    LogincontrollerCtrl = $controller('LoginCtrl', {
      $scope: scope
    });
  }));

  it('should attach a list of awesomeThings to the scope', function () {
  });
});
