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

(function() {
  'use strict';

  angular.module('scDashboard.config', []).

  constant('SCD_API_BASE', '/api/v1/dashboard')

  ;

})();
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

(function() {
  'use strict';

  angular.module('scDashboard.controllers', [
    'scDashboard.services'
  ]).

  controller('ScdNavBarCtrl', ['$location', 'scdDashboardApi',
    function ScdNavBarCtrl($location, scdDashboardApi) {
      var self = this;

      this.currentUser = null;
      scdDashboardApi.auth.auth().then(function(user) {
        self.currentUser = user;
      });

      this.isActive = function(route, exactMatch) {
        if (exactMatch) {
          return $location.path() === route;
        } else {
          return ($location.path() + '').indexOf(route) === 0;
        }
      };
    }
  ])

  ;

})();

(function() {
  'use strict';


  angular.module('scdChart.directives', [
    'scdSvg.directives',
    'scdMisc.filters'
  ]).

  service('scdChartArc', ['$window',
    function scdChartArcFactory($window) {
      var d3 = $window.d3;

      return function scdChartArc(radius) {
        return d3.svg.arc()
          .startAngle(function(d) {
            return d.startAngle;
          })
          .endAngle(function(d) {
            return d.endAngle;
          })
          .innerRadius(radius.inner || 0)
          .outerRadius(radius.outer);
      };
    }
  ]).

  /**
   * Meter directive
   *
   * Usage:
   *
   *   <scd-chart-meter
   *     scd-layout="layout"
   *     scd-levels="levels"
   *     scd-reading="reading"
   *   ></scd-chart-meter>
   *
   * Where:
   *
   * - layout would be an layout object
   *   (width, height and magin attribute)
   * - levels would be an array of levels for the meter
   *   eg: [{id: 'danger', min: 0, max: 60}, {id: 'ok', max: 100}]
   * - reading would and object with value, unit and label properties.
   *   eg: {unit: '%', label: "Perecentage Completed", value: 65}
   */
  directive('scdChartMeter', [
    '$window',
    'scdChartArc',
    function scdChartMeterFactory($window, scdChartArc) {
      var d3 = $window.d3,
        _ = $window._;

      return {
        templateUrl: 'views/scdashboard/charts/meter.html',
        restrict: 'E',
        scope: {
          'layout': '=scdLayout',
          'donutWidth': '&scdDonut',
          'levels': '=scdLevels',
          'reading': '=scdReading',
          'options': '=?scdOptions'
        },
        // arguments: scope, iElement, iAttrs, controller
        link: function scdChartMeterPostLink(scope) {
          scope.options = scope.options || {};
          _.defaults(scope.options, {
            getValueAsText: function(reading) {
              if (reading.value === null) {
                return 'N/A';
              } else {
                return reading.value + ' ' + reading.unit;
              }
            },
          });
          scope.scales = {
            degres: null
          };

          function setScales() {
            var min, max;

            scope.scales.degres = d3.scale.linear();
            if (!scope.layout || !scope.levels) {
              return;
            }

            min = scope.levels[0].min;
            max = scope.levels.slice(-1).pop().max;
            scope.scales.degres.domain([min, max]);
            scope.scales.degres.range([0, 180]);
          }


          scope.radius = {};
          scope.levelArc = angular.noop;

          function setRadius() {
            var donutWidth = scope.donutWidth() || 15;

            scope.radius = {};
            if (!scope.layout) {
              return;
            }

            scope.radius.outer = scope.layout.innerWidth / 2;
            if (scope.radius.outer > scope.layout.innerHeight) {
              scope.radius.outer = scope.layout.innerHeight;
            }

            scope.radius.inner = scope.radius.outer - donutWidth;
            scope.levelArc = scdChartArc(scope.radius);
          }

          scope.levelSlices = [];

          function setLevelSlices() {
            var slicesData;

            scope.levelSlices = [];
            if (scope.levels.length < 1) {
              return;
            }

            slicesData = _.reduce(scope.levels, function(data, level) {
              if (level.min === undefined) {
                level.min = data.slice(-1).pop().max;
              }

              data.push({
                id: level.id,
                label: level.label || level.id,
                value: level.max - level.min,
                max: level.max
              });

              return data;
            }, []);

            scope.levelSlices = d3.layout.pie().sort(null).value(function(d) {
              return d.value;
            }).startAngle(-Math.PI / 2).endAngle(Math.PI / 2)(slicesData);
          }

          scope.$watch('layout', setRadius);
          scope.$watch('layout', setScales);
          scope.$watch('levels', setScales);
          scope.$watch('levels', setLevelSlices);
        }
      };
    }
  ]).

  /**
   * scdChartComponents
   *
   * Usage:
   *
   *    <scd-chart-components
   *      scd-layout="layout"
   *      scd-main-data="main"
   *      scd-components="components"
   *     >
   *     </scd-chart-components>
   *
   * Where:
   * - main would be the main stats to show (with label, unit and value
   *   attribute)
   * - components should decompose the main stats. It would be array of object
   *   with id, label and value attribute.
   *
   */
  directive('scdChartComponents', [
    '$window',
    'scdChartArc',
    function scdChartComponentsFactory($window, scdChartArc) {
      var d3 = $window.d3;

      function shifterFactory(arc) {
        return function shifter(slice, margin) {
          var c = arc.centroid(slice),
            x = c[0],
            y = c[1],
            h = Math.sqrt(x * x + y * y);

          return 'translate(' +
            (x / h * margin) + ',' +
            (y / h * margin) +
            ')';
        };
      }

      return {
        templateUrl: 'views/scdashboard/charts/components.html',
        restrict: 'E',
        scope: {
          'layout': '=scdLayout',
          'mainData': '=scdMainData',
          'components': '=scdComponents'
        },
        // arguments: scope, iElement, iAttrs, controller
        link: function scdChartComponentsPostLink(scope) {

          function setHelpers() {
            var radius = {},
              labelMargin;

            scope.arc = scope.shiftSlice = angular.noop;
            scope.shiftLabel = scope.onLeftCenter = angular.noop;
            if (!scope.layout) {
              return;
            }

            if (scope.layout.innerWidth > scope.layout.innerHeight) {
              radius.outer = scope.layout.innerHeight / 2;
            } else {
              radius.outer = scope.layout.innerWidth / 2;
            }

            scope.arc = scdChartArc(radius);
            scope.shiftSlice = shifterFactory(scope.arc);

            labelMargin = radius.outer + scope.layout.margin.bottom / 2;
            scope.shiftLabel = function shiftLabel(slice, margin) {
              margin = (margin || 0) + labelMargin;

              return scope.shiftSlice(slice, margin);
            };

            scope.onLeftCenter = function onLeftCenter(slice) {
              return (slice.endAngle + slice.startAngle) / 2 > Math.PI;
            };

          }

          function setSlices() {
            scope.slices = [];
            if (!scope.components) {
              return;
            }

            scope.slices = d3.layout.pie().sort(null).value(function(d) {
              return d.value;
            })(scope.components);
          }

          scope.$watch('layout', setHelpers);
          scope.$watch('components', setSlices);
        }
      };
    }
  ]).

  /**
   * Show the progression of a stats over time.
   *
   * usage:
   *
   *    <scd-chart-history
   *      scd-layout="layout"
   *      scd-series="series"
   *      scd-ref="ref"
   *      scd-current="current"
   *      scd-options="options"
   *      scd-legend="legend"
   *     >
   *    </scd-chart-history>
   *
   * Where:
   * - `series` should be an array of object with date and value properties,
   *   sorted by chronologic order.
   * - `ref` an object to compare to. It should have a lable and
   *    value properties
   * - `current` should be the current value of the stats. It should have
   *   a label and value property
   * - `options` can define alternive way to extract the value and date out
   *   of the series array. It may have a getValue and getDate properties that
   *   take as argument an item of the series array and return respectively
   *   its value and date.
   * - `legend` should be an object with a y property. Used for the y axis
   *   legend.
   *
   */
  directive('scdChartHistory', [
    '$window',
    function scdChartHistoryFactory($window) {
      var d3 = $window.d3,
        _ = $window._;

      return {
        templateUrl: 'views/scdashboard/charts/history.html',
        restrict: 'E',
        scope: {
          'layout': '=scdLayout',
          'series': '=scdSeries',
          'ref': '=scdRef',
          'current': '=scdCurrent',
          'legend': '=scdLegend',
          'options': '=scdOptions'
        },
        // arguments: scope, iElement, iAttrs, controller
        link: function scdChartHistoryPostLink(scope) {
          scope.ticksFormatter = d3.time.format('%b %y');
          scope.options = scope.options || {};
          _.defaults(scope.options, {
            getValue: function(day) {
              return day.value;
            },
            getDate: function(day) {
              return new Date(day.date);
            },
            domain: [0, 100],
            unit: '%'
          });

          function setScales() {
            scope.xTicks = [];
            scope.scales = {
              x: null,
              y: null,
              yReversed: null
            };

            if (!scope.layout && !scope.series) {
              return;
            }

            scope.scales.x = d3.scale.ordinal();
            scope.scales.y = d3.scale.linear();

            // setup scale domains
            scope.scales.y.domain(scope.options.domain);
            scope.series.forEach(function(day) {
              scope.scales.x(
                scope.options.getDate(day)
              );
            });

            // setup scale ranges
            scope.scales.yReversed = (
              scope.scales.y.copy().range([scope.layout.innerHeight, 0])
            );
            scope.scales.y.range([0, scope.layout.innerHeight]);
            scope.scales.x.rangeBands(
              [0, scope.layout.innerWidth], 0, 0
            );

            // Set x ticks
            scope.xTicks = _.range(1, 4).map(function(i) {
              return  scope.series[Math.round(i*scope.series.length/4)];
            }).map(scope.options.getDate);
          }

          scope.$watch('layout', setScales);
          scope.$watch('series', setScales);
        }
      };
    }
  ]).

  /**
   * Histogram chart
   *
   * Usage:
   *
   *     <scd-chart-histogram
   *       scd-layout="ctrl.performances.byCategory.layout"
   *       scd-series="ctrl.performances.byCategory.series"
   *       scd-options="ctrl.performances.byCategory.options"
   *       scd-legend="{x: 'Score (%)'}"
   *     >
   *     </scd-chart-histogram>
   *
   * Where:
   * - series is an array of object with label, value, unit and ref properties.
   * - legend is an object with `x` property, used to label the bottom axis.
   * - options is an object with `getLabel`, `hasRef`, `getRef`, `getUnit`,
   *   `getValue` and `isFailing`. They are use to extract data out of each
   *   series item.
   *
   */
  directive('scdChartHistogram', [
    '$window',
    function scdChartHistogramFactory($window) {
      var _ = $window._,
        d3 = $window.d3;

      return {
        templateUrl: 'views/scdashboard/charts/histogram.html',
        restrict: 'EA',
        scope: {
          layout: '=scdLayout',
          legend: '=scdLegend',
          options: '=scdOptions',
          ref: '=scdRef',
          series: '=scdSeries',
          onClick: '=scdRowClicked'
        },
        // arguments: scope, iElement, iAttrs, controller
        link: function scdChartHistogramPostLink(scope) {
          scope.scales = {};
          scope.options = scope.options || {};
          _.defaults(scope.options, {
            domain: [0, 100],

            // default row data extractor
            getLabel: function(row) {
              return row.label;
            },
            hasRef: function(row) {
              return !!this.getRef(row);
            },
            getRef: function(row) {
              return row.ref;
            },
            getUnit: function(row) {
              return row.unit;
            },
            getValue: function(row) {
              return row.value;
            },
            getValueAsString: function(row) {
              return scope.options.getValue(row) + ' ' + scope.options.getUnit(row);
            },
            isFailing: function(row) {
              // reference value can be global or per row
              var ref = scope.ref || this.getRef(row),
                value = this.getValue(row);

              return ref && ref.value > value;
            }
          });

          function setHistogramScales() {
            scope.scales.x = null;
            scope.scales.y = null;
            if (!scope.layout || !scope.series) {
              return;
            }

            // init scales
            scope.scales.x = d3.scale.linear();
            scope.scales.y = d3.scale.ordinal();

            // set domain
            if (angular.isArray(scope.options.domain)) {
              scope.scales.x.domain(scope.options.domain);
            } else {
              scope.scales.x.domain(scope.options.domain(scope.series));
            }
            scope.scales.y.domain(_.map(scope.series, 'id'));

            // set ranges
            scope.scales.x.range([0, scope.layout.innerWidth]);
            scope.scales.y.rangeBands([0, scope.layout.innerHeight], 0, 0);
          }

          scope.$watch('layout', setHistogramScales);
          scope.$watch('series', setHistogramScales);
        }
      };
    }
  ])

  ;

})();

