(function() {
  'use strict';

  angular.module('scdRepository.services', ['scDashboard.services']).

  factory('scdRepositoryApi', ['scdDashboardBaseApi',
    function(scdDashboardBaseApi) {
      return {
        getRepositoryById: function(studentId, params) {
          return scdDashboardBaseApi.one('repository', studentId).all('files').getList(params);
        },
        newUploadUrl: function(studentId) {
          return scdDashboardBaseApi.one('uploadurl').one('repository', studentId).post();
        },
        deleteDocument: function(doc) {
          return scdDashboardBaseApi.one('repository', doc.destId).one('files', doc.id).remove();
        }
      };
    }
  ])

  ;

})();
