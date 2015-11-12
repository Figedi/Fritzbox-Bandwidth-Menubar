let ipc = require('ipc');

import inject from 'decorators/inject';

@inject('$scope', '$history', 'Config')
export default class ConfigCtrl {
  constructor($scope, $history, ConfigStore) {
    this.form = {};
    this.startupChanged = false;
    // assign deps to this, maybe we could export this into a decorator
    let args = Array.prototype.slice.call(arguments);
    for (let depIdx in ConfigCtrl.$inject) {
      let depName = ConfigCtrl.$inject[depIdx];
      this[depName] = arguments[depIdx];
    }
    this._setup();
    this.$scope.$watch(() => { return this.form.startup }, this.onStartupChange.bind(this), true);
    this.$scope.$watch(() => { return this.form }, this.onConfigChange.bind(this), true);
  }

  onStartupChange(newVal, oldVal) {
    if (oldVal != undefined) {
      this.startupChanged = newVal != oldVal;
    } else if (newVal) {
      this.startupChanged = true;
    }
  }

  onConfigChange(newVal, oldVal) {
    oldVal = oldVal || '';
    this.configChanged = JSON.stringify(newVal) !== JSON.stringify(oldVal);
  }

  submit() {
    if (this.startupChanged) {
      ipc.send('renderer', { type: this.form.startup ? 'STARTUP_ON' : 'STARTUP_OFF' });
    }


    this.Config.set('form', this.form, (err) => {
      if (!err) {
        if (this.configChanged) {
          ipc.send('renderer', { type: 'CONFIG_CHANGED' })
        }
        this.$history.back();
      }
    })
  }

  cancel() {
    this.$history.back();
  }

  _setup() {
    this.Config.get('form', (err, data) => {
      if (!err) {
        data = data || {};
        this.form = data;
      }
      else {
        this.form = {};
      }
    });
  }
}