(function() {
  'use strict';

  angular.module('scdFirstAid.controllers', [
    'scdSvg.services',
    'scDashboard.services',
    'scdMisc.services',
    'scdSelector.services'
  ]).

  /**
   * Use to resolve `initialData` of `scdFirstAidStatsCtrl`.
   *
   */
  factory('scdFirstAidStatsCtrlInitialData', [
    '$q',
    'scdDashboardApi',
    'scdSelectedStudent',
    function scdFirstAidStatsCtrlInitialDataFactory($q, scdDashboardApi, scdSelectedStudent) {
      return function scdFirstAidStatsCtrlInitialData() {
        var params = {
            limit: 30,
            residents: 'all',
            topic: 'all',
            sortBy: 'performance'
          },
          selectorPromise = scdSelectedStudent(),
          studentsPromise = selectorPromise.then(function(selector) {
            // If the selector is not available, the current user cannot
            // see the stats either
            if (!selector.available) {
              return $q.reject('Only staff or admins can access this page.');
            }

            return scdDashboardApi.firstAid.listStats(params);
          });


        return $q.all({
          selector: selectorPromise,
          params: params,
          students: studentsPromise,
          paramOptions: $q.all({

            residents: scdDashboardApi.users.listPgys().then(function(years) {
              return [{
                id: 'all',
                label: 'All Students',
              }].concat(years);
            }),

            topics: scdDashboardApi.firstAid.listTopics().then(function(topics) {
              return [{
                id: 'all',
                label: 'All Categories'
              }].concat(topics);
            }),

            sortBy: [{
              id: 'performance',
              label: 'Correct answers rate',
              unit: '%'
            }, {
              id: 'questionTaken',
              label: 'Question taken',
              unit: ''
            }]

          })
        });
      };
    }
  ]).

  /**
   * scdFirstAidStatsCtrl
   *
   */
  controller('ScdFirstAidStatsCtrl', [
    '$window',
    '$location',
    'ScdLayout',
    'ScdPageCache',
    'scdDashboardApi',
    'initialData',
    function ScdFirstAidStatsCtrl($window, $location, ScdLayout, ScdPageCache, scdDashboardApi, initialData) {
      var self = this,
        _ = $window._,
        rowHeight = 25;

      function setStudent(students) {
        self.students = students;
        self.chartLayout = ScdLayout.contentSizing({
          innerWidth: 600,
          innerHeight: rowHeight * students.length,
          margin: {
            top: 20,
            right: 200,
            bottom: 50,
            left: 200
          }
        });
      }

      function setLegend(sortById) {
        self.chartLegend = {
          x: _.find(self.filterOptions.sortBy, {
            id: sortById
          })
        };
      }

      this.pages = new ScdPageCache(initialData.params.limit);
      this.pages.add(initialData.students);
      this.filters = initialData.params;
      this.filterOptions = initialData.paramOptions;

      this.chartRef = null; // no average stats yet.
      this.chartOptions = {
        domain: function(series) {
          var max;

          if (self.filters.sortBy === 'performance') {
            return [0, 100];
          } else {
            max = _.max(series, function(s) {
              return s[self.filters.sortBy];
            })[self.filters.sortBy];
            return [0, max];
          }
        },
        getLabel: function(row) {
          return row.displayName;
        },
        getValue: function(row) {
          return row[self.filters.sortBy];
        },
        getValueAsString: function(row) {
          if (self.filters.sortBy === 'performance') {
            return row.correctAnswers + '/' + row.questionTaken;
          } else {
            return row[self.filters.sortBy];
          }
        }
      };

      setStudent(this.pages.next());
      setLegend(this.filters.sortBy);

      /**
       * Query next page of student
       *
       */
      this.next = function(params) {
        params = _.clone(params);

        if (
          this.pages.cursor &&
          this.pages.remaining() < this.pages.viewSize
        ) {
          params.cursor = this.pages.cursor;
          scdDashboardApi.firstAid.listStats(params).then(function(students) {
            self.pages.add(students);
            setStudent(self.pages.next());
            setLegend(this.filters.sortBy);
          });
        } else {
          setStudent(this.pages.next());
          setLegend(this.filters.sortBy);
        }
      };

      /**
       * Query previous page of student
       *
       */
      this.prev = function() {
        if (this.pages.position() > 0) {
          setStudent(this.pages.prev());
          setLegend(this.filters.sortBy);
        }
      };

      /**
       * To be called after the parameter have been changed.
       *
       * It should query the student list with new parameters.
       *
       */
      this.filterChanged = function(params) {
        this.pages.clear();

        self.chartLegend = setLegend(params.sortBy);
        scdDashboardApi.firstAid.listStats(params).then(function(students) {
          self.pages.add(students);
          setStudent(self.pages.next());
          setLegend(params.sortBy);
        });
      };

      this.showDetails = function(studentStats) {
        initialData.selector.select({
          studentId: studentStats.studentId
        }).then(function() {
          $location.path('/first-aid');
        });
      };
    }
  ]).

  /**
   * Use to resolve `initialData` of `ScdFirstAidUserStatsCtrl`.
   *
   */
  factory('scdFirstAidUserStatsCtrlInitialData', [
    '$window',
    '$q',
    'scdSelectedStudent',
    'scdDashboardApi',
    function scdFirstAidUserStatsCtrlInitialDataFactory($window, $q, scdSelectedStudent, scdDashboardApi) {
      return function scdFirstAidUserStatsCtrlInitialData() {
        var _ = $window._,
          selectorPromise = scdSelectedStudent(),
          params = {
            ref: 'programAverage',
            sortBy: 'performance'
          };

        return $q.all({
          topics: scdDashboardApi.firstAid.listTopics().then(function(topics) {
            return _.reduce(topics, function(map, topic) {
              map[topic.id] = topic;
              return map;
            }, {});
          }),
          params: params,
          selector: selectorPromise,
          userStats: selectorPromise.then(function(selector) {
            if (!selector.selected || !selector.selected.studentId) {
              return null;
            }

            return scdDashboardApi.firstAid.getStats(selector.selected.studentId, params).catch(function() {
              return null;
            });
          }),
          filterOptions: $q.all({
            refs: [{
              id: 'programAverage',
              label: 'Program Average'
            }],

            sortBy: [{
              id: 'performance',
              label: 'Correct answers rate',
              unit: '%'
            }, {
              id: 'questionTaken',
              label: 'Question taken',
              unit: ''
            }]

          })
        });
      };
    }
  ]).

  /**
   * ScdFirstAidUserStatsCtrl
   *
   */
  controller('ScdFirstAidUserStatsCtrl', [
    '$window',
    'ScdLayout',
    'scdDashboardApi',
    'initialData',
    function ScdFirstAidUserStatsCtrl($window, ScdLayout, scdDashboardApi, initialData) {
      var self = this,
        _ = $window._;

      this.selector = initialData.selector;
      this.userStats = initialData.userStats;
      this.filters = initialData.params;
      this.filterOptions = initialData.filterOptions;

      function categoriesLayout(stats, baseLayout) {
        if (!stats || !stats.categoryPerformances) {
          return;
        }

        return new ScdLayout.contentSizing(_.assign({
            'innerHeight': stats.categoryPerformances.length * baseLayout.rowHeight
          },
          baseLayout
        ));
      }

      this.byCategory = {
        layout: null,
        baseLayout: {
          rowHeight: 25,
          innerWidth: 600,
          margin: {
            top: 20,
            right: 200,
            bottom: 50,
            left: 200
          }
        },

        options: {
          domain: function() {
            return [0, 100];
          },
          getLabel: function(row) {
            return initialData.topics[row.id].label;
          },
          hasRef: function() {
            return false;
          },
          getRef: function() {
            return null;
          },
          getUnit: function() {
            return '';
          },
          getValue: function(row) {
            return row.performance;
          },
          getValueAsString: function(row) {
            return row.correctAnswers + '/' + row.questionTaken;
          }
        }
      };
      this.byCategory.layout = categoriesLayout(
        this.userStats,
        this.byCategory.baseLayout
      );



      this.showStats = function(studentId) {
        if (!studentId) {
          this.userStats = null;
          return;
        }

        self.userStats = null;
        return scdDashboardApi.firstAid.getStats(studentId).then(function(stats) {
          self.userStats = stats;
          self.byCategory.layout = categoriesLayout(
            self.userStats,
            self.byCategory.baseLayout
          );
        });
      };
    }
  ])

  ;

})();

