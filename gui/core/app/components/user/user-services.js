(function() {
  'use strict';

  // Keep a reference to scceCurrentUserApi to avoid for the interceptor
  // to avoid a circular dependency.
  //
  // TODO: Create a session service which both scceCurrentUserApi
  // and the the http inceptor can depend on.
  var api;


  angular.module('scceUser.services', ['scCoreEducation.services']).


  provider('scceUserOptions', function scceUserOptionsProvider() {
    this.appName = 'core';
    this.apiClient = null;
    this.defaultReturnUrl = null; // Should return to the current URL.

    this.setAppName = function(name) {
      this.appName = name;
    };

    this.setDefaultUrl = function(url) {
      this.defaultReturnUrl = url;
    };

    this.$get = ['scceApi',
      function(scceApi) {
        return {
          appName: this.appName,
          apiClient: scceApi.client(this.appName),
          defaultReturnUrl: this.defaultReturnUrl
        };
      }
    ];
  }).

  /**
   * scceCurrentUserApi - api to access user info.
   *
   * scceCurrentUserApi.get(returnUrl)  Return the user name, id and the
   * the logout url if the user logged in. Return the login url if the
   * user logged off.
   *
   * Note that it returns a promise that resole in either case. If the promise
   * fails, there was either a problem with the optional return url, or
   * there's an unexpected issue with the backend.
   *
   * TODO: handle lose of authentication.
   *
   */
  factory('scceCurrentUserApi', ['$location', '$q', 'scceUserOptions',
    function($location, $q, scceUserOptions) {
      var client = scceUserOptions.apiClient;

      api = {
        info: null,
        loading: null,

        _get: function(returnUrl) {
          var params = {
            returnUrl: (
              returnUrl ||
              scceUserOptions.defaultReturnUrl ||
              $location.absUrl()
            )
          };

          return client.one('user').get(params).then(function(data) {
            return data;
          });
        },

        auth: function(returnUrl) {

          if (api.info) {
            return $q.when(api.info);
          }

          if (api.loading) {
            return api.loading;
          }


          api.loading = api._get(returnUrl).then(function(user) {
            api.info = user;
            return user;
          })['finally'](function() {
            api.loading = null;
          });

          return api.loading;
        },

        reset: function(loginUrl, msg) {
          var currentLoginUrl = api.info && api.info.loginUrl || null;

          loginUrl = loginUrl || currentLoginUrl;
          if (loginUrl) {
            api.info = {
              loginUrl: loginUrl,
              error: msg
            };
          } else {
            api.info = null;
          }
        }
      };

      return api;
    }
  ]).

  /**
   * Api to query users.
   *
   * scceUsersApi.users, scceUsersApi.students and scceUsersApi.staff
   * return promises that resolve to list of user.
   *
   * makeStaff sends a request make a user a member of staff.
   *
   * TODO: add support to revoke staff.
   */
  factory('scceUsersApi', ['scceUserOptions',
    function(scceUserOptions) {
      var client = scceUserOptions.apiClient;

      return {

        all: function(cursor) {
          var params = {};

          if (cursor) {
            params.cursor = cursor;
          }
          return client.all('users').getList(params);
        },

        getById: function(userId) {
          return client.one('users', userId).get();
        },

        deleteUser: function(userId) {
          return client.one('users', userId).remove();
        },

        listStudents: function(cursor, params) {
          params = params || {};

          if (cursor) {
            params.cursor = cursor;
          }

          return client.all('students').getList(params);
        },

        listPgys: function() {
          return client.all('pgy').getList();
        },

        archivePgy: function(yearId) {
          return client.one('pgy', yearId).remove();
        },

        newStudentUploadUrl: function() {
          return client.all('students').one('_uploadurl').post().then(function(resp){
            return resp.url;
          });
        },

        newStudentProfileUploadUrl: function() {
          return client.all('students').one('_uploadprofileurl').post().then(function(resp){
            return resp.url;
          });
        },

        deleteStudent: function(studentId) {
          return client.one('students', studentId).remove();
        },

        saveStudentName: function(studentId, name) {
          return client.one('students', studentId).customPUT(name, 'name');
        },

        staff: function(cursor) {
          var params = {};

          if (cursor) {
            params.cursor = cursor;
          }
          return client.all('staff').getList(params);
        },

        makeStaff: function(user) {
          return client.one('staff', user.id).put();
        },

        revokeStaff: function(user) {
          return client.one('staff', user.id).remove();
        },

        makeAdmin: function(user) {
          return client.one('admin', user.id).put();
        },

        revokeAdmin: function(user) {
          return client.one('admin', user.id).remove();
        }
      };
    }
  ]).

  /**
   * Intercept http response error to reset scceCurrentUserApi on http
   * 401 response.
   *
   */
  factory('scceCurrentHttpInterceptor', ['$q', '$location',
    function($q, $location) {
      var httpPattern = /https?:\/\//,
        thisDomainPattern = new RegExp(
          'https?://' + $location.host().replace('.', '\\.')
        );

      function isSameDomain(url) {
        return !httpPattern.test(url) || thisDomainPattern.test(url);
      }

      return {
        responseError: function(resp) {
          if (
            api &&
            resp.status === 401 &&
            isSameDomain(resp.config.url)
          ) {
            api.reset(resp.data.loginUrl, resp.data.error);
          }

          return $q.reject(resp);
        }
      };
    }
  ]).

  config(['$httpProvider',
    function($httpProvider) {
      $httpProvider.interceptors.push('scceCurrentHttpInterceptor');
    }
  ])

  ;

})();
