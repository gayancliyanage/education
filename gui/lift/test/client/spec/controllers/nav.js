'use strict';

describe('Controller: NavCtrl', function() {

  beforeEach(module('liftApp'));

  var NavbarCtrl,
      location,
      scope, $httpBackend;

  beforeEach(inject(function($rootScope, $controller, $location, _$httpBackend_) {
    $httpBackend = _$httpBackend_;
//    $httpBackend.expectGET('/api/users')
//        .respond([{name: 'User 1', username: 'user1'},{name: 'User 2', username:'user2'}]);

    scope = $rootScope.$new();
    location = $location;
    NavbarCtrl = $controller('NavbarCtrl', {
      $scope: scope
    });
  }));
  it ('should provide a list of menu items with link to them', function() {
    var menu = scope.menu;
    expect(menu).toBeDefined();
    expect(menu.length).toBe(6);
//    expect(scope.isActive('/')).toBe(true);
  });

  it ('should provide a list of users to display in navbar', function(){
//    expect(scope.users).toBeUndefined();
//    $httpBackend.flush();
    var users = scope.users;
    expect(users).toBeDefined();
    expect(scope.activeUser).toBeDefined();
    expect(users.length).toBe(4);
    expect(scope.activeUser.name).toBe(users[0].name);
  });

  it ('should set the chosen user as the active user', function() {
//    $httpBackend.flush();
    var users = scope.users;

    expect(scope.activeUser).toBe(users[0]);
    scope.chooseUser(users[1]);
    expect(scope.activeUser).toBe(users[1]);
  });

});