(function() {
  'use strict';

  angular.module('scdMisc.filters', []).

  filter('fullName', function() {
    return function(name) {
      return name.givenName + ' ' + name.familyName;
    };
  }).

  filter('percent', ['$window',
    function(window) {
      var d3 = window.d3,
        formatter = d3.format('.00%');

      return function(v) {
        return formatter(v);
      };
    }
  ]).

  filter('dash', function() {
    return function(v) {
      return v.replace(' ', '-');
    };
  }).


  filter('isEmpty', [
    '$window',
    function($window) {
      return function(obj) {
        if (!obj) {
          return true;
        }

        if (obj.length !== undefined) {
          return obj.length === 0;
        }

        return $window._.keys(obj).length === 0;
      };
    }
  ]).

  filter('rotate', function() {
    return function(angle) {
      return {
        '-webkit-transform': 'rotate(' + angle + 'deg)',
        '-moz-transform': 'rotate(' + angle + 'deg)',
        '-ms-transform': 'rotate(' + angle + 'deg)',
        'transform': 'rotate(' + angle + 'deg)'
      };
    };
  }).

  filter('portrait', function portraitFactory() {
    var googleImagePattern = /^([^?]+)\?sz=\d+$/;
    return function portrait(url, size) {
      var filteredUrl = url && googleImagePattern.exec(url);

      if (filteredUrl) {
        return filteredUrl[1] + '?sz=' + size;
      } else if (url) {
        return url + '=s' + size;
      } else {
        return (
          'https://lh3.googleusercontent.com/-XdUIqdMkCWA/' +
          'AAAAAAAAAAI/AAAAAAAAAAA/4252rscbv5M/photo.jpg?sz=' + size
        );
      }
    };
  })

  ;

})();

