'use strict';

describe('Directive: linechart', function () {

  // load the directive's module
  beforeEach(module('liftApp'));

  var element,
    scope;

  beforeEach(inject(function ($rootScope) {
    scope = $rootScope.$new();
  }));

  it('should make hidden element visible', inject(function ($compile) {
    element = angular.element('<linechart></linechart>');
    element = $compile(element)(scope);
    expect(element.text()).toBe('this is the linechart directive');
  }));
});
