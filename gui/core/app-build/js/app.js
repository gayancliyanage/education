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

(function() {
  'use strict';

  angular.module('scCoreEducation.config', []).

  constant('SCCE_API_BASE', '/api/v1')

  ;
})();
(function() {
  'use strict';

  var respInterceptor = function(data, operation, what) {
      var resp;

      if (operation !== 'getList' || angular.isArray(data)) {
        return data;
      }

      if (!data) {
        resp = [];
        resp.cursor = null;
        return resp;
      }

      if (data.type && data[data.type]) {
        resp = data[data.type];
      } else if (data[what]) {
        resp = data[what];
      } else {
        resp = [];
      }

      resp.cursor = data.cursor ? data.cursor : null;
      return resp;
    },
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

  angular.module('scCoreEducation.services', ['restangular', 'scCoreEducation.config']).

  factory('scceApi', ['Restangular', 'SCCE_API_BASE',
    function(Restangular, SCCE_API_BASE) {
      return {
        client: function(appName) {
          return Restangular.withConfig(function(RestangularConfigurer) {
            RestangularConfigurer.setBaseUrl(SCCE_API_BASE);
            RestangularConfigurer.setFullRequestInterceptor(reqInterceptor);
            RestangularConfigurer.addResponseInterceptor(respInterceptor);
            RestangularConfigurer.setDefaultHeaders({
              'X-App-Name': appName
            });
          });
        }
      };
    }
  ])

  ;
})();

