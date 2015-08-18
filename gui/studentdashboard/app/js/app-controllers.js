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