(function() {
  'use strict';

  angular.module('scdMisc.services', []).

    /**
   * Utility used to cache loaded collections and to pages through it.
   *
   * TODO: move it to misc module.
   *
   */
  factory('ScdPageCache', [

    function scdPageCacheFactory() {
      return function ScdPageCache(viewSize) {
        this.cache = [];
        this.viewSize = viewSize;
        this.viewPos = [0, 0];
        this.cursor = ''; // cursor of the last series of items added

        this.position = function() {
          return this.viewPos[0];
        };

        this.remaining = function() {
          return this.cache.length - this.viewPos[1];
        };

        this.hasMore = function() {
          if (this.remaining() > 0) {
            return true;
          }

          if ((this.viewPos[1] - this.viewPos[0]) < this.viewSize) {
            return false;
          }

          if (!this.cursor) {
            return false;
          }

          return true;
        };

        this.clear = function() {
          this.cache = [];
          this.viewPos = [0, 0];
        };

        this.add = function(items) {
          this.cache = this.cache.concat(items);
          this.cursor = items.cursor;
        };

        this.view = function() {
          return this.cache.slice(this.viewPos[0], this.viewPos[1]);
        };

        this.next = function(size) {
          size = size || this.viewSize;
          this.viewPos[0] = this.viewPos[1];
          this.viewPos[1] = Math.min(this.viewPos[1] + size, this.cache.length);
          return this.view();
        };

        this.prev = function(size) {
          size = size || this.viewSize;
          this.viewPos[1] = this.viewPos[0];
          this.viewPos[0] = Math.max(0, this.viewPos[0] - size);
          return this.view();
        };
      };
    }
  ])

  ;

})();

(function() {
  'use strict';

  angular.module('scdRepository.controllers', [
    'angularFileUpload',
    'scDashboard.services',
    'scdRepository.services',
    'scdSelector.services'
  ]).

  factory('scdRepositoryListCtrlInitialData', [
    '$q',
    'scdSelectedStudent',
    'scdRepositoryApi',
    function scdRepositoryListCtrlInitialDataFactory($q, scdSelectedStudent, scdRepositoryApi) {
      return function scdRepositoryListCtrlInitialData() {
        var selectorPromise = scdSelectedStudent();

        return $q.all({
          selector: selectorPromise,
          files: selectorPromise.then(function(selector) {
            if (!selector.selected || !selector.selected.studentId) {
              return [];
            }
            return scdRepositoryApi.getRepositoryById(selector.selected.studentId);
          }).catch(function(resp) {
            if (resp.status === 404) {
              return [];
            } else {
              return $q.reject(resp);
            }

          })
        });
      };
    }
  ]).

  controller('ScdRepositoryListCtrl', [
    '$window',
    '$q',
    'scdRepositoryApi',
    'initialData',
    'currentUser',
    function ScdRepositoryListCtrl($window, $q, scdRepositoryApi, initialData, currentUser) {
      var self = this,
        _ = $window._;

      this.files = initialData.files;
      this.selector = initialData.selector;
      this.currentUser = currentUser;

      this.listFile = function(studentId) {
        if (!studentId) {
          this.files = [];
          return $q.reject('You need to select a student.');
        }

        this.files = null;
        return scdRepositoryApi.getRepositoryById(studentId).then(function(list) {
          self.files = list;
          return list;
        }).catch(function(resp) {
          self.files = [];
          if (resp.status === 401) {
            self.error = 'You need to be logged to list a repository';
          } else if (resp.status === 403) {
            self.error = 'Only admin or staff can list the files of a student.';
          } else {
            self.error = 'Unexpected error while trying to fetch the file list';
          }
        });
      };

      this.showMore = function() {
        if (!this.files.cursor) {
          return $q.when(this.files);
        }

        return scdRepositoryApi.getRepositoryById(
          this.selector.selected.studentId, {cursor: this.files.cursor}
        ).then(function(list) {
          self.files = self.files.concat(list);
          self.files.cursor = list.cursor;
          return self.files;
        });
      };

      this.delete = function(file) {
        scdRepositoryApi.deleteDocument(file).then(function() {
          _.remove(self.files, {
            id: file.id
          });
        });
      };
    }
  ]).

  controller('ScdRepositoryUploadFileCtrl', [
    '$q',
    '$upload',
    'scdRepositoryApi',
    function ScdRepositoryUploadFileCtrl($q, $upload, scdRepositoryApi) {
      var self = this;

      this.docTypes = ['SHELF', 'USMLE', 'Peer Evaluations'];
      this.selected = {};

      function onProgress(evt) {
        self.progress = parseInt(100.0 * evt.loaded / evt.total, 10);
      }

      function onSucess(data, fileList) {
        fileList.unshift(data);
        self.success = 'New file uploaded.';
        self.selected.file = null;
        self.reset();
      }

      function uploadFile(student, file, fileList) {
        if (!student || !student.studentId) {
          return $q.reject('No student selected');
        }

        scdRepositoryApi.newUploadUrl(student.studentId).then(function(uploadInfo) {
          self.upload = $upload.upload({
            url: uploadInfo.url,
            method: 'POST',
            withCredentials: true,
            data: {
              name: self.fileMeta.name || file.name,
              docType: self.fileMeta.docType,
              destId: student.studentId
            },
            file: file
          }).progress(
            onProgress
          ).success(function(data) {
            onSucess(data, fileList);
          });
        });

      }

      this.reset = function() {
        this.fileMeta = {};
        this.selected.file = null;
        this.showProgress = false;
        this.progress = 0;
      };

      this.onFileSelect = function($files) {
        if (!$files || $files.lenght < 1) {
          self.selected.file = null;
          return;
        }
        self.selected.file = $files[0];
        this.fileMeta.name = $files[0].name;
      };

      this.uploadButtonClicked = function(student, file, fileList) {
        uploadFile(student, file, fileList);
        this.showProgress = true;
      };

      this.reset();
    }
  ])

  ;

})();

