(function() {
  'use strict';

  angular.module(
    'scCoreEducation', [
      'angularFileUpload',
      'ngRoute',
      'scceUpload.directives',
      'scceUser.controllers',
      'scceUser.directives',
      'scCoreEducation.controllers',
      'scCoreEducation.templates',
    ]
  ).

  config(['$routeProvider',
    function($routeProvider) {

      function resolver(meth, userType, testUser) {
        testUser = testUser || angular.noop;
        return {
          'currentUser': [
            '$location',
            'scceCurrentUserApi',
            function($location, scceCurrentUserApi) {
              return scceCurrentUserApi.auth().then(function(user) {
                if (!user.isLoggedIn || testUser(user)) {
                  $location.path('/error');
                  return;
                }

                return user;
              });
            }
          ],
          'getList': ['scceUsersApi',
            function(scceUsersApi) {
              return scceUsersApi[meth];
            }
          ],
          'initialList': ['$location', 'scceUsersApi',
            function($location, scceUsersApi) {
              return scceUsersApi[meth]().catch(function() {
                $location.path('/error');
              });
            }
          ],
          'userType': function() {
            return userType;
          }
        };
      }

      function forStaffResolver(meth, userType) {
        return resolver(meth, userType, function isNotStaff(user){
          return !user.isStaff && !user.isAdmin && !user.isDomainAdmin;
        });
      }

      function forAdminResolver(meth, userType) {
        return resolver(meth, userType, function isNotStaff(user){
          return !user.isAdmin && !user.isDomainAdmin;
        });
      }

      $routeProvider

        .when('/error', {
        template: '<h1>Error</h1><p>You may need to be part of the staff</p>'
      })

      .when('/users', {
        templateUrl: 'views/sccoreeducation/user-list.html',
        controller: 'ScceUserListCtrl',
        controllerAs: 'ctrl',
        resolve: forAdminResolver('all', 'Users')
      })

      .when('/students', {
        templateUrl: 'views/sccoreeducation/student-list.html',
        controller: 'ScceUserListCtrl',
        controllerAs: 'ctrl',
        resolve: forStaffResolver('listStudents', 'Students')
      })

      .when('/staff', {
        templateUrl: 'views/sccoreeducation/user-list.html',
        controller: 'ScceUserListCtrl',
        controllerAs: 'ctrl',
        resolve: forAdminResolver('staff', 'Staff')
      })

      .otherwise({
        redirectTo: '/users'
      });
    }
  ])

  ;

})();
