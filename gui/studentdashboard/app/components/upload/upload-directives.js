(function() {
  'use strict';

  angular.module('scdUpload.directives', []).

  /**
   * The attribute should point to the property holding the file.
   *
   * The file value will be watched and the file input will be reset
   * if the property become false.
   *
   */
  directive('scdFile', [
    function scdFileFactory() {
      return {
        restrict: 'A',
        // arguments: scope, iElement, iAttrs, controller
        link: function scdFilePostLink(scope, elem, attr) {

          function resetValue() {
            elem.get(0).value = null;
          }
          elem.on('click', resetValue);
          elem.on('$destroy', function() {
            elem.off('click', resetValue);
          });

          scope.$watch(attr.scdFile, function(newVal) {
            if (!newVal) {
              resetValue();
            }
          });
        }
      };
    }
  ])

  ;

})();
