/* jshint bitwise: false*/

(function() {
  'use strict';

  angular.module('scDashboardMocked', ['scDashboard', 'ngMockE2E', 'scDashboardMocked.fixtures']).

  run(['$httpBackend', '$window', 'SC_DASHBOARD_FIXTURES',
    function($httpBackend, $window, fixtures) {
      var _ = $window._;
      var  files = {};
      var  students = fixtures.data.students;

      // Login
      $httpBackend.whenGET(fixtures.urls.login).respond(fixtures.data.user);

      // User list
      $httpBackend.whenGET(fixtures.urls.users).respond(fixtures.data.users);

      // Complete Student list
      $httpBackend.whenGET(fixtures.urls.allStudents).respond({
        students: Object.keys(students).map(function(id) {
          return students[id];
        }),
        cursor: null
      });

      // Filtered Student list
      $httpBackend.whenGET(fixtures.urls.students).respond({
        students: Object.keys(students).map(function(id) {
          return students[id];
        }),
        cursor: null
      });

      // Edit student attribute
      $httpBackend.whenPUT(fixtures.urls.studentAttribute).respond({});

      // remove student
      $httpBackend.whenDELETE(fixtures.urls.oneStudent).respond({});

      // Files
      files = {};
      Object.keys(students).forEach(function(id) {
        var dest = students[id];
        files[dest.studentId] = fixtures.data.files(dest, Math.round(Math.random() * 10));
      });

      // Get file list
      $httpBackend.whenGET(fixtures.urls.studentFiles).respond(function(m, url) {
        var studentId = fixtures.urls.studentFiles.exec(url)[1],
          resp = {
            files: []
          };

        if (files[studentId]) {
          resp.files = files[studentId];
        }
        return [200, resp];
      });

      var lastStudentId, newFileCount = 1;

      // upload file url
      $httpBackend.whenPOST(fixtures.urls.uploadUrl).respond(function(m, url) {
        lastStudentId = fixtures.urls.uploadUrl.exec(url)[1];
        return [200, fixtures.data.uploadUrl];
      });

      // upload file
      $httpBackend.whenPOST(fixtures.urls.upload).respond(function() {
        var dest = _.find(students, {studentId: lastStudentId});
        return [
          200,
          fixtures.data.newFile(
            'new file ' + newFileCount++,
            dest.studentId,
            dest.displayName
          )
        ];
      });

      // Delete file
      $httpBackend.whenDELETE(fixtures.urls.oneStudentFile).respond(function() {
        return [200, {'success': true}];
      });


      /* Rosh Review */

      // pgy list
      $httpBackend.whenGET(fixtures.urls.pgy).respond(fixtures.data.pgy);

      // Topics
      $httpBackend.whenGET(fixtures.urls.roshReviewTopics).respond(fixtures.data.roshReviewTopics);

      // Global stats
      $httpBackend.whenGET(fixtures.urls.roshReviewStats).respond(fixtures.data.roshReviewStats);

      // student stats
      $httpBackend.whenGET(fixtures.urls.oneStudentRoshReviewStats).respond(function(m, url) {
        var studentId = fixtures.urls.oneStudentRoshReviewStats.exec(url)[1];
        var student = _.find(students, {'studentId': studentId});
        return [200, fixtures.data.roshReviewUserStats(student.displayName, studentId)];
      });


      /* First aid */
      $httpBackend.whenGET(fixtures.urls.firstAidTopics).respond(fixtures.data.firstAidTopics);

      // Gobal stats
      $httpBackend.whenGET(fixtures.urls.firstAidStats).respond(fixtures.data.firstAidStats);

      // student stats
      $httpBackend.whenGET(fixtures.urls.oneStudentFirstAidStats).respond(function(m, url) {
        var studentId = fixtures.urls.oneStudentFirstAidStats.exec(url)[1];
        var student = _.find(students, {'studentId': studentId});
        return [200, fixtures.data.firstAidUserStats(student.displayName, studentId)];
      });


      // Everything else go.
      $httpBackend.whenGET(/.*/).passThrough();
    }
  ])

  ;

})();