(function() {
  'use strict';

  angular.module('scdRepository.services', ['scDashboard.services']).

  factory('scdRepositoryApi', ['scdDashboardBaseApi',
    function(scdDashboardBaseApi) {
      return {
        getRepositoryById: function(studentId, params) {
          return scdDashboardBaseApi.one('repository', studentId).all('files').getList(params);
        },
        newUploadUrl: function(studentId) {
          return scdDashboardBaseApi.one('uploadurl').one('repository', studentId).post();
        },
        deleteDocument: function(doc) {
          return scdDashboardBaseApi.one('repository', doc.destId).one('files', doc.id).remove();
        }
      };
    }
  ])

  ;

})();

(function() {
  'use strict';

  angular.module('scdReview.controllers', [
    'scdSvg.services',
    'scDashboard.services',
    'scdMisc.filters',
    'scdMisc.services',
    'scdSelector.services'
  ]).

  /**
   * `scdReviewStatsCtrlInitialData`
   *
   * Resolve `initialData` for `ScdReviewStatsCtrl`.
   *
   */
  factory('scdReviewStatsCtrlInitialData', [
    '$q',
    'scdDashboardApi',
    'scdSelectedStudent',
    function scdReviewStatsCtrlInitialDataFactory($q, scdDashboardApi, scdSelectedStudent) {
      return function scdReviewStatsCtrlInitialData() {
        var params = {
            limit: 30,
            residents: 'all',
            topic: 'all',
            sortBy: 'performance'
          },
          selectorPromise = scdSelectedStudent(),
          studentsPromise = selectorPromise.then(function(selector) {
            // If the selector is not available, the current user cannot
            // see the stats either
            if (!selector.available) {
              return $q.reject('Only staff or admins can access this page.');
            }

            return scdDashboardApi.review.listStats(params);
          });


        return $q.all({
          selector: selectorPromise,
          params: params,
          students: studentsPromise,
          paramOptions: $q.all({

            residents: scdDashboardApi.users.listPgys().then(function(years) {
              return [{
                id: 'all',
                label: 'All Students',
              }].concat(years);
            }),

            topics: scdDashboardApi.review.listTopics().then(function(topics) {
              return [{
                id: 'all',
                label: 'All Categories'
              }].concat(topics);
            }),

            sortBy: [{
              id: 'performance',
              label: 'Performance',
            }, {
              id: 'percentageComplete',
              label: 'Percentage Complete'
            }]

          })
        });
      };
    }
  ]).

  controller('ScdReviewStatsCtrl', [
    '$location',
    '$window',
    'ScdLayout',
    'scdDashboardApi',
    'ScdPageCache',
    'initialData',
    function ScdReviewStatsCtrl($location, $window, ScdLayout, scdDashboardApi, ScdPageCache, initialData) {
      var self = this,
        _ = $window._,
        rowHeight = 25;

      function setStudent(students) {
        self.students = students;
        self.chartLayout = ScdLayout.contentSizing({
          innerWidth: 600,
          innerHeight: rowHeight * students.length,
          margin: {
            top: 20,
            right: 200,
            bottom: 50,
            left: 200
          }
        });
      }

      function setLegend(sortById) {
        var sortBy = _.find(
          self.filterOptions.sortBy, {
            id: sortById
          }
        );
        return {
          x: {
            label: sortBy.label,
            unit: '%'
          }
        };
      }

      this.pages = new ScdPageCache(initialData.params.limit);
      this.pages.add(initialData.students);
      this.filters = initialData.params;
      this.filterOptions = initialData.paramOptions;

      this.chartRef = null; // no average stats yet.
      this.chartLegend = setLegend(this.filters.sortBy);
      this.chartOptions = {
        getLabel: function(row) {
          return row.displayName;
        },
        getValue: function(row) {
          return row[self.filters.sortBy];
        },
        getValueAsString: function(row) {
          return row[self.filters.sortBy];
        }
      };

      setStudent(this.pages.next());

      /**
       * Query next page of student
       *
       */
      this.next = function(params) {
        params = _.clone(params);

        if (
          this.pages.cursor &&
          this.pages.remaining() < this.pages.viewSize
        ) {
          params.cursor = this.pages.cursor;
          scdDashboardApi.review.listStats(params).then(function(students) {
            self.pages.add(students);
            setStudent(self.pages.next());
          });
        } else {
          setStudent(this.pages.next());
        }
      };

      /**
       * Query previous page of student
       *
       */
      this.prev = function() {
        if (this.pages.position() > 0) {
          setStudent(this.pages.prev());
        }
      };

      /**
       * To be called after the parameter have been changed.
       *
       * It should query the student list with new parameters.
       *
       */
      this.filterChanged = function(params) {
        this.pages.clear();

        if (params.topic !== 'all') {
          params.sortBy = 'performance';
        }

        self.chartLegend = setLegend(params.sortBy);
        scdDashboardApi.review.listStats(params).then(function(students) {
          self.pages.add(students);
          setStudent(self.pages.next());
        });
      };

      this.showDetails = function(studentStats) {
        initialData.selector.select({
          studentId: studentStats.studentId
        }).then(function(){
          $location.path('/review');
        });
      };
    }
  ]).

  /**
   * Use to resolve `initialData` of `ScdReviewUserStatsCtrl`.
   *
   */
  factory('scdReviewUserStatsCtrlInitialData', [
    '$q',
    'scdSelectedStudent',
    'scdDashboardApi',
    function scdReviewUserStatsCtrlInitialDataFactory($q, scdSelectedStudent, scdDashboardApi) {
      return function scdReviewUserStatsCtrlInitialData() {
        var selectorPromise = scdSelectedStudent(),
          params = {
            ref: 'programAverage'
          };

        return $q.all({
          params: params,
          selector: selectorPromise,
          userStats: selectorPromise.then(function(selector) {
            if (!selector.selected || !selector.selected.studentId) {
              return null;
            }

            return scdDashboardApi.review.getStats(selector.selected.studentId, params).catch(function() {
              return null;
            });
          }),
          filterOptions: $q.all({
            refs: [{
              id: 'programAverage',
              label: 'Program Average'
            }]
          })
        });
      };
    }
  ]).

  /**
   * ScdReviewUserStatsCtrl
   *
   */
  controller('ScdReviewUserStatsCtrl', [
    '$window',
    'ScdLayout',
    'scdDashboardApi',
    'initialData',
    function ScdReviewUserStatsCtrl($window, ScdLayout, scdDashboardApi, initialData) {
      var self = this,
        _ = $window._;

      this.selector = initialData.selector;
      this.userStats = initialData.userStats;
      this.filters = initialData.params;
      this.filterOptions = initialData.filterOptions;

      function components(userStats) {
        var correct, left;
        if (!userStats) {
          return;
        }

        correct = userStats.performance * userStats.percentageComplete / 100;
        left = 100 - userStats.percentageComplete;

        return [{
          label: 'Correct',
          value: correct,
          id: 'correct'
        }, {
          label: 'Incorrect',
          value: 100 - correct - left,
          id: 'incorrect'
        }, {
          label: 'Unattempted',
          value: left,
          id: 'unattempted'
        }].filter(function(c) {
          return c.value > 0;
        });
      }

      function categoriesLayout(stats, baseLayout) {
        if (!stats || !stats.categoryPerformances) {
          return;
        }

        return new ScdLayout.contentSizing(_.assign({
            'innerHeight': stats.categoryPerformances.length * baseLayout.rowHeight
          },
          baseLayout
        ));
      }

      this.progress = {
        layout: ScdLayout.contentSizing({
          innerWidth: 300,
          innerHeight: 200,
          margin: {
            top: 120,
            right: 50,
            bottom: 30,
            left: 50
          },
        }),
        components: components(this.userStats)
      };

      this.passing = {
        layout: ScdLayout.contentSizing({
          innerWidth: 100,
          innerHeight: 50,
          margin: {
            top: 12,
            right: 12,
            bottom: 50,
            left: 12
          },
        }),
        steps: [{
          min: 0,
          max: 75,
          id: 'danger'
        }, {
          max: 90,
          id: 'warning'
        }, {
          max: 100,
          id: 'ok'
        }]
      };

      this.abem = {
        layout: this.passing.layout,
        steps: [{
          min: 0,
          max: 75,
          id: 'danger'
        }, {
          max: 100,
          id: 'ok'
        }]

      };

      this.byCategory = {
        layout: null,
        baseLayout: {
          rowHeight: 25,
          innerWidth: 600,
          margin: {
            top: 20,
            right: 200,
            bottom: 50,
            left: 200
          }
        },

        options: {
          getLabel: function(row) {
            return row.label;
          },
          hasRef: function() {
            return false;
          },
          getRef: function() {
            return null;
          },
          getUnit: function() {
            return '%';
          },
          getValue: function(row) {
            return row.performance;
          },
        }
      };
      this.byCategory.layout = categoriesLayout(
        this.userStats,
        this.byCategory.baseLayout
      );



      this.showStats = function(studentId) {
        if (!studentId) {
          this.userStats = null;
          return;
        }

        self.userStats = null;
        return scdDashboardApi.review.getStats(studentId).then(function(stats) {
          self.userStats = stats;
          self.progress.components = components(stats);
          self.byCategory.layout = categoriesLayout(
            self.userStats,
            self.byCategory.baseLayout
          );
        });
      };
    }
  ])

  ;

})();

