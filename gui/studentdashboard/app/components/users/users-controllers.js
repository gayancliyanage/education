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
