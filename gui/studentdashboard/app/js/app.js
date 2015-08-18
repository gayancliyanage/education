(function() {
  'use strict';

  /**
   * Return a promise resolving to the current user or redirect the user
   * if she/he is not logged in.
   *
   * Can be used as in route resolve map.
   *
   */
  function currentUser(scdDashboardApi, $window) {
    return scdDashboardApi.auth.auth().then(function(user) {
      if (!user.isLoggedIn && user.loginUrl) {
        $window.location.replace(user.loginUrl);
      }
      return user;
    });
  }
  currentUser.$inject = ['scdDashboardApi', '$window'];

  /**
   * Return a promise resolving to the current user if he's part of staff.
   *
   * Can be used as in route resolve map.
   *
   */
  function currentUserIsStaff(scdDashboardApi, $window, $q) {
    return scdDashboardApi.auth.auth().then(function(user) {
      if (!user.isLoggedIn && user.loginUrl) {
        $window.location.replace(user.loginUrl);
        return user;
      }

      if (!user.isStaff && !user.isAdmin) {
        return $q.reject('Only staff or admins can access this page.');
      }
      return user;
    });
  }
  currentUser.$inject = ['scdDashboardApi', '$window', '$q'];

  /**
   * Return a promise resolving to the current user if he's has admin permissiom.
   *
   * Can be used as in route resolve map.
   *
   */
  function currentUserIsAdmin(scdDashboardApi, $window, $q) {
    return scdDashboardApi.auth.auth().then(function(user) {
      if (!user.isLoggedIn && user.loginUrl) {
        $window.location.replace(user.loginUrl);
        return user;
      }

      if (!user.isAdmin) {
        return $q.reject('Only staff or admins can access this page.');
      }
      return user;
    });
  }
  currentUser.$inject = ['scdDashboardApi', '$window', '$q'];


  angular.module('scDashboard', [
    'angular-loading-bar',
    'mgcrea.ngStrap.typeahead',
    'ngRoute',
    'scDashboard.controllers',
    'scdChart.directives',
    'scdFirstAid.controllers',
    'scdMisc.filters',
    'scdRepository.controllers',
    'scdReview.controllers',
    'scdStudents.controllers',
    'scdUpload.directives',
    'scdUsers.controllers'
  ]).

  config(['$routeProvider', 'cfpLoadingBarProvider',
    function($routeProvider, cfpLoadingBarProvider) {

      cfpLoadingBarProvider.includeSpinner = false;

      $routeProvider.

      when('/', {
        templateUrl: 'views/scdashboard/repository.html',
        controller: 'ScdRepositoryListCtrl',
        controllerAs: 'ctrl',
        resolve: {
          'currentUser': currentUser,
          'initialData': ['scdRepositoryListCtrlInitialData',
            function(scdRepositoryListCtrlInitialData) {
              return scdRepositoryListCtrlInitialData();
            }
          ]
        }
      }).

      when('/review', {
        templateUrl: 'views/scdashboard/review-user.html',
        controller: 'ScdReviewUserStatsCtrl',
        controllerAs: 'ctrl',
        resolve: {
          'currentUser': currentUser,
          'initialData': ['scdReviewUserStatsCtrlInitialData',
            function(scdReviewUserStatsCtrlInitialData) {
              return scdReviewUserStatsCtrlInitialData();
            }
          ]
        }
      }).

      when('/review/stats', {
        templateUrl: 'views/scdashboard/review-stats.html',
        controller: 'ScdReviewStatsCtrl',
        controllerAs: 'ctrl',
        resolve: {
          'currentUser': currentUserIsStaff,
          'initialData': ['scdReviewStatsCtrlInitialData',
            function(scdReviewStatsCtrlInitialData) {
              return scdReviewStatsCtrlInitialData();
            }
          ]
        }
      }).

      when('/first-aid/stats', {
        templateUrl: 'views/scdashboard/firstaid-stats.html',
        controller: 'ScdFirstAidStatsCtrl',
        controllerAs: 'ctrl',
        resolve: {
          'currentUser': currentUserIsStaff,
          'initialData': ['scdFirstAidStatsCtrlInitialData',
            function(scdFirstAidStatsCtrlInitialData) {
              return scdFirstAidStatsCtrlInitialData();
            }
          ]
        }
      }).

      when('/first-aid', {
        templateUrl: 'views/scdashboard/firstaid-user.html',
        controller: 'ScdFirstAidUserStatsCtrl',
        controllerAs: 'ctrl',
        resolve: {
          'currentUser': currentUser,
          'initialData': ['scdFirstAidUserStatsCtrlInitialData',
            function(scdFirstAidUserStatsCtrlInitialData) {
              return scdFirstAidUserStatsCtrlInitialData();
            }
          ]
        }
      }).

      when('/students', {
        templateUrl: 'views/scdashboard/student-list.html',
        controller: 'ScdStudentListCtrl',
        controllerAs: 'ctrl',
        resolve: {
          'currentUser': currentUserIsStaff,
          'initialData': ['scdStudentListCtrlInitialData',
            function(scdStudentListCtrlInitialData) {
              return scdStudentListCtrlInitialData();
            }
          ]
        }
      }).

      when('/users', {
        templateUrl: 'views/scdashboard/user-list.html',
        controller: 'ScdUserListCtrl',
        controllerAs: 'ctrl',
        resolve: {
          'currentUser': currentUserIsAdmin,
          'initialData': ['scdUserListCtrlInitialData',
            function(scdUserListCtrlInitialData) {
              return scdUserListCtrlInitialData();
            }
          ]
        }
      }).

      otherwise({
        redirectTo: '/'
      });

    }
  ])

  ;

})();
