'use strict';

describe('Controller: MedicineCtrl', function () {

  // load the controller's module
  beforeEach(module('liftApp'));

  var MedicineCtrl,
    scope,
    $httpBackend;

  // Initialize the controller and a mock scope
  beforeEach(inject(function (_$httpBackend_, $controller, $rootScope) {
    $httpBackend = _$httpBackend_;
//    $httpBackend.expectGET('/api/activeMedicines')
//      .respond([{drugName: 'd1',dosage:'100 mg',classification:'aa'},{drugName: 'd2',dosage:'10 mg',classification:'ab'}]);
    scope = $rootScope.$new();
    MedicineCtrl = $controller('MedicineCtrl', {
      $scope: scope
    });
  }));

  it('should attach a list of awesomeThings to the scope', function () {
//    expect(scope.activeMedicines).toBeUndefined();
//    $httpBackend.flush();
    expect(scope.activeMedicines.length).toBe(4);
    expect(scope.activeMedicines[0].drugName).toBe('Metformin');
  });
});
