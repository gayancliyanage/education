(function() {
  'use strict';
  var yearPattern = /20\d{2}/g;


  angular.module('scdSelector.services', [
    'scDashboard.services'
  ]).

  /**
   * Keep tract of a selected student.
   *
   * Can be share by directive and controller to keep track of which student
   * the current user is watching or editing.
   *
   * If the current user is not an admin or staff, he won't be able to pick
   * a student; the selected user will be the current user
   * (assuming he's a student).
   *
   * Return a promising resolving to a selector object with the
   * following properties:
   *
   * - `selected` (Current selected student),
   * - `available` (can the current user select a student other than
   *   him / herself).
   * - `select(id)` to select a student.
   * - `search(filter)` to get a list of student that match
   *
   */
  factory('scdSelectedStudent', ['$window', 'scdDashboardApi', '$q',
    function($window, scdDashboardApi, $q) {
      var selector = null,
        selectorPromise = null,
        studentsPromise = null,
        searchParams = {},
        _ = $window._;

      function parseFilter(filter) {
        var name = [], years = [];

        filter.split(' ').forEach(function(token){
          if (yearPattern.test(token)) {
            years.push(token);
          } else if (token) {
            name.push(token);
          }
        });

        return {name: name.join(' '), years: years};
      }

      function filterStudents(selector, filter, limit) {
        var params = parseFilter(filter || '');

        params.limit = limit || 8;

        studentsPromise = $q.when(studentsPromise).then(function(){
          var diffYears = _.xor(params.years, searchParams.years);

          if (params.name === searchParams.name && diffYears.length === 0) {
            return selector._filteredStudents || [];
          }

          _.assign(searchParams, params);
          return scdDashboardApi.users.listStudents(params);
        }).then(function(studentList) {
          selector._filteredStudents = studentList;
          return studentList;
        })['finally'](function() {
          studentsPromise = null;
        });

        return studentsPromise;
      }

      return function() {
        if (selector) {
          return $q.when(selector);
        }

        if (selectorPromise) {
          return $q.when(selectorPromise);
        }

        selectorPromise = scdDashboardApi.auth.auth().then(function(user) {

          if (!user.isLoggedIn) {
            return $q.reject('You need to be logged in.');
          }

          selector = {
            _filteredStudents: [],
            students: [],
            selected: user,
            available: false,
            select: function(find) {
              return scdDashboardApi.users.getStudent(find.studentId).then(function(student){
                selector.selected = student;
                return student;
              });
            },
            search: function(filter) {
              return filterStudents(selector, filter);
            },
            filter: function(filter) {
              // If a student have been selected, the modele is now a student.
              // We just return the last selected student.
              if (filter && filter.displayName) {
                return [filter];
              }
              return selector.search(filter);
            }
          };

          if (!user.isStaff && !user.isAdmin) {
            return selector;
          }

          selector.available = true;
          scdDashboardApi.users.listStudents({limit: 0}).then(function(studentList){
            selector.students = studentList;
          });

          return selector;
        })['finally'](function(){
          selectorPromise = null;
        });

        return selectorPromise;
      };
    }
  ])

  ;

})();