(function() {
  'use strict';
  var yearPattern = /20\d{2}/g;


  angular.module('scdSelector.services', [
    'scDashboard.services'
  ]).

  /**
   * Keep tract of a selected student.
   *
   * Can be share by directive and controller to keep track of which student
   * the current user is watching or editing.
   *
   * If the current user is not an admin or staff, he won't be able to pick
   * a student; the selected user will be the current user
   * (assuming he's a student).
   *
   * Return a promising resolving to a selector object with the
   * following properties:
   *
   * - `selected` (Current selected student),
   * - `available` (can the current user select a student other than
   *   him / herself).
   * - `select(id)` to select a student.
   * - `search(filter)` to get a list of student that match
   *
   */
  factory('scdSelectedStudent', ['$window', 'scdDashboardApi', '$q',
    function($window, scdDashboardApi, $q) {
      var selector = null,
        selectorPromise = null,
        studentsPromise = null,
        searchParams = {},
        _ = $window._;

      function parseFilter(filter) {
        var name = [], years = [];

        filter.split(' ').forEach(function(token){
          if (yearPattern.test(token)) {
            years.push(token);
          } else if (token) {
            name.push(token);
          }
        });

        return {name: name.join(' '), years: years};
      }

      function filterStudents(selector, filter, limit) {
        var params = parseFilter(filter || '');

        params.limit = limit || 8;

        studentsPromise = $q.when(studentsPromise).then(function(){
          var diffYears = _.xor(params.years, searchParams.years);

          if (params.name === searchParams.name && diffYears.length === 0) {
            return selector._filteredStudents || [];
          }

          _.assign(searchParams, params);
          return scdDashboardApi.users.listStudents(params);
        }).then(function(studentList) {
          selector._filteredStudents = studentList;
          return studentList;
        })['finally'](function() {
          studentsPromise = null;
        });

        return studentsPromise;
      }

      return function() {
        if (selector) {
          return $q.when(selector);
        }

        if (selectorPromise) {
          return $q.when(selectorPromise);
        }

        selectorPromise = scdDashboardApi.auth.auth().then(function(user) {

          if (!user.isLoggedIn) {
            return $q.reject('You need to be logged in.');
          }

          selector = {
            _filteredStudents: [],
            students: [],
            selected: user,
            available: false,
            select: function(find) {
              return scdDashboardApi.users.getStudent(find.studentId).then(function(student){
                selector.selected = student;
                return student;
              });
            },
            search: function(filter) {
              return filterStudents(selector, filter);
            },
            filter: function(filter) {
              // If a student have been selected, the modele is now a student.
              // We just return the last selected student.
              if (filter && filter.displayName) {
                return [filter];
              }
              return selector.search(filter);
            }
          };

          if (!user.isStaff && !user.isAdmin) {
            return selector;
          }

          selector.available = true;
          scdDashboardApi.users.listStudents({limit: 0}).then(function(studentList){
            selector.students = studentList;
          });

          return selector;
        })['finally'](function(){
          selectorPromise = null;
        });

        return selectorPromise;
      };
    }
  ])

  ;

})();

