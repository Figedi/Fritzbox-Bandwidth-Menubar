'use strict';

import angular from 'angular';
// permanent config store
//
let remote = require('remote');
let app = remote.require('app');
import { ConfigStore } from 'common';

let conf = new ConfigStore(remote.require('fs'), app.getPath('userData'));

export default angular.module('config.store', []).service('Config', () => {
  return {
    get: conf.get.bind(conf),
    set: conf.set.bind(conf)
  }
});
