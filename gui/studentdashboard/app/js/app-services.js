(function() {
  'use strict';


  angular.module('scDashboard.services', ['restangular', 'scDashboard.config']).

  factory('scdDashboardBaseApi', ['$window', 'Restangular', 'SCD_API_BASE',
    function scdDashboardBaseApiFactory($window, Restangular, SCD_API_BASE) {
      var _ = $window._,

        // For api calls to collections, restangular expect an array; most api
        // calls wrap array inside an object. This inceptor convert an object
        // to an array when required.
        respInterceptor = function(data, operation, what) {
          var resp;

          // Restangular doesn't expect an array. We just return the data
          if (operation !== 'getList') {
            return data;
          }

          if (angular.isArray(resp)) {
            data.cursor = null;
            return data;
          }

          if (data[what]) {
            resp = data[what];
            _.assign(resp, _.omit(data, [what]));
          } else if (data.type && data[data.type]) {
            resp = data[data.type];
            _.assign(resp, _.omit(data, [data.type]));
          } else {
            resp = [];
          }

          resp.cursor = data.cursor ? data.cursor : null;
          return resp;
        },
        // GAE expect an empty body on DELETE request; Restangular sends the
        // the element we request removal in the body. We need to remove it.
        reqInterceptor = function(element, operation, route, url, headers, params) {
          if (operation === 'remove') {
            element = null;
          }

          return {
            headers: headers,
            params: params,
            element: element,
            httpConfig: {}
          };
        };

      return Restangular.withConfig(function(RestangularConfigurer) {
        RestangularConfigurer.setBaseUrl(SCD_API_BASE);
        RestangularConfigurer.setFullRequestInterceptor(reqInterceptor);
        RestangularConfigurer.addResponseInterceptor(respInterceptor);
      });
    }
  ]).

  /**
   * Constants for authentication events
   *
   */
  constant('SCD_AUTH_EVENTS', {
    notAuthenticated: 'scd-auth-not-authenticated'
  }).

  /**
   * Student dashboard API service.
   *
   */
  factory('scdDashboardApi', [
    '$rootScope',
    '$location',
    '$q',
    'scdDashboardBaseApi',
    'SCD_AUTH_EVENTS',
    function scdDashboardApiFactory($rootScope, $location, $q, scdDashboardBaseApi, SCD_AUTH_EVENTS) {
      var baseApi = scdDashboardBaseApi,
        api;

      $rootScope.$on(SCD_AUTH_EVENTS.notAuthenticated, function(e, resp) {
        api.auth.reset(resp.data.loginUrl, resp.data.error);
      });

      api = {
        /**
         * Current user resource
         *
         */
        auth: {
          info: null,
          loading: null,

          _get: function(returnUrl) {
            var params = {
              returnUrl: returnUrl || $location.absUrl()
            };

            return baseApi.one('user').get(params).then(function(data) {
              return data;
            });
          },

          auth: function(returnUrl) {

            if (api.auth.info) {
              return $q.when(api.auth.info);
            }

            if (api.auth.loading) {
              return api.auth.loading;
            }


            api.auth.loading = api.auth._get(returnUrl).then(function(user) {
              api.auth.info = user;
              return user;
            }).finally(function() {
              api.auth.loading = null;
            });

            return api.auth.loading;
          },

          /**
           * Reset current user info
           *
           */
          reset: function(loginUrl, msg) {
            var currentLoginUrl = api.auth.info && api.auth.info.loginUrl || null;

            loginUrl = loginUrl || currentLoginUrl;
            if (loginUrl) {
              api.auth.info = {
                loginUrl: loginUrl,
                error: msg
              };
            } else {
              api.auth.info = null;
            }
          }
        },

        /**
         * Users, student and staff resources
         *
         */
        users: {
          /**
           * List active student class years
           *
           */
          listPgys: function() {
            return baseApi.all('pgy').getList();
          },

          /**
           * List active students
           *
           */
          listStudents: function(params) {
            params = params || {};

            return baseApi.all('students').getList(params);
          },

          /**
           * Get details of a student
           */
          getStudent: function(studentId) {
            return baseApi.one('students', studentId).get();
          },

          /**
           * Post a new student.
           *
           */
          newStudent: function(student) {
            return baseApi.all('students').post(student);
          },

          /**
           * Edit a user name
           */
          saveStudentName: function(studentId, name) {
            return baseApi.one('students', studentId).customPUT(name, 'name');
          },

          /**
           * Edit a user year
           */
          saveStudentYear: function(studentId, year) {
            return baseApi.one('students', studentId).customPUT(year, 'year');
          },

          /**
           * Edit a user name
           */
          saveStudentEmail: function(studentId, email) {
            return baseApi.one('students', studentId).customPUT(email, 'email');
          },

          /**
           * Fetch a new image upload URL
           */
          newStudentProfileUploadUrl: function() {
            return baseApi.all('uploadurl').one('studentsprofile').post().then(function(resp) {
              return resp.url;
            });
          },

          /**
           * Delete a student
           */
          deleteStudent: function(studentId) {
            return baseApi.one('students', studentId).remove();
          },

          /**
           * Fetch a new student list upload url
           */
          newStudentUploadUrl: function() {
            return baseApi.all('uploadurl').one('students').post().then(function(resp) {
              return resp.url;
            });
          },

          /**
           * Archive students by year
           */
          archivePgy: function(yearId) {
            return baseApi.one('pgy', yearId).remove();
          },

          /**
           * Query all active users.
           *
           */
          listUsers: function(cursor) {
            var params = {};

            if (cursor) {
              params.cursor = cursor;
            }
            return baseApi.all('users').getList(params);
          },

          /**
           * Give a user staff permission.
           */
          makeStaff: function(user) {
            return baseApi.one('staff', user.id).put();
          },

          /**
           * Revoke staff permission from a user
           */
          revokeStaff: function(user) {
            return baseApi.one('staff', user.id).remove();
          },

          /**
           * Give a user admin permission.
           */
          makeAdmin: function(user) {
            return baseApi.one('admin', user.id).put();
          },

          /**
           * Revoke admin permission from a user.
           */
          revokeAdmin: function(user) {
            return baseApi.one('admin', user.id).remove();
          }
        },

        /**
         * Repository resources
         *
         * TODO: move api client here.
         *
         */
        repository: {},

        /**
         * Assessment endpoint
         *
         */
        assessments: {

          /**
           * List all exams with their stats. Can get filtered to show
           * the exams a user took part of.
           *
           */
          listExams: function(userId) {
            var params = {};

            if (userId) {
              params.userId = userId;
            }
            return baseApi.all('assessments').all('exams').getList(params);
          },

          /**
           * Return detailed results of an exam
           *
           */
          getExamById: function(examId) {
            return baseApi.all('assessments').one('exams', examId).get();
          },

          /**
           * Get an upload url for a new result to upload.
           */
          newUploadUrl: function() {
            return baseApi.all('assessments').all('uploadurl').post();
          }
        },

        /**
         * Rosh Review endpoints
         */
        review: {

          /**
           * Fetch Student Rosh Review ranks
           *
           */
          listStats: function(params) {
            return baseApi.all('roshreview').all('stats').getList(params);
          },

          /**
           * Fetch detailled stats of a student
           */
          getStats: function(studentId) {
            return baseApi.all('roshreview').one('stats', studentId).get();
          },

          /**
           * Fetch the list of of Rosh Review topics
           */
          listTopics: function() {
            return baseApi.all('roshreview').all('topic').getList();
          }

        },

        /**
         * First Aid endpoints
         */
        firstAid: {

          /**
           * Fetch Student Rosh Review ranks
           *
           */
          listStats: function(params) {
            return baseApi.all('firstaid').all('stats').getList(params);
          },

          /**
           * Fetch detailled stats of a student
           */
          getStats: function(studentId) {
            return baseApi.all('firstaid').one('stats', studentId).get();
          },

          /**
           * Fetch the list of of Rosh Review topics
           */
          listTopics: function() {
            return baseApi.all('firstaid').all('topics').getList();
          }

        }
      };

      return api;
    }
  ]).

  /**
   * Intercept http response error to reset scceCurrentUserApi on http
   * 401 response.
   *
   */
  factory('scdAuthHttpInterceptor', ['$rootScope', '$q', '$location', 'SCD_AUTH_EVENTS',
    function($rootScope, $q, $location, SCD_AUTH_EVENTS) {
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
            resp.status === 401 &&
            isSameDomain(resp.config.url)
          ) {
            $rootScope.$broadcast(SCD_AUTH_EVENTS.notAuthenticated, resp);
          }

          return $q.reject(resp);
        }
      };
    }
  ]).

  config(['$httpProvider',
    function($httpProvider) {
      $httpProvider.interceptors.push('scdAuthHttpInterceptor');
    }
  ])

  ;

})();
