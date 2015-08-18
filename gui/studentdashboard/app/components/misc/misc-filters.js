(function() {
  'use strict';

  angular.module('scdMisc.filters', []).

  filter('fullName', function() {
    return function(name) {
      return name.givenName + ' ' + name.familyName;
    };
  }).

  filter('percent', ['$window',
    function(window) {
      var d3 = window.d3,
        formatter = d3.format('.00%');

      return function(v) {
        return formatter(v);
      };
    }
  ]).

  filter('dash', function() {
    return function(v) {
      return v.replace(' ', '-');
    };
  }).


  filter('isEmpty', [
    '$window',
    function($window) {
      return function(obj) {
        if (!obj) {
          return true;
        }

        if (obj.length !== undefined) {
          return obj.length === 0;
        }

        return $window._.keys(obj).length === 0;
      };
    }
  ]).

  filter('rotate', function() {
    return function(angle) {
      return {
        '-webkit-transform': 'rotate(' + angle + 'deg)',
        '-moz-transform': 'rotate(' + angle + 'deg)',
        '-ms-transform': 'rotate(' + angle + 'deg)',
        'transform': 'rotate(' + angle + 'deg)'
      };
    };
  }).

  filter('portrait', function portraitFactory() {
    var googleImagePattern = /^([^?]+)\?sz=\d+$/;
    return function portrait(url, size) {
      var filteredUrl = url && googleImagePattern.exec(url);

      if (filteredUrl) {
        return filteredUrl[1] + '?sz=' + size;
      } else if (url) {
        return url + '=s' + size;
      } else {
        return (
          'https://lh3.googleusercontent.com/-XdUIqdMkCWA/' +
          'AAAAAAAAAAI/AAAAAAAAAAA/4252rscbv5M/photo.jpg?sz=' + size
        );
      }
    };
  })

  ;

})();
