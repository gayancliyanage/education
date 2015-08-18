'use strict';

describe('Controller: TestresultsCtrl', function () {

  // load the controller's module
  beforeEach(module('liftApp'));

  var TestResultsCtrl,
    scope,
    $httpBackend;

  // Initialize the controller and a mock scope
  beforeEach(inject(function (_$httpBackend_, $controller, $rootScope) {
    $httpBackend = _$httpBackend_;
//    $httpBackend.expectGET('/api/testResults')
//      .respond([{'testName':'test1',date:'01/11/2014',result:'Normal'},{'testName':'test2',date:'01/11/2014',result:'Normal'}]);
    scope = $rootScope.$new();
    TestResultsCtrl = $controller('TestResultsCtrl', {
      $scope: scope
    });
  }));

  it('should attach a list of testResults to the scope', function () {
//    expect(scope.testResults).toBeUndefined();
//    $httpBackend.flush();
    expect(scope.testResults.length).toBe(5);
  });
});
