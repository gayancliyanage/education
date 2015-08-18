'use strict';

describe('Filter: filters', function () {

  // load the filter's module
  beforeEach(module('liftApp'));

  // initialize a new instance of the filter before each test
  var filters;
  beforeEach(inject(function ($filter) {
    filters = $filter('toHumanString');
  }));

  it('should return the input prefixed with "filters filter:"', function () {
    var text = 8;
    expect(filters(text)).toBe('every 8 hours');
  });

  it('should return the proper humanized version of the schedule', function() {
    var input = [1,1,1];
    expect(filters(input)).toBe('thrice daily');
  })

});