(function() {
  'use strict';

  var yearPattern = /^20\d{2}$/;


  angular.module('scdStudents.controllers', [
    'angularFileUpload',
    'scDashboard.services'
  ]).

  /**
   * Use to resolve `initialData` of `ScdStudentListCtrl`.
   *
   */
  factory('scdStudentListCtrlInitialData', [
    '$q',
    'scdDashboardApi',
    function scdStudentListCtrlInitialDataFactory($q, scdDashboardApi) {
      return function scdStudentListCtrlInitialData() {
        var currentUserPromise = scdDashboardApi.auth.auth();
        return $q.all({
          currentUser: currentUserPromise,
          students: currentUserPromise.then(function(user) {
            if (!user.isStaff && !user.isAdmin) {
              return $q.reject(new Error('User should be staff or admin'));
            }

            return scdDashboardApi.users.listStudents();
          })
        });
      };
    }
  ]).

  /**
   * ScdStudentListCtrl
   *
   */
  controller('ScdStudentListCtrl', [
    '$window',
    '$q',
    'scdDashboardApi',
    'initialData',
    function ScdStudentListCtrl($window, $q, scdDashboardApi, initialData) {
      var self = this,
        _ = $window._;

      this.thisYear = (new Date()).getFullYear();
      this.currentUser = initialData.currentUser;
      this.students = initialData.students;
      this.loading = null;
      this.rawFilter = '';
      this.filter = {
        name: '',
        years: []
      };

      this.reload = function() {
        self.students = null;

        self.loading = $q.when(self.loading).then(function() {
          return scdDashboardApi.users.listStudents(self.filter);
        }).then(function(students) {
          self.students = students;
          return students;
        }).finally(function() {
          self.loading = null;
        });

        return self.loading;
      };


      this.getMore = function() {
        if (!self.students || !self.students.cursor) {
          return $q.when([]);
        }

        self.loading = $q.when(self.loading).then(function() {
          var params = {
            cursor: self.students.cursor,
          };
          return scdDashboardApi.users.listStudents(_.assign(params, self.filter));
        }).then(function(students) {
          self.students = self.students.concat(students);
          self.students.cursor = students.cursor;
          return students;
        }).finally(function() {
          self.loading = null;
        });

        return self.loading;
      };

      this.updateFilter = function(name, years) {
        var yearDiff = _.xor(self.filter.years, years);

        name = name.trim();

        if (self.filter.name === name && yearDiff.length === 0) {
          return $q.when(self.students);
        }

        self.filter = {
          name: name,
          years: years
        };

        return self.reload();
      };

      this.filterUpdated = function (filter) {
        var name = [],
          years = [];

        filter.split(' ').forEach(function(token){
          var dest = name;

          if (yearPattern.test(token)) {
            dest = years;
          }

          dest.push(token);
        });

        self.updateFilter(name.join(' '), years);
      };


      this.editName = {
        start: function(student) {
          student.editName = true;
          student.newName = {
            givenName: student.name.givenName,
            familyName: student.name.familyName,
            displayName: student.displayName
          };
        },

        updateDisplayName: function(student) {
          student.newName.displayName = student.newName.givenName + ' ' + student.newName.familyName;
        },

        save: function(student) {
          scdDashboardApi.users.saveStudentName(student.studentId, student.newName).then(function() {
            student.displayName = student.newName.displayName;
            student.name = {
              givenName: student.newName.givenName,
              familyName: student.newName.familyName
            };
            student.editName = false;
          });
        },

        cancel: function(student) {
          student.editName = false;
        }
      };

      this.editYear = {
        start: function(student) {
          student.editYear = true;
          student.newYear = {
            year: student.year,
          };
        },

        save: function(student) {
          scdDashboardApi.users.saveStudentYear(student.studentId, student.newYear).then(function() {
            student.year = student.newYear.year;
            student.editYear = false;
          });
        },

        cancel: function(student) {
          student.editYear = false;
        }
      };

      this.editEmail = {
        start: function(student) {
          student.editEmail = true;
          student.newEmail = {
            secondaryEmail: student.secondaryEmail,
          };
        },

        save: function(student) {
          scdDashboardApi.users.saveStudentEmail(student.studentId, student.newEmail).then(function() {
            student.secondaryEmail = student.newEmail.secondaryEmail;
            student.editEmail = false;
          });
        },

        cancel: function(student) {
          student.editEmail = false;
        }
      };

      this.deleteStudent = function(student) {
        scdDashboardApi.users.deleteStudent(student.studentId).then(function() {
          _.remove(self.students, {
            studentId: student.studentId
          });
        });
      };
    }
  ]).


  /**
   * ScdPortraitUploadListCtrl
   *
   */
  controller('ScdPortraitUploadListCtrl', [
    '$upload',
    'scdDashboardApi',
    function ScdPortraitUploadListCtrl($upload, scdDashboardApi) {
      var self = this;

      this.showForm = false;
      this.$upload = $upload;

      this.upload = function(student, $file) {

        scdDashboardApi.users.newStudentProfileUploadUrl().then(function(url) {
          return self.$upload.upload({
            url: url,
            method: 'POST',
            withCredentials: true,
            data: {
              studentId: student.studentId
            },
            file: $file[0]
          });
        }).then(function(resp) {
          student.image = {
            url: resp.data.url
          };
          self.showForm = false;
        });
      };
    }
  ]).


  /**
   * ScdNewStudentCtrl
   *
   */
  controller('ScdNewStudentCtrl', [
    'scdDashboardApi',
    function ScdNewStudentCtrl(scdDashboardApi) {
      var self = this;

      this.thisYear = (new Date()).getFullYear();

      this.updateDisplayName = function(student) {
        var givenName = student.name.givenName || '',
          familyName = student.name.familyName || '';

        student.displayName = givenName + ' ' + familyName;
      };

      this.addStudent = function(student, onSuccess) {
        onSuccess = onSuccess || angular.noop;
        scdDashboardApi.users.newStudent(student).then(function() {
          self.reset();
          return onSuccess();
        });
      };

      this.reset = function() {
        self.data = {
          studentId: null,
          displayName: null,
          name: {
            givenName: null,
            familyName: null
          },
          year: null,
          secondaryEmail: null
        };
      };

      this.reset();
    }
  ]).

  /**
   * ScdUploadYearCtrl
   *
   */
  controller('ScdUploadYearCtrl', [
    '$upload',
    'scdDashboardApi',
    function ScdUploadYearCtrl($upload, scdDashboardApi) {
      var yearPattern = /20\d{2}/;

      this.file = null;
      this.year = null;
      this.thisYear = (new Date()).getFullYear();
      this.inProgress = false;

      this.fileSelected = function($files, info) {
        var yearMatch;

        if ($files && $files.length > 0 && $files[0].type === 'text/csv') {
          info.file = $files[0];
        }

        if (info.file && info.file.name && !info.year) {
          yearMatch = yearPattern.exec(info.file.name);
          info.year = yearMatch ? parseInt(yearMatch[0], 10) : null;
        }
      };

      this.uploadFile = function(info, onSuccess) {
        onSuccess = onSuccess || angular.noop;

        info.inProgress = true;
        scdDashboardApi.users.newStudentUploadUrl().then(function(url) {
          return $upload.upload({
            url: url,
            method: 'POST',
            withCredentials: true,
            data: {
              year: info.year
            },
            file: info.file
          });
        }).then(function() {
          info.file = null;
          info.year = null;
        }).finally(function() {
          info.inProgress = false;
        });
      };
    }
  ]).

  /**
   * ScdArchiveYearCtrl
   *
   */
  controller('ScdArchiveYearCtrl', [
    '$window',
    'scdDashboardApi',
    function ScdArchiveYearCtrl($window, scdDashboardApi) {
      var self = this,
        _ = $window._;

      this.years = [];
      scdDashboardApi.users.listPgys().then(function(years) {
        self.years = _.filter(years, {
          isActive: true
        });
      });

      this.archiveYear = function(year, students) {
        scdDashboardApi.users.archivePgy(year.id).then(function() {
          _.remove(self.years, {
            id: year.id
          });
          _.remove(students, {
            year: year.id
          });
        });
      };
    }
  ])

  ;

})();

