/* jshint camelcase: false*/
/* global describe, beforeEach, it, inject, expect, _ */

(function() {
  'use strict';

  describe('scceUser.services', function() {
    var $httpBackend, scope, $http, fix;

    beforeEach(module('scceUser.services', 'scCoreEducationMocked.fixtures'));

    beforeEach(inject(function(_$httpBackend_, $rootScope, _$http_, SC_CORE_EDUCATION_FIXTURES) {
      $httpBackend = _$httpBackend_;
      scope = $rootScope.$new();
      $http = _$http_;
      fix = SC_CORE_EDUCATION_FIXTURES;
    }));

    describe('scceCurrentUserApi', function() {
      var currentUserApi, user;

      beforeEach(inject(function(scceCurrentUserApi) {
        currentUserApi = scceCurrentUserApi;
        user = _.assign({}, fix.data.user);
      }));

      it('query the server for the current user', function() {
        var info;

        $httpBackend.expectGET(/\/api\/v1\/user\?returnUrl=.*/).respond(user);

        currentUserApi.auth().then(function(_info) {
          info = _info;
        });
        $httpBackend.flush();
        expect(info.displayName).toBeDefined();
        expect(info.displayName).toBe(fix.data.user.displayName);

      });

      it('query the server for the current user and the logout url', function() {
        var info;

        $httpBackend.expectGET('/api/v1/user?returnUrl=%2Ffoo').respond(user);

        currentUserApi.auth('/foo').then(function(_info) {
          info = _info;
        });
        $httpBackend.flush();
        expect(info.displayName).toBeDefined();
        expect(info.displayName).toBe(fix.data.user.displayName);

      });

      it('return the log in url for logged off users', function() {
        var info;

        $httpBackend.expectGET('/api/v1/user?returnUrl=%2Ffoo').respond(fix.data.loginError);

        currentUserApi.auth('/foo').then(function(_info) {
          info = _info;
        });
        $httpBackend.flush();
        expect(info.loginUrl).toBe(fix.data.loginError.loginUrl);

      });

      it('should fail if the server failed to return the login info', function() {
        var info;

        $httpBackend.expectGET('/api/v1/user?returnUrl=%2Ffoo').respond(function() {
          return [500, 'Server error'];
        });

        currentUserApi.auth('/foo').
        catch(function(_info) {
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
          return [200, user];
        });

        function saveUser(user) {
          users.push(user);
          return user;
        }

        currentUserApi.auth().then(saveUser);
        currentUserApi.auth().then(saveUser);

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
          return [200, user];
        });

        function saveUser(user) {
          users.push(user);
          return user;
        }

        currentUserApi.auth().then(saveUser);
        $httpBackend.flush();
        currentUserApi.auth().then(saveUser);
        scope.$digest();
        expect(callCount).toBe(1);

        expect(users.length).toBe(2);
        expect(users[0].displayName).toEqual(fix.data.user.displayName);
        expect(users[1].displayName).toEqual(fix.data.user.displayName);
        expect(users[0]).toEqual(users[1]);
      });

      it('should reset user after 401 resp to relative url', function() {
        $httpBackend.whenGET(fix.urls.login).respond(user);
        currentUserApi.auth();
        $httpBackend.flush();

        $httpBackend.whenGET('/api/v1/foo/').respond(function() {
          return [401, {}];
        });

        $http.get('/api/v1/foo/');
        $httpBackend.flush();

        expect(currentUserApi.info).toEqual({
          'loginUrl': fix.data.user.loginUrl,
          'error': undefined
        });
      });

      it('should reset user after 401 resp to a url to same domain', function() {
        $httpBackend.whenGET(fix.urls.login).respond(user);
        currentUserApi.auth();
        $httpBackend.flush();

        $httpBackend.whenGET(/http:\/\//).respond(function() {
          return [401, {}];
        });

        expect(currentUserApi.info.displayName).toEqual(fix.data.user.displayName);

        $http.get('http://server/foo/');
        $httpBackend.flush();

        expect(currentUserApi.info).toEqual({
          'loginUrl': fix.data.user.loginUrl,
          'error': undefined
        });
      });

      it('should not reset user after 401 resp to other domain', function() {
        $httpBackend.whenGET(fix.urls.login).respond(user);
        currentUserApi.auth();
        $httpBackend.flush();

        $httpBackend.whenGET(/http:\/\//).respond(function() {
          return [401, {}];
        });

        expect(currentUserApi.info.displayName).toEqual(fix.data.user.displayName);

        $http.get('http://example.com/api');
        $httpBackend.flush();

        expect(currentUserApi.info.displayName).toEqual(fix.data.user.displayName);
      });

      it('should keep user.loginUrl after 401 resp', function() {
        $httpBackend.whenGET(fix.urls.login).respond({
          loginUrl: '/login'
        });
        currentUserApi.auth();
        $httpBackend.flush();

        expect(currentUserApi.info.loginUrl).toEqual('/login');

        $httpBackend.whenGET('/api/v1/foo/').respond(function() {
          return [401, {}];
        });

        $http.get('/api/v1/foo/');
        $httpBackend.flush();

        expect(currentUserApi.info.loginUrl).toEqual('/login');
      });

    });

    describe('scceUsersApi', function() {
      var usersApi, users;

      beforeEach(inject(function(scceUsersApi) {
        usersApi = scceUsersApi;
        users = fix.data.userList;
      }));

      describe('all', function() {

        it('should query all users', function() {
          $httpBackend.expectGET(fix.urls.users).respond(
            JSON.stringify({
              type: 'users',
              users: _.map(users),
              cursor: 'foo'
            })
          );

          usersApi.all();
          $httpBackend.flush();
        });

        it('should return a promise', function() {
          expect(usersApi.all().then).toBeDefined();
        });

        it('should return a promise resolving to an array of user', function() {
          var data;

          $httpBackend.whenGET(fix.urls.users).respond(
            JSON.stringify({
              type: 'users',
              users: _.map(users),
              cursor: 'foo'
            })
          );

          usersApi.all().then(function(users) {
            data = users;
          });
          $httpBackend.flush();

          expect(data.length > 0).toBe(true);
          expect(data.length).toBe(_.map(users).length);
        });

        it('should return promise resolving to array with a cursor', function() {
          var data;

          $httpBackend.whenGET(fix.urls.users).respond(
            JSON.stringify({
              type: 'users',
              users: _.map(users),
              cursor: 'foo'
            })
          );

          usersApi.all().then(function(users) {
            data = users;
          });
          $httpBackend.flush();

          expect(data.cursor).toBe('foo');
        });

        it('should delete users', function() {
          var req, userId;

          $httpBackend.whenDELETE(fix.urls.oneUser).respond(function(m, url, body) {
            userId = fix.urls.oneUser.exec(url)[1];
            req = body;
            return [200, {}];
          });
          usersApi.deleteUser('1234');
          $httpBackend.flush();

          expect(userId).toBe('1234');
          expect(req).toBe(null);
        });

      });


      describe('students', function() {

        it('should query students users', function() {
          $httpBackend.expectGET(fix.urls.students).respond(
            JSON.stringify({
              type: 'students',
              students: [],
              cursor: 'foo'
            })
          );

          usersApi.listStudents();
          $httpBackend.flush();
        });

        it('should return a promise', function() {
          expect(usersApi.listStudents().then).toBeDefined();
        });

        it('should query an upload URL', function() {
          var url;

          $httpBackend.expectPOST(fix.urls.newStudentUploadUrl).respond({
            url: '/foo'
          });
          usersApi.newStudentUploadUrl().then(function(_url_) {
            url = _url_;
          });

          $httpBackend.flush();
          expect(url).toBe('/foo');
        });

        it('should get the list of year', function() {
          var years;

          $httpBackend.expectGET(fix.urls.pgy).respond(
            [2015, 2016, 2017, 2018]
          );
          usersApi.listPgys().then(function(resp) {
            years = resp;
          });

          $httpBackend.flush();
        });

        it('should delete student', function() {
          var req, studentId;

          $httpBackend.expectDELETE(fix.urls.oneStudent).respond(function(m, url, body) {
            req = body;
            studentId = fix.urls.oneStudent.exec(url)[1];
            return [200, {}];
          });
          usersApi.deleteStudent('A1234');
          $httpBackend.flush();

          expect(studentId).toBe('A1234');
          expect(req).toBe(null);
        });

        it('should edit student names', function() {
          var req, studentId, name={
            givenName: 'foo',
            familyName: 'bar',
            displayName: 'foo bar'
          };

          $httpBackend.expectPUT(fix.urls.oneStudentName).respond(function(m, url, body) {
            req = JSON.parse(body);
            studentId = fix.urls.oneStudentName.exec(url)[1];
            return [200, {}];
          });
          usersApi.saveStudentName('A1234', name);

          $httpBackend.flush();

          expect(studentId).toBe('A1234');
          expect(req).toEqual(name);
        });

      });


      describe('staff', function() {

        it('should query staff users', function() {
          $httpBackend.expectGET(fix.urls.staff).respond(
            JSON.stringify({
              type: 'users',
              users: _(users).map().filter(function(user) {
                return user.isStaff;
              }).value(),
              cursor: 'foo'
            })
          );

          usersApi.staff();
          $httpBackend.flush();
        });

        it('should return a promise', function() {
          expect(usersApi.staff().then).toBeDefined();
        });

        it('should return a promise resolving to an array of user', function() {
          var data;

          $httpBackend.whenGET(fix.urls.staff).respond(
            JSON.stringify({
              type: 'users',
              users: _(users).map().filter(function(user) {
                return user.isStaff;
              }).value(),
              cursor: 'foo'
            })
          );

          usersApi.staff().then(function(users) {
            data = users;
          });
          $httpBackend.flush();

          expect(data.length > 0).toBe(true);
          expect(data.length).toBe(_(users).map().filter(function(user) {
            return user.isStaff;
          }).value().length);
        });

        it('should return promise resolving to array with a cursor', function() {
          var data;

          $httpBackend.whenGET(fix.urls.staff).respond(
            JSON.stringify({
              type: 'users',
              users: _(users).map().filter(function(user) {
                return user.isStaff;
              }).value(),
              cursor: 'foo'
            })
          );

          usersApi.staff().then(function(users) {
            data = users;
          });
          $httpBackend.flush();

          expect(data.cursor).toBe('foo');
        });

      });

      describe('makeStaff/revokeStaff', function() {

        it('should put a new staff', function() {
          $httpBackend.expectPUT('/api/v1/staff/12345').respond({});
          usersApi.makeStaff({
            id: '12345'
          });
          $httpBackend.flush();
        });

        it('should delete a staff', function() {
          var req;

          $httpBackend.expectDELETE('/api/v1/staff/12345').respond(function(m, u, body){
            req = body;
            return [200, {}];
          });
          usersApi.revokeStaff({
            id: '12345'
          });
          $httpBackend.flush();

          expect(req).toBe(null);
        });

      });

      describe('getById', function() {

        it('should get one user info', function() {
          $httpBackend.expectGET('/api/v1/users/12345').respond({});
          usersApi.getById('12345');
          $httpBackend.flush();
        });

      });

    });
  });

})();
