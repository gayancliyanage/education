(function() {
  'use strict';

  angular.module('scceUpload.directives', []).

  /**
   * The attribute should point to the property holding the file.
   *
   * The file value will be watched and the file input will be reset
   * if the property become false.
   *
   */
  directive('scceFile', [
    function scceFileFactory() {
      return {
        restrict: 'A',
        // arguments: scope, iElement, iAttrs, controller
        link: function scceFilePostLink(scope, elem, attr) {

          elem.bind('click', function() {
            this.value = null;
          });

          scope.$watch(attr.scceFile, function(newVal) {
            if (!newVal) {
              elem.get(0).value = null;
            }
          });
        }
      };
    }
  ])

  ;

})();
