'use strict';

describe('Controller: MetersCtrl', function () {

  // load the controller's module
  beforeEach(module('liftApp'));

  var MetersCtrl,
    scope,
    $httpBackend;

  // Initialize the controller and a mock scope
  beforeEach(inject(function (_$httpBackend_, $controller, $rootScope) {
    scope = $rootScope.$new();
    MetersCtrl = $controller('MetersCtrl', {
      $scope: scope
    });
  }));

  it('should attach a list of awesomeThings to the scope', function () {
    expect(scope.events).toBeDefined();
    expect(scope.events.length).toBe(5);
  });
});