(function() {
  'use strict';

  angular.module('scCoreEducation.controllers', []).

  controller('scceNavBarCtrl', ['$scope', '$location',
    function($scope, $location) {

      $scope.isActive = function(route) {
        return route === $location.path();
      };
    }
  ]).

  controller('scceHomeCtrl', ['$scope',
    function($scope) {
      $scope.files = {};
    }
  ])

  ;

})();
(function() {
  'use strict';

  angular.module('scceSvg.directives', []).

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
   *   <scce-svg-container scce-viewbox="layout">
   *     <svg/>
   *   </scce-svg-container>
   *
   * where `$scope.layout == {width: 100, height: 100, margin:{top:10, left:20}}`
   *
   */
  directive('scceSvgContainer', function() {
    return {
      restrict: 'E',
      transclude: true,
      scope: {
        'viewBox': '=?scceViewbox'
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

  angular.module('scceSvg.services', []).

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
   * ScceLayout includes 2 method to build the layout from
   * the content size (`ScceLayout.contentSizing`) or from the
   * box size (`ScceLayout.boxSizing`).
   *
   */
  factory('ScceLayout', ['$window',
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

  angular.module('scceUpload.directives', []).

  /**
   * The attribute should point to the property holding the file.
   *
   * The file value will be watched and the file input will be reset
   * if the property become false.
   *
   */
  directive('scceFile', [
    function scceFileFactory() {
      return {
        restrict: 'A',
        // arguments: scope, iElement, iAttrs, controller
        link: function scceFilePostLink(scope, elem, attr) {

          elem.bind('click', function() {
            this.value = null;
          });

          scope.$watch(attr.scceFile, function(newVal) {
            if (!newVal) {
              elem.get(0).value = null;
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

  var googleImage = /^(.+)?sz=\d+$/,
    module = angular.module('scceUser.controllers', [
      'angularFileUpload',
      'scceUser.services'
    ]);

  // Generic user/student list

  module.controller('ScceUserListCtrl', [
    '$window',
    '$q',
    '$upload',
    'scceUsersApi',
    'getList',
    'initialList',
    'userType',
    'currentUser',
    function ScceUserListCtrl($window, $q, $upload, scceUsersApi, getList, initialList, userType, currentUser) {
      var self = this,
        _ = $window._;

      this.currentUser = currentUser;
      this.users = initialList;
      this.userType = userType;
      this.loading = null;
      this.upload = {
        file: null,
        year: null,
        inProgress: false
      };

      this.updateUserList = function() {
        this.loading = $q.when(this.loading).then(function() {
          return getList();
        }).then(function(users) {
          self.users = users;
          self.loading = null;
          return users;
        });

        return this.loading;
      };

      this.getMore = function() {
        if (!this.users || !this.users.cursor) {
          return $q.when([]);
        }

        this.loading = $q.when(this.loading).then(function() {
          return getList(self.users.cursor);
        }).then(function(users) {
          self.users = self.users.concat(users);
          self.users.cursor = users.cursor;
          self.loading = null;
          return users;
        });

        return this.loading;
      };

      this.switchStaff = function(user, input) {
        var promise, originalValue = user.isStaff;

        input.disabled = true;
        if (user.isStaff) {
          promise = scceUsersApi.revokeStaff(user);
        } else {
          promise = scceUsersApi.makeStaff(user);
        }

        return promise.then(function() {
          user.isStaff = !originalValue;
        }).catch(function(){
          user.isStaff = originalValue;
          input.$setViewValue(originalValue);
        }).finally(function(){
          input.disabled = false;
        });
      };

      this.switchAdmin = function(user, input) {
        var promise, originalValue = user.isAdmin;

        input.disabled = true;
        if (user.isAdmin) {
          promise = scceUsersApi.revokeAdmin(user);
        } else {
          promise = scceUsersApi.makeAdmin(user);
        }

        return promise.then(function() {
          user.isAdmin = !originalValue;
        }).catch(function(){
          user.isAdmin = originalValue;
          input.$setViewValue(originalValue);
        }).finally(function(){
          input.disabled = false;
        });
      };

      this.fileSelected = function($files, info) {
        info.file = $files[0];
      };

      this.uploadFile = function(info) {
        this.inProgress = true;
        scceUsersApi.newStudentUploadUrl().then(function(url) {
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

      this.deleteUser = function(user) {
        scceUsersApi.deleteUser(user.id).then(function(){
          _.remove(self.users, {id: user.id});
        });
      };

      this.deleteStudent = function(user) {
        scceUsersApi.deleteStudent(user.studentId).then(function(){
          _.remove(self.users, {studentId: user.studentId});
        });
      };

      this.editUserName = function(user) {
        user.editName = true;
        user.newName = {
          givenName: user.name.givenName,
          familyName: user.name.familyName,
          displayName: user.displayName
        };
      };

      this.updateNewDisplayName = function(user) {
        user.newName.displayName = user.newName.givenName + ' ' + user.newName.familyName;
      };

      this.saveUserName = function(user) {
        scceUsersApi.saveStudentName(user.studentId, user.newName).then(function(){
          user.displayName = user.newName.displayName;
          user.name = {
            givenName: user.newName.givenName,
            familyName: user.newName.familyName
          };
          user.editName = false;
        });
      };

      this.cancelEditName = function(user) {
        user.editName = false;
      };
    }
  ]);


  // Controller to upload student portrait

  function SccePortraitUploadListCtrl($upload, scceUsersApi) {
    this.showForm = false;
    this.$upload = $upload;
    this.scceUsersApi = scceUsersApi;
  }
  SccePortraitUploadListCtrl.$inject = ['$upload', 'scceUsersApi'];

  SccePortraitUploadListCtrl.prototype.image = function(image, size) {
    if (!image || !image.url) {
      return 'https://lh3.googleusercontent.com/-XdUIqdMkCWA/AAAAAAAAAAI/AAAAAAAAAAA/4252rscbv5M/photo.jpg?sz=' + size;
    } else if (googleImage.test(image.url)) {
      return googleImage.exec(image.url)[1] + 'sz=' + size;
    } else {
      return image.url + '=s' + size;
    }

  };

  SccePortraitUploadListCtrl.prototype.upload = function(student, $file) {
    var self = this;

    this.scceUsersApi.newStudentProfileUploadUrl().then(function(url) {
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
      console.log(resp.data);
      student.image = {
        url: resp.data.url
      };
      self.showForm = false;
    });
  };

  module.controller('SccePortraitUploadListCtrl', SccePortraitUploadListCtrl);


  // Controller to archive student of specific years

  module.controller('ScceArchiveYearCtrl', [
    '$window',
    'scceUsersApi',
    function ScceArchiveYearCtrl($window, scceUsersApi) {
      var self = this,
        _ = $window._;

      this.years = [];
      scceUsersApi.listPgys().then(function(years){
        self.years = _.filter(years, {isActive: true});
      });

      this.archiveYear = function(year, students) {
        scceUsersApi.archivePgy(year.id).then(function() {
          _.remove(self.years, {id: year.id});
          _.remove(students, {year: year.id});
        });
      };
    }
  ]);

})();

(function() {
  'use strict';

  angular.module(
    'scceUser.directives', ['scceUser.services', 'scCoreEducation.templates']
  ).

  /**
   * Directive creating a login info link for a boostrap navbar
   */
  directive('scceUserLogin', function() {
    return {
      restrict: 'E',
      replace: true,
      templateUrl: 'views/sccoreeducation/user/login.html',
      scope: {},
      controller: ['$scope', 'scceCurrentUserApi',
        function($scope, scceCurrentUserApi) {
          $scope.user = scceCurrentUserApi;
          scceCurrentUserApi.auth();
        }
      ]
    };
  });

})();
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
