(function() {
  'use strict';

  angular.module('scdFirstAid.controllers', [
    'scdSvg.services',
    'scDashboard.services',
    'scdMisc.services',
    'scdSelector.services'
  ]).

  /**
   * Use to resolve `initialData` of `scdFirstAidStatsCtrl`.
   *
   */
  factory('scdFirstAidStatsCtrlInitialData', [
    '$q',
    'scdDashboardApi',
    'scdSelectedStudent',
    function scdFirstAidStatsCtrlInitialDataFactory($q, scdDashboardApi, scdSelectedStudent) {
      return function scdFirstAidStatsCtrlInitialData() {
        var params = {
            limit: 30,
            residents: 'all',
            topic: 'all',
            sortBy: 'performance'
          },
          selectorPromise = scdSelectedStudent(),
          studentsPromise = selectorPromise.then(function(selector) {
            // If the selector is not available, the current user cannot
            // see the stats either
            if (!selector.available) {
              return $q.reject('Only staff or admins can access this page.');
            }

            return scdDashboardApi.firstAid.listStats(params);
          });


        return $q.all({
          selector: selectorPromise,
          params: params,
          students: studentsPromise,
          paramOptions: $q.all({

            residents: scdDashboardApi.users.listPgys().then(function(years) {
              return [{
                id: 'all',
                label: 'All Students',
              }].concat(years);
            }),

            topics: scdDashboardApi.firstAid.listTopics().then(function(topics) {
              return [{
                id: 'all',
                label: 'All Categories'
              }].concat(topics);
            }),

            sortBy: [{
              id: 'performance',
              label: 'Correct answers rate',
              unit: '%'
            }, {
              id: 'questionTaken',
              label: 'Question taken',
              unit: ''
            }]

          })
        });
      };
    }
  ]).

  /**
   * scdFirstAidStatsCtrl
   *
   */
  controller('ScdFirstAidStatsCtrl', [
    '$window',
    '$location',
    'ScdLayout',
    'ScdPageCache',
    'scdDashboardApi',
    'initialData',
    function ScdFirstAidStatsCtrl($window, $location, ScdLayout, ScdPageCache, scdDashboardApi, initialData) {
      var self = this,
        _ = $window._,
        rowHeight = 25;

      function setStudent(students) {
        self.students = students;
        self.chartLayout = ScdLayout.contentSizing({
          innerWidth: 600,
          innerHeight: rowHeight * students.length,
          margin: {
            top: 20,
            right: 200,
            bottom: 50,
            left: 200
          }
        });
      }

      function setLegend(sortById) {
        self.chartLegend = {
          x: _.find(self.filterOptions.sortBy, {
            id: sortById
          })
        };
      }

      this.pages = new ScdPageCache(initialData.params.limit);
      this.pages.add(initialData.students);
      this.filters = initialData.params;
      this.filterOptions = initialData.paramOptions;

      this.chartRef = null; // no average stats yet.
      this.chartOptions = {
        domain: function(series) {
          var max;

          if (self.filters.sortBy === 'performance') {
            return [0, 100];
          } else {
            max = _.max(series, function(s) {
              return s[self.filters.sortBy];
            })[self.filters.sortBy];
            return [0, max];
          }
        },
        getLabel: function(row) {
          return row.displayName;
        },
        getValue: function(row) {
          return row[self.filters.sortBy];
        },
        getValueAsString: function(row) {
          if (self.filters.sortBy === 'performance') {
            return row.correctAnswers + '/' + row.questionTaken;
          } else {
            return row[self.filters.sortBy];
          }
        }
      };

      setStudent(this.pages.next());
      setLegend(this.filters.sortBy);

      /**
       * Query next page of student
       *
       */
      this.next = function(params) {
        params = _.clone(params);

        if (
          this.pages.cursor &&
          this.pages.remaining() < this.pages.viewSize
        ) {
          params.cursor = this.pages.cursor;
          scdDashboardApi.firstAid.listStats(params).then(function(students) {
            self.pages.add(students);
            setStudent(self.pages.next());
            setLegend(this.filters.sortBy);
          });
        } else {
          setStudent(this.pages.next());
          setLegend(this.filters.sortBy);
        }
      };

      /**
       * Query previous page of student
       *
       */
      this.prev = function() {
        if (this.pages.position() > 0) {
          setStudent(this.pages.prev());
          setLegend(this.filters.sortBy);
        }
      };

      /**
       * To be called after the parameter have been changed.
       *
       * It should query the student list with new parameters.
       *
       */
      this.filterChanged = function(params) {
        this.pages.clear();

        self.chartLegend = setLegend(params.sortBy);
        scdDashboardApi.firstAid.listStats(params).then(function(students) {
          self.pages.add(students);
          setStudent(self.pages.next());
          setLegend(params.sortBy);
        });
      };

      this.showDetails = function(studentStats) {
        initialData.selector.select({
          studentId: studentStats.studentId
        }).then(function() {
          $location.path('/first-aid');
        });
      };
    }
  ]).

  /**
   * Use to resolve `initialData` of `ScdFirstAidUserStatsCtrl`.
   *
   */
  factory('scdFirstAidUserStatsCtrlInitialData', [
    '$window',
    '$q',
    'scdSelectedStudent',
    'scdDashboardApi',
    function scdFirstAidUserStatsCtrlInitialDataFactory($window, $q, scdSelectedStudent, scdDashboardApi) {
      return function scdFirstAidUserStatsCtrlInitialData() {
        var _ = $window._,
          selectorPromise = scdSelectedStudent(),
          params = {
            ref: 'programAverage',
            sortBy: 'performance'
          };

        return $q.all({
          topics: scdDashboardApi.firstAid.listTopics().then(function(topics) {
            return _.reduce(topics, function(map, topic) {
              map[topic.id] = topic;
              return map;
            }, {});
          }),
          params: params,
          selector: selectorPromise,
          userStats: selectorPromise.then(function(selector) {
            if (!selector.selected || !selector.selected.studentId) {
              return null;
            }

            return scdDashboardApi.firstAid.getStats(selector.selected.studentId, params).catch(function() {
              return null;
            });
          }),
          filterOptions: $q.all({
            refs: [{
              id: 'programAverage',
              label: 'Program Average'
            }],

            sortBy: [{
              id: 'performance',
              label: 'Correct answers rate',
              unit: '%'
            }, {
              id: 'questionTaken',
              label: 'Question taken',
              unit: ''
            }]

          })
        });
      };
    }
  ]).

  /**
   * ScdFirstAidUserStatsCtrl
   *
   */
  controller('ScdFirstAidUserStatsCtrl', [
    '$window',
    'ScdLayout',
    'scdDashboardApi',
    'initialData',
    function ScdFirstAidUserStatsCtrl($window, ScdLayout, scdDashboardApi, initialData) {
      var self = this,
        _ = $window._;

      this.selector = initialData.selector;
      this.userStats = initialData.userStats;
      this.filters = initialData.params;
      this.filterOptions = initialData.filterOptions;

      function categoriesLayout(stats, baseLayout) {
        if (!stats || !stats.categoryPerformances) {
          return;
        }

        return new ScdLayout.contentSizing(_.assign({
            'innerHeight': stats.categoryPerformances.length * baseLayout.rowHeight
          },
          baseLayout
        ));
      }

      this.byCategory = {
        layout: null,
        baseLayout: {
          rowHeight: 25,
          innerWidth: 600,
          margin: {
            top: 20,
            right: 200,
            bottom: 50,
            left: 200
          }
        },

        options: {
          domain: function() {
            return [0, 100];
          },
          getLabel: function(row) {
            return initialData.topics[row.id].label;
          },
          hasRef: function() {
            return false;
          },
          getRef: function() {
            return null;
          },
          getUnit: function() {
            return '';
          },
          getValue: function(row) {
            return row.performance;
          },
          getValueAsString: function(row) {
            return row.correctAnswers + '/' + row.questionTaken;
          }
        }
      };
      this.byCategory.layout = categoriesLayout(
        this.userStats,
        this.byCategory.baseLayout
      );



      this.showStats = function(studentId) {
        if (!studentId) {
          this.userStats = null;
          return;
        }

        self.userStats = null;
        return scdDashboardApi.firstAid.getStats(studentId).then(function(stats) {
          self.userStats = stats;
          self.byCategory.layout = categoriesLayout(
            self.userStats,
            self.byCategory.baseLayout
          );
        });
      };
    }
  ])

  ;

})();
