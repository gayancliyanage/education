/* jshint camelcase: false*/
/* global describe, beforeEach, it, inject, expect */

(function() {
  'use strict';

  describe('scDashboard.services', function() {
    var $httpBackend, apiRoot, fix, scope, $http;

    beforeEach(module('scDashboard.services', 'scDashboard.config', 'scDashboardMocked.fixtures'));

    beforeEach(inject(function($rootScope, _$httpBackend_, _$http_, SCD_API_BASE, SC_DASHBOARD_FIXTURES) {
      $httpBackend = _$httpBackend_;
      apiRoot = SCD_API_BASE;
      fix = SC_DASHBOARD_FIXTURES;
      scope = $rootScope;
      $http = _$http_;
    }));


    describe('scdDashboardBaseApi', function() {
      var api;

      beforeEach(inject(function(scdDashboardBaseApi) {
        api = scdDashboardBaseApi;
      }));

      it('should get collection as array', function() {
        $httpBackend.expectGET(apiRoot + '/foo').respond([]);
        api.all('foo').getList();
        $httpBackend.flush();
      });

      it('should get collection as object', function() {
        $httpBackend.expectGET(apiRoot + '/foo').respond({
          foo: []
        });
        api.all('foo').getList();
        $httpBackend.flush();
      });

      it('should get collection as object with explicit type', function() {
        var resp;

        $httpBackend.expectGET(apiRoot + '/foo').respond({
          type: 'bar',
          bar: [{
            foo: 2
          }]
        });
        api.all('foo').getList().then(function(_resp_) {
          resp = _resp_;
        });
        $httpBackend.flush();

        expect(resp[0].foo).toBe(2);
      });

      it('should get collection as object and include extra attributes', function() {
        var resp;

        $httpBackend.expectGET(apiRoot + '/foo').respond({
          foo: [],
          bar: 1
        });
        api.all('foo').getList().then(function(_resp_) {
          resp = _resp_;
        });
        $httpBackend.flush();

        expect(resp.bar).toBe(1);
      });
    });


    describe('scdDashboardApi', function() {
      var api;

      describe('scdDashboardApi.assessments', function() {

        beforeEach(inject(function(scdDashboardApi) {
          api = scdDashboardApi.assessments;
        }));

        it('should list all exams', function() {
          $httpBackend.expectGET(apiRoot + '/assessments/exams').respond([]);
          api.listExams();
          $httpBackend.flush();
        });

        it('should list all exams a student took part of', function() {
          $httpBackend.expectGET(apiRoot + '/assessments/exams?userId=1').respond([]);
          api.listExams(1);
          $httpBackend.flush();
        });

        it('should get an exam details', function() {
          $httpBackend.expectGET(apiRoot + '/assessments/exams/1234').respond({});
          api.getExamById('1234');
          $httpBackend.flush();
        });

        it('should get upload url', function() {
          $httpBackend.expectPOST(apiRoot + '/assessments/uploadurl').respond({
            url: '_upload/foo'
          });
          api.newUploadUrl();
          $httpBackend.flush();
        });
      });


      describe('scdDashboardApi.review', function() {

        beforeEach(inject(function(scdDashboardApi) {
          api = scdDashboardApi.review;
        }));

        it('should query student stats rank', function() {
          $httpBackend.expectGET(apiRoot + '/roshreview/stats').respond({
            stats: [],
            cursor: '',
          });
          api.listStats();
          $httpBackend.flush();
        });

        it('should query student stats rank with parameters', function() {
          var expected = {},
            params = {
              cursor: 'foo',
              residents: 'all',
              topic: 'all',
              stats: 'cumulativePerformance'
            },
            urlPattern = /roshreview\/stats\?(.+)$/;

          $httpBackend.expectGET(urlPattern).respond(function(m, url) {
            urlPattern.exec(url)[1].split('&').forEach(function(part) {
              var pair = part.split('=');
              expected[pair[0]] = pair[1];
            });
            return [200, {
              stats: [],
              cursor: '',
            }];
          });

          api.listStats(params);
          $httpBackend.flush();
          expect(expected).toEqual(params);
        });

        it('should query the topics', function() {
          $httpBackend.expectGET(apiRoot + '/roshreview/topic').respond([]);
          api.listTopics();
          $httpBackend.flush();
        });

        it('should query a student detailed stats', function() {
          var urlPattern = /\/roshreview\/stats\/([^\/]+)$/,
            studentId;

          $httpBackend.expectGET(urlPattern).respond(function(m, url) {
            studentId = urlPattern.exec(url)[1];
            return [200, {}];
          });
          api.getStats('A0001');
          $httpBackend.flush();

          expect(studentId).toBe('A0001');
        });

      });


      describe('scdDashboardApi.auth', function() {

        beforeEach(inject(function(scdDashboardApi) {
          api = scdDashboardApi.auth;
        }));

        it('query the server for the current user', function() {
          var info;

          $httpBackend.expectGET(fix.urls.login).respond(fix.data.user);

          api.auth().then(function(_info) {
            info = _info;
          });
          $httpBackend.flush();
          expect(info.displayName).toBeDefined();
          expect(info.displayName).toBe(fix.data.user.displayName);

        });

        it('query the server for the current user and the logout url', function() {
          var info;

          $httpBackend.expectGET(fix.urls.baseLogin + '?returnUrl=%2Ffoo').respond(fix.data.user);

          api.auth('/foo').then(function(_info) {
            info = _info;
          });
          $httpBackend.flush();
          expect(info.displayName).toBeDefined();
          expect(info.displayName).toBe(fix.data.user.displayName);

        });

        it('return the log in url for logged off users', function() {
          var info;

          $httpBackend.expectGET(fix.urls.baseLogin + '?returnUrl=%2Ffoo').respond(fix.data.loginError);

          api.auth('/foo').then(function(_info) {
            info = _info;
          });
          $httpBackend.flush();
          expect(info.loginUrl).toBe(fix.data.loginError.loginUrl);

        });

        it('should fail if the server failed to return the login info', function() {
          var info;

          $httpBackend.expectGET(fix.urls.baseLogin + '?returnUrl=%2Ffoo').respond(function() {
            return [500, 'Server error'];
          });

          api.auth('/foo').catch(function(_info) {
            info = _info;
          });

          $httpBackend.flush();
          expect(info.data).toBe('Server error');
          expect(info.status).toBe(500);

        });

        it('should merge concurrent requests', function() {
          var callCount = 0,
            users = [];

          $httpBackend.whenGET(fix.urls.login).respond(function() {
            callCount++;
            return [200, fix.data.user];
          });

          function saveUser(user) {
            users.push(user);
            return user;
          }

          api.auth().then(saveUser);
          api.auth().then(saveUser);

          $httpBackend.flush();
          expect(callCount).toBe(1);

          expect(users.length).toBe(2);
          expect(users[0].displayName).toEqual(fix.data.user.displayName);
          expect(users[1].displayName).toEqual(fix.data.user.displayName);
          expect(users[0]).toBe(users[1]);
        });

        it('should not fetch user data again if already fetch', function() {
          var callCount = 0,
            users = [];

          $httpBackend.whenGET(fix.urls.login).respond(function() {
            callCount++;
            return [200, fix.data.user];
          });

          function saveUser(user) {
            users.push(user);
            return user;
          }

          api.auth().then(saveUser);
          $httpBackend.flush();
          api.auth().then(saveUser);
          scope.$digest();
          expect(callCount).toBe(1);

          expect(users.length).toBe(2);
          expect(users[0].displayName).toEqual(fix.data.user.displayName);
          expect(users[1].displayName).toEqual(fix.data.user.displayName);
          expect(users[0]).toEqual(users[1]);
        });

        it('should reset user after 401 resp to relative url', function() {
          $httpBackend.expectGET(fix.urls.login).respond(fix.data.user);
          api.auth();
          $httpBackend.flush();

          $httpBackend.whenGET('/api/v1/foo/').respond(401, {});

          $http.get('/api/v1/foo/');
          $httpBackend.flush();
          scope.$digest();

          expect(api.info).toEqual({
            'loginUrl': fix.data.user.loginUrl,
            'error': undefined
          });
        });

        it('should reset user after 401 resp to a url to same domain', function() {
          $httpBackend.whenGET(fix.urls.login).respond(fix.data.user);
          api.auth();
          $httpBackend.flush();

          $httpBackend.whenGET(/http:\/\//).respond(401, {});

          expect(api.info.displayName).toEqual(fix.data.user.displayName);

          $http.get('http://server/foo/');
          $httpBackend.flush();

          expect(api.info).toEqual({
            'loginUrl': fix.data.user.loginUrl,
            'error': undefined
          });
        });

        it('should not reset user after 401 resp to other domain', function() {
          $httpBackend.whenGET(fix.urls.login).respond(fix.data.user);
          api.auth();
          $httpBackend.flush();

          $httpBackend.whenGET(/http:\/\//).respond(401, {});

          expect(api.info.displayName).toEqual(fix.data.user.displayName);

          $http.get('http://example.com/api');
          $httpBackend.flush();

          expect(api.info.displayName).toEqual(fix.data.user.displayName);
        });

        it('should keep user.loginUrl after 401 resp', function() {
          $httpBackend.whenGET(fix.urls.login).respond({
            loginUrl: '/login'
          });
          api.auth();
          $httpBackend.flush();

          expect(api.info.loginUrl).toEqual('/login');

          $httpBackend.whenGET('/api/v1/foo/').respond(function() {
            return [401, {}];
          });

          $http.get('/api/v1/foo/');
          $httpBackend.flush();

          expect(api.info.loginUrl).toEqual('/login');
        });

      });

    });

  });

})();
