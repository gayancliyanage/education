(function() {
  'use strict';

  function echo(m, u, body) {
    var data = JSON.parse(body);
    return [200, data];
  }


  angular.module('scCoreEducationMocked', [
    'scCoreEducation', 'ngMockE2E', 'scCoreEducationMocked.fixtures'
  ]).


  run(function($httpBackend, $window, SC_CORE_EDUCATION_FIXTURES) {
    var fix = SC_CORE_EDUCATION_FIXTURES,
      _ = $window._;

    $httpBackend.whenGET(fix.urls.login).respond(fix.data.user);

    $httpBackend.whenGET(fix.urls.users).respond({
      type: 'users',
      users: Object.keys(fix.data.userList).map(function(id) {
        return fix.data.userList[id];
      }),
      cursor: null
    });

    $httpBackend.whenDELETE(fix.urls.oneUser).respond({});

    $httpBackend.whenGET(fix.urls.students).respond({
      type: 'students',
      students: _.map(fix.data.studentList, function(student) {
        var user = _.find(fix.data.userList, {studentId: student.studentId});

        student = _.assign(_.cloneDeep(student), user || {});
        return _.defaults(student, {isStudent: true});
      }),
      cursor: null
    });

    $httpBackend.whenPOST(fix.urls.students).respond(echo);

    $httpBackend.whenDELETE(fix.urls.oneStudent).respond({});

    $httpBackend.whenPUT(fix.urls.oneStudentName).respond({});

    $httpBackend.whenGET(fix.urls.pgy).respond({
      pgy: [{
        id: 2015,
        label: 'Year 2015',
        isActive: true
      }]
    });

    $httpBackend.whenDELETE(fix.urls.onePgy).respond({});


    $httpBackend.whenGET(fix.urls.staff).respond(function() {
      return [200, {
        type: 'users',
        users: Object.keys(fix.data.userList).filter(function(id) {
          return fix.data.userList[id].isStaff;
        }).map(function(id) {
          return fix.data.userList[id];
        }),
        cursor: null
      }];
    });

    $httpBackend.whenPOST(fix.urls.staff).respond(echo);

    $httpBackend.whenPUT(fix.urls.newStaff).respond(function(meth, url) {
      var userId = fix.urls.newStaff.exec(url)[1];

      console.log(meth + ' ' + url);
      fix.data.userList[userId].isStaff = true;
      return [200, {}];
    });

    $httpBackend.whenDELETE(fix.urls.newStaff).respond(function(meth, url) {
      var userId = fix.urls.newStaff.exec(url)[1];

      console.log(meth + ' ' + url);
      fix.data.userList[userId].isStaff = false;
      return [200, {}];
    });

    $httpBackend.whenPUT(fix.urls.newAdmin).respond(function(meth, url) {
      var userId = fix.urls.newAdmin.exec(url)[1];

      console.log(meth + ' ' + url);
      fix.data.userList[userId].isAdmin = true;
      return [200, {}];
    });

    $httpBackend.whenDELETE(fix.urls.newAdmin).respond(function(meth, url) {
      var userId = fix.urls.newAdmin.exec(url)[1];

      console.log(meth + ' ' + url);
      fix.data.userList[userId].isAdmin = false;
      return [200, {}];
    });

    $httpBackend.whenPOST(fix.urls.newStudentUploadUrl).respond({
      url: '/_upload/'
    });

    $httpBackend.whenPOST('/_upload/').respond({});

    $httpBackend.whenGET(/.*/).passThrough();

  })

  ;

})();
