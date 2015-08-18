(function() {
  'use strict';

  var respInterceptor = function(data, operation, what) {
      var resp;

      if (operation !== 'getList' || angular.isArray(data)) {
        return data;
      }

      if (!data) {
        resp = [];
        resp.cursor = null;
        return resp;
      }

      if (data.type && data[data.type]) {
        resp = data[data.type];
      } else if (data[what]) {
        resp = data[what];
      } else {
        resp = [];
      }

      resp.cursor = data.cursor ? data.cursor : null;
      return resp;
    },
    reqInterceptor = function(element, operation, route, url, headers, params) {
      if (operation === 'remove') {
        element = null;
      }

      return {
        headers: headers,
        params: params,
        element: element,
        httpConfig: {}
      };
    };

  angular.module('scCoreEducation.services', ['restangular', 'scCoreEducation.config']).

  factory('scceApi', ['Restangular', 'SCCE_API_BASE',
    function(Restangular, SCCE_API_BASE) {
      return {
        client: function(appName) {
          return Restangular.withConfig(function(RestangularConfigurer) {
            RestangularConfigurer.setBaseUrl(SCCE_API_BASE);
            RestangularConfigurer.setFullRequestInterceptor(reqInterceptor);
            RestangularConfigurer.addResponseInterceptor(respInterceptor);
            RestangularConfigurer.setDefaultHeaders({
              'X-App-Name': appName
            });
          });
        }
      };
    }
  ])

  ;
})();
