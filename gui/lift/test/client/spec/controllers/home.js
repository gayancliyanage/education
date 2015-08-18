'use strict';

describe('Controller: HomeCtrl', function () {

  // load the controller's module
  beforeEach(module('liftApp'));

  var HomeCtrl,
      scope,
      $httpBackend;

  // Initialize the controller and a mock scope
  beforeEach(inject(function (_$httpBackend_, $controller, $rootScope) {
    $httpBackend = _$httpBackend_;
//    $httpBackend.expectGET('/api/meters').respond(['127','Abdominal Cramps','Benadryl','Calories','Constipation','Decreased Hearing','Ear Ache','Ear Echo Right']);
    scope = $rootScope.$new();
    HomeCtrl = $controller('HomeCtrl', {
      $scope: scope
    });
  }));

  it ('should get a list of all available meters', function() {
//    expect(scope.meters).toBeUndefined();
//    $httpBackend.flush();
    expect(scope.meters).toBeDefined();
    expect(scope.meters[0]).toBe('127');
    expect(scope.meters.length).toBe(8);
  });
});
