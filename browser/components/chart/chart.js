import angular from 'angular';
import c3 from 'c3';
'use strict';

export default angular.module('c3.bindings', [])
.service('c3Service', () => {
  return {};
})
.directive('c3Chart', ['c3Service', (c3Service) => {
  return {
    scope: {
      config: '='
    },
    template: '<div></div>',
    replace: true,
    controller: function($scope, $element) {
      // fallback to id for the name;
      let name = $scope.config.bindto || `#${$element[0].id}`;
      $scope.config.bindto = name;

      // Reacting to data change
      $scope.$watchCollection('config.data.columns', (newSeries, oldSeries) => {
        c3Service[name] = c3.generate($scope.config);
        if (!$scope.config.size) {
          c3Service[name].resize();
        }
        // dynamic loading doesnt really behave well right now
        // if ((!oldSeries || !oldSeries.length) && (newSeries && newSeries.length)) {
        //   c3Service[name] = c3.generate($scope.config);
        //   // if there is no size specified, we are assuming, that chart will have width
        //   // of its container (proportional of course) - great for responsive design
        //   if (!$scope.config.size) {
        //     c3Service[name].resize();
        //   }
        // } else if (oldSeries && oldSeries.length && newSeries && newSeries.length) {
        //   c3Service[name].load({ columns: newSeries });
        // }
      });
    }
  };
}]);
