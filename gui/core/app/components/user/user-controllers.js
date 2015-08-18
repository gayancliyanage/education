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
