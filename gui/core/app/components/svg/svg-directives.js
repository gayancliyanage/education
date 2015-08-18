(function() {
  'use strict';

  angular.module('scceSvg.directives', []).

  /**
   * Directive to set the a `svg element `viewBox` attribute
   * and keep it responsive.
   *
   * With:
   *
   *  <svg ng-attr-viewBox="0 0 {{100}} {{100}}"/>
   *
   * Angular would produce the correct attribute but it would have no effect.
   * This directive edit the viewBox.baseVal property directly.
   *
   * Usage:
   *
   *   <scce-svg-container scce-viewbox="layout">
   *     <svg/>
   *   </scce-svg-container>
   *
   * where `$scope.layout == {width: 100, height: 100, margin:{top:10, left:20}}`
   *
   */
  directive('scceSvgContainer', function() {
    return {
      restrict: 'E',
      transclude: true,
      scope: {
        'viewBox': '=?scceViewbox'
      },
      template: '<div ng-transclude ng-style="container"></div>',
      link: function(scope, element) {
        var svg = element.find('svg');

        // Set css of the svg wrapper
        scope.container = {
          'display': 'inline-block',
          'position': 'relative',
          'width': '100%',
          'padding-bottom': '100%',
          'vertical-align': 'middle',
          'overflow': 'hidden'
        };

        // set css and attribute of the svg element
        svg.css({
          'display': 'inline-block',
          'position': 'absolute',
          'top': '0',
          'left': '0'
        });


        svg.get(0).setAttribute(
          'preserveAspectRatio', 'xMinYMin meet'
        );

        scope.$watch('viewBox', function() {
          var vb = scope.viewBox, ratio;

          if (!vb || !vb.height || !vb.width || !vb.margin) {
            return;
          }

          ratio = vb.height / vb.width;

          // set / update svg view port
          svg.get(0).setAttribute(
            'viewBox', [-vb.margin.left, -vb.margin.top, vb.width, vb.height].join(' ')
          );

          // adjust position of the svg element in the wrapper
          scope.container['padding-bottom'] = (ratio * 100) + '%';
        });
      }
    };
  })


  ;

})();