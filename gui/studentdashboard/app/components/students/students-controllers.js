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
