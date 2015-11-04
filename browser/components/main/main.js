'use strict';

let ipc = require('ipc'); //require from electron

import inject from 'decorators/inject';

@inject('$scope', '$rootScope', '$interval')
export default class MainCtrl {

  static DATA_TEMPLATE = {
    current: {
      upstream: 'n/a',
      downstream: 'n/a'
    },
    graph: {
      upstream: {
        data: {
          x: 'x',
          columns: [
            // each row is a dataset, first one is the label
          ],
          types: {}
        },
        size: {
          height: 200,
          width: 300
        },
        point: {
          show: false
        },
        transition: {
          duration: 0
        },
        axis: {
          x: {
            label: 'Time',
            type: 'timeseries',
            tick: {
              format: '%H:%M:%S'
            }
          },
          y: {
            label: 'Kbit/s',
            max: 2000,
            min: 0
          }
        }
      },
      downstream: {
        data: {
          x: 'x',
          columns: [
            // each row is a dataset, first one is the label
          ],
          types: {}
        },
        size: {
          height: 200,
          width: 300
        },
        point: {
          show: false
        },
        transition: {
          duration: 0
        },
        axis: {
          x: {
            label: 'Time',
            type: 'timeseries',
            tick: {
              format: '%H:%M:%S'
            }
          },
          y: {
            label: 'Kbit/s',
            max: 18000,
            min: 0
          }
        }
      }
    }
  }

  constructor($scope, $rootScope, $interval) {
    this.$scope = $scope;
    this.$rootScope = $rootScope;
    this.$interval = $interval;

    this.data = MainCtrl.DATA_TEMPLATE;
    this.bindEvents();
    this.requestData();
    this.$interval(this.requestData, 5000);
  }

  requestData() {
    ipc.send('renderer', { type: 'DATA' });
  }

  bindEvents() {
    ipc.on('main', this.onIPCRemote.bind(this))
  }

  onIPCRemote(msg) {
    this.formatData(msg.data);
    this.$scope.$apply();
  }

  /*
  TODO: shift von daten, max per options
   */

  formatData(series) {
    if (!series)
      return;
    for (let type of ['downstream', 'upstream']) {
      this._formatGraph(type, series);
      this._formatCurrent(type, series);
    }
    this.$rootScope.logger.info("everything", this.data.graph);
  }

  _formatCurrent(type, data) {
    this.data.current[type] = this.formatBps(data.current[type].$total);
  }

  _formatGraph(type, series) {
    this.data.graph[type].axis.y.max = series.available[type];
    let columns = this.data.graph[type].data.columns.slice();
    if (columns.length) { // update case
      columns = this._updateColumns(columns, series.current[type].data.columns);
    }
    else { //initial case
      let objKeys = Object.keys(series.current[type].data.columns);
      for (let i = 0; i < objKeys.length; i++) {
        columns[i] = this._createColumn(objKeys[i], series.current[type].data.columns[objKeys[i]]);
      }
    }
    // custom x axis
    this._addXValues(columns, series.current[type].data.x)
    // only allow max 20 last elements (emulates data shifting)
    columns = this._slicetoMax(columns, 20)
    this.data.graph[type].data.columns = columns;
    this.data.graph[type].data.types = this._createAreaOptions(series.current[type].data.columns);
  }

  // creates a types object for each key of series (we want area-spline)
  _createAreaOptions(series) {
    return Object.keys(series).reduce((acc, date) => {
      acc[date] = 'area-spline';
      return acc;
    }, {});
  }

  // slices the last $max$ elements from columns array of arrays
  _slicetoMax(columns, max) {
    for (let columnIdx in columns) {
      let column = columns[columnIdx];
      if (column.length > max) {
        column = [column[0], ...column.slice(column.length - max)];
      }
      columns[columnIdx] = column;
    }
    return columns;
  }

  // adds x values to columns, depending whether there are columns already or not
  _addXValues(into, xValues) {
    let getXCol = (into) => {
      for (let colIdx in into) {
        if (into[colIdx][0] == 'x')
          return colIdx;
      }
      return false;
    }
    let xCol = getXCol(into);
    if (xCol === false) { // create case
      let x = xValues.slice();
      x.unshift('x');
      into.push(x);
    } else { // update case

      into[xCol] = into[xCol].concat(xValues);
    }
    return into;
  }

  // adds the identifier to a column (first element)
  _createColumn(key, into) {
    let returnVal = into.slice();
    returnVal.unshift(key);
    return returnVal;
  }

  // updates columns with new data
  _updateColumns(currentColumns, newColumns) {
    let addToColumn = (type, into, data) => {
      for (let colIdx in into) {
        if (into[colIdx][0] == type) {
          into[colIdx] = into[colIdx].concat(data);
          return into;
        }
      }
      return into;
    }
    for (let type of Object.keys(newColumns)) {
      let data = newColumns[type];
      currentColumns = addToColumn(type, currentColumns, data);
    }
    return currentColumns;
  }

  formatBps(kbps) {
    if (!kbps)
      return 'n/a';
    let mbps = parseInt(kbps) > 10000 ? (kbps / 1000).toFixed(3) : null;
    if (mbps)
      return `${mbps} Mbit/s`
    if (kbps)
      return `${kbps} Kbit/s`
  }
}
