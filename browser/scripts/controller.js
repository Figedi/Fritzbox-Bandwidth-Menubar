let ipc = require('ipc'); //require from electron

import utils from 'common';

let defaultData = {
  graph: {
    upstream: {},
    downstream: {}
  },
  current: {
    upstream: { },
    downstream: { }
  }
}

class MainCtrl {
  constructor($scope, $interval) {
    this.$interval = $interval;
    this.$scope = $scope;
    this.data = defaultData;
    this.bindEvents();
    this.requestData();
    $interval(this.requestData, 5000);
  }

  requestData() {
    ipc.send('renderer', { type: 'DATA' });
  }

  bindEvents() {
    ipc.on('main', this.onIPCRemote.bind(this))
  }

  onIPCRemote(msg) {
    this.formatData(msg.data);
    this.formatRaw(msg.data);
    this.$scope.$apply();
  }

  formatRaw(data) {
    for (let type of ['upstream', 'downstream']) {
      this.data.current[type] = this.formatBps(data.current[type].$total);
    }
  }
  /*
  TODO: alle daten vonner fritzbox beachten, z.b. nen average vom array?!
   */

  formatData(series) {
    let types = ['downstream', 'upstream']
    for (let type of types) {
      let objKeys = Object.keys(series.current[type]).slice(1); //first el is always $total
      if (!this.data.graph[type].series) { //init up/down
        this.data.graph[type] = this.makeOptions(series.available[type], type, objKeys, series.dateReq)
      }
      for (let i = 0; i < objKeys.length; i++) {
        let key = objKeys[i]; //low, default, high, realtime etc

        let value = series.current[type][key]; //val of that key
        // add another data point
        this.data.graph[type].series[i].data = this.data.graph[type].series[i].data.concat(value);
      }
    }
    utils.log("everything", this.data.graph);

  }
  /*
  TODO: MIN bei x achse korrekt machen
   */
  makeOptions(max, type, objKeys, dateNow) {
    let range = Array.apply(null, { length: 6 }).map(Number.call, Number);
    let interval = range.map((idx) => ((max / 5) * idx).toFixed(2));
    let series = [];
    for (let i = 0; i < objKeys.length; i++) {

      series[i] = { name: objKeys[i], data: []}
    }
    return {
      options: {
        chart: { type: 'line' }
      },
      title: `${type} (Kbit/s)`,
      series: series,
      xAxis: {
        min: dateNow,
        type: 'datetime'
      },
      yAxis: {
        title: {
          text: 'Bandwidth (Kbit/s)',
        },
        tickPositions: interval,
        min: 0,
        max: max
      },
      loading: false
    }
  }

  formatBps(kbps) {
    // format wrong..
    if (!kbps)
      return 'n/a';
    let mbps = kbps > 1000 ? kbps / 1000 : null;
    if (mbps)
      return `${mbps} Mb/s`
    if (kbps)
      return `${kbps} Kb/s`
  }
}

MainCtrl.$inject = ['$scope', '$interval'];

export default MainCtrl;
