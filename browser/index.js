// electron deps
let ipc = require('ipc');
// deps
import angular from 'angular';
import 'c3/c3.css!';
import 'photon/css/photon.css!';

// own modules
import MainCtrl from './components/main/main';
import ConfigCtrl from './components/config/config';
import { utils, RemoteLogger, Logger } from 'common';
import './common/routerHistory';
import './common/configStore';
import './components/chart/chart';
let logger = utils.getRemoteLogger({ ipc: ipc, loglevel: Logger.LOG_LEVELS.INFO });

//logger.bootstrap(); // bind native methods and catch errors

let app = angular.module('mainApp', ['ui.router.history', 'config.store', 'c3.bindings'])
.controller({ MainCtrl, ConfigCtrl });

app.config(($stateProvider, $urlRouterProvider) => {
  $urlRouterProvider.otherwise('main');
  $stateProvider
  .state('main', {
    url: '/main',
    templateUrl: './components/main/main.html',
    controller: 'MainCtrl',
    controllerAs: 'main'
  })
  .state('config', {
    url: '/config',
    templateUrl: './components/config/config.html',
    controller: 'ConfigCtrl',
    controllerAs: 'config'
  });
});
app.run(($rootScope, $state) => {
  $rootScope.logger = logger;
  ipc.on('control', (message) => {
    if (message.type == 'HIDE') {
      $state.go('main');
    }
  });
});