(function() {
  'use strict';

  angular.module('scdSvg.directives', []).

  /**
   * Directive to set the a `svg element `viewBox` attribute
   * and keep it responsive.
   *
   * With:
   *
   *  <svg ng-attr-viewBox="0 0 {{100}} {{100}}"/>
   *
   * Angular would produce the correct attribute but it would have no effect.
   * This directive edit the viewBox.baseVal property directly.
   *
   * Usage:
   *
   *   <scd-svg-container scd-viewbox="layout">
   *     <svg/>
   *   </scd-svg-container>
   *
   * where `$scope.layout == {width: 100, height: 100, margin:{top:10, left:20}}`
   *
   */
  directive('scdSvgContainer', function() {
    return {
      restrict: 'E',
      transclude: true,
      scope: {
        'viewBox': '=?scdViewbox'
      },
      template: '<div ng-transclude ng-style="container"></div>',
      link: function(scope, element) {
        var svg = element.find('svg');

        // Set css of the svg wrapper
        scope.container = {
          'display': 'inline-block',
          'position': 'relative',
          'width': '100%',
          'padding-bottom': '100%',
          'vertical-align': 'middle',
          'overflow': 'hidden'
        };

        // set css and attribute of the svg element
        svg.css({
          'display': 'inline-block',
          'position': 'absolute',
          'top': '0',
          'left': '0'
        });


        svg.get(0).setAttribute(
          'preserveAspectRatio', 'xMinYMin meet'
        );

        scope.$watch('viewBox', function() {
          var vb = scope.viewBox, ratio;

          if (!vb || !vb.height || !vb.width || !vb.margin) {
            return;
          }

          ratio = vb.height / vb.width;

          // set / update svg view port
          svg.get(0).setAttribute(
            'viewBox', [-vb.margin.left, -vb.margin.top, vb.width, vb.height].join(' ')
          );

          // adjust position of the svg element in the wrapper
          scope.container['padding-bottom'] = (ratio * 100) + '%';
        });
      }
    };
  })


  ;

})();

(function() {
  'use strict';

  angular.module('scdSvg.services', []).

  /**
   * Return a Layout object constructor.
   *
   * A Layout object has the following properties:
   * - `width` and `height`, to represent the svg total width and height
   * - `margin`, to represent the dimensions of the margin around the main
   * svg feature. For a chart it would contain the scales, legend, titles,
   * etc...
   * - `innerWdith` and `innerHeight` to represent the dimensions of the svg
   * main feature.
   *
   * ScdLayout includes 2 method to build the layout from
   * the content size (`ScdLayout.contentSizing`) or from the
   * box size (`ScdLayout.boxSizing`).
   *
   */
  factory('ScdLayout', ['$window',
    function($window) {
      var _ = $window._;

      function Layout(opts) {
        opts = opts || {};

        _.defaults(opts, {
          width: 400,
          height: 300,
          margin: {}
        });

        _.defaults(opts.margin, {
          top: 10,
          right: 10,
          bottom: 10,
          left: 10,
        });

        _.assign(this, opts);

        // Calculate inner height and width
        this.innerHeight = this.height - this.margin.top - this.margin.bottom;
        this.innerWidth = this.width - this.margin.right - this.margin.left;
      }

      Layout.contentSizing = function(opts) {
        opts = opts || {};

        _.defaults(opts, {
          innerWidth: 400,
          innerHeight: 300,
          margin: {}
        });

        _.defaults(opts.margin, {
          top: 10,
          right: 10,
          bottom: 10,
          left: 10,
        });

        return new Layout({
          height: opts.innerHeight + opts.margin.top + opts.margin.bottom,
          width: opts.innerWidth + opts.margin.right + opts.margin.left,
          margin: opts.margin
        });
      };

      Layout.boxSizing = function(opts) {
        return new Layout(opts);
      };

      return Layout;
    }
  ])


  ;

})();

(function() {
  'use strict';

  angular.module('scdUpload.directives', []).

  /**
   * The attribute should point to the property holding the file.
   *
   * The file value will be watched and the file input will be reset
   * if the property become false.
   *
   */
  directive('scdFile', [
    function scdFileFactory() {
      return {
        restrict: 'A',
        // arguments: scope, iElement, iAttrs, controller
        link: function scdFilePostLink(scope, elem, attr) {

          function resetValue() {
            elem.get(0).value = null;
          }
          elem.on('click', resetValue);
          elem.on('$destroy', function() {
            elem.off('click', resetValue);
          });

          scope.$watch(attr.scdFile, function(newVal) {
            if (!newVal) {
              resetValue();
            }
          });
        }
      };
    }
  ])

  ;

})();

(function() {
  'use strict';

  angular.module('scdUsers.controllers', [
    'scDashboard.services'
  ]).

  /**
   * Use to resolve `initialData` of `ScdUserListCtrl`.
   *
   */
  factory('scdUserListCtrlInitialData', [
    '$q',
    'scdDashboardApi',
    function scdUserListCtrlInitialDataFactory($q, scdDashboardApi) {
      return function scdUserListCtrlInitialData() {

        return $q.all({
          users: scdDashboardApi.users.listUsers(),
          currentUser: scdDashboardApi.auth.auth()
        });
      };
    }
  ]).

  /**
   * ScdUserListCtrl
   *
   */
  controller('ScdUserListCtrl', [
    '$window',
    '$q',
    'scdDashboardApi',
    'initialData',
    function ScdUserListCtrl($window, $q, scdDashboardApi, initialData) {
      var self = this,
        _ = $window._;

      this.users = initialData.users;
      this.currentUser = initialData.currentUser;

      this.getMore = function() {
        if (!this.users || !this.users.cursor) {
          return $q.when([]);
        }

        this.loading = $q.when(this.loading).then(function() {
          return scdDashboardApi.users.listUsers(self.users.cursor);
        }).then(function(users) {
          self.users = self.users.concat(users);
          self.users.cursor = users.cursor;
          return users;
        }).finally(function(){
          self.loading = null;
        });

        return this.loading;
      };

      this.switchStaff = function(user, input) {
        var promise, newValue = user.isStaff;

        input.disabled = true;
        if (!newValue) {
          promise = scdDashboardApi.users.revokeStaff(user);
        } else {
          promise = scdDashboardApi.users.makeStaff(user);
        }

        return promise.catch(function() {
          user.isStaff = !newValue;
          input.$setViewValue(!newValue);
        }).finally(function() {
          input.disabled = false;
        });
      };

      this.switchAdmin = function(user, input) {
        var promise, newValue = user.isAdmin;

        input.disabled = true;
        if (!newValue) {
          promise = scdDashboardApi.users.revokeAdmin(user);
        } else {
          promise = scdDashboardApi.users.makeAdmin(user);
        }

        return promise.catch(function() {
          user.isAdmin = !newValue;
          input.$setViewValue(!newValue);
        }).finally(function() {
          input.disabled = false;
        });
      };

      this.deleteUser = function(user) {
        scdDashboardApi.users.deleteUser(user.id).then(function() {
          _.remove(self.users, {
            id: user.id
          });
        });
      };
    }
  ]);

})();
