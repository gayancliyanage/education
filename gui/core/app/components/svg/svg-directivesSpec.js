/* jshint camelcase: false*/
/* global describe, beforeEach, it, inject, expect */

(function() {
  'use strict';

  describe('scceSvg.directives', function() {
    var $compile, $scope, elem;


    beforeEach(module(
      'scceSvg.directives'
    ));

    beforeEach(inject(function(_$compile_, _$rootScope_) {
      $compile = _$compile_;
      $scope = _$rootScope_;
    }));


    describe('scceSvgContainer', function() {

      beforeEach(function() {
        elem = $compile(
          '<scce-svg-container scce-viewbox="layout">' +
          '<svg><text>foo</text></svg>' +
          '</scce-svg-container>'
        )($scope);

        $scope.layout = {
          width: 200,
          height: 100,
          margin: {
            top: 10,
            left: 20
          }
        };
        $scope.$digest();
      });

      it('should set the wrapper css', function() {
        var containerCss = {
            'display': 'inline-block',
            'position': 'relative',
            'width': '100%',
            'padding-bottom': '50%',
            'vertical-align': 'middle',
            'overflow': 'hidden'
          },
          svgCss = {
            'display': 'inline-block',
            'position': 'absolute',
            'top': '0px',
            'left': '0px'
          },
          countainer = elem.find('div'),
          svg = elem.find('svg');

        expect(countainer.css(
          Object.keys(containerCss)
        )).toEqual(
          containerCss
        );

        expect(svg.css(
          Object.keys(svgCss)
        )).toEqual(
          svgCss
        );

        expect(
          svg.get(0).getAttribute('preserveAspectRatio')
        ).toBe(
          'xMinYMin meet'
        );

        expect(
          svg.get(0).getAttribute('viewBox')
        ).toBe(
          '-20 -10 200 100'
        );
      });

      it('should adjust the wrapper padding accorting to the view port ratio', function() {
        var countainer = elem.find('div'),
          svg = elem.find('svg');

        $scope.layout = {
          width: 400,
          height: 100,
          margin: {
            top: 10,
            left: 20
          }
        };
        $scope.$digest();

        expect(countainer.css('padding-bottom')).toBe('25%');

        expect(
          svg.get(0).getAttribute('viewBox')
        ).toBe(
          '-20 -10 400 100'
        );
      });

    });
  });

})();