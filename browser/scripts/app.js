import angular from 'angular';
import angularCharts from 'angular-chart'; //dummy import, also requires 'chart.js' automatically
import highchartsNg from 'highcharts-ng';
import MainCtrl from './controller';

import 'angular-chart/dist/angular-chart.css!';
import 'bootstrap/css/bootstrap.css!';

angular.module('mainApp', ['chart.js', 'highcharts-ng']).controller('mainCtrl', MainCtrl);
