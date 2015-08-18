/* jshint camelcase: false*/
/* global describe, beforeEach, it, inject, expect */

(function() {
  'use strict';

  describe('scdSelector.services', function() {
    var $httpBackend, scope, auth, fix;

    beforeEach(module('scdSelector.services', 'scDashboardMocked.fixtures', 'scDashboard.services'));

    beforeEach(inject(function(_$rootScope_, _$httpBackend_, scdDashboardApi, SC_DASHBOARD_FIXTURES) {
      $httpBackend = _$httpBackend_;
      fix = SC_DASHBOARD_FIXTURES;
      scope = _$rootScope_;
      auth = scdDashboardApi.auth;
    }));

    describe('scdSelectedStudent', function() {
      var selectorService;

      beforeEach(inject(function(scdSelectedStudent) {
        selectorService = scdSelectedStudent;
      }));

      it('should query the current user', function() {
        $httpBackend.expectGET(fix.urls.login).respond(function() {
          return [200, {
            error: 'not logged in',
            isLoggedIn: false
          }];
        });
        selectorService();
        $httpBackend.flush();
      });

      it('should fail if the user is not logged in', function() {
        var hasFailed = false;

        $httpBackend.whenGET(fix.urls.login).respond(function() {
          return [200, {
            error: 'not logged in',
            isLoggedIn: false
          }];
        });
        selectorService().catch(function() {
          hasFailed = true;
        });
        $httpBackend.flush();

        expect(hasFailed).toBeTruthy();
      });

      it('should resolve to a selector pointing to the current user if he/she is a student', function() {
        var selector;

        $httpBackend.whenGET(fix.urls.login).respond(fix.data.studentUser);

        selectorService().then(function(_selector_) {
          selector = _selector_;
        });
        $httpBackend.flush();
        expect(selector.selected.studentId).toBe(fix.data.studentUser.studentId);
      });

      it('should query the student list when the user is an admin', function() {
        $httpBackend.whenGET(fix.urls.login).respond(fix.data.user);
        $httpBackend.expectGET(fix.urls.allStudents).respond([]);
        selectorService();
        $httpBackend.flush();
      });

      it('should set the list of student when the user is an admin', function() {
        var selector;

        $httpBackend.whenGET(fix.urls.login).respond(fix.data.user);
        $httpBackend.whenGET(fix.urls.allStudents).respond({
          students: Object.keys(fix.data.students).map(function(id) {
            return fix.data.students[id];
          }),
          cursor: null
        });

        selectorService().then(function(_selector_) {
          selector = _selector_;
        });
        $httpBackend.flush();
        expect(selector.students.length).toBe(2);
        expect(selector.students[0].id).toBe('12345');
      });

      it('should merge selector request', function() {
        var count = 0;

        $httpBackend.whenGET(fix.urls.login).respond(fix.data.user);
        $httpBackend.expectGET(fix.urls.allStudents).respond(function() {
          count++;
          return [200, []];
        });

        selectorService();
        selectorService();
        $httpBackend.flush();

        selectorService();
        expect(count).toBe(1);
        $httpBackend.verifyNoOutstandingRequest();
      });

      it('should retry if it failed', function() {
        var selector;

        $httpBackend.expectGET(fix.urls.login).respond({
          error: 'not logged in',
          isLoggedIn: false
        }, 401);
        selectorService();
        $httpBackend.flush();
        auth.reset();

        $httpBackend.expectGET(fix.urls.login).respond(fix.data.user);
        $httpBackend.expectGET(fix.urls.allStudents).respond({
          students: Object.keys(fix.data.students).map(function(id) {
            return fix.data.students[id];
          }),
          cursor: null
        });


        selectorService().then(function(_selector_) {
          selector = _selector_;
        });
        $httpBackend.flush();

        expect(selector.students.length).toBe(2);
      });

    });

  });

})();
