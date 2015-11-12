import { exec } from 'child_process';
import { parseString } from 'xml2js';
import _ from 'lodash';
import Promise from 'bluebird';

import utils from './utils';

export default class Fritzbox {

  static DEFAULT_CONFIG = {
    base: 'http://fritz.box',
    login: '/login_sid.lua',
    password: process.env.FRITZ_PW || '',
  }

  constructor(opts, logger) {
    this.opts = _.assign(Fritzbox.DEFAULT_CONFIG, opts);
    this.lastCall = {};
    this.logger = logger || console;
  }

  /**
   *
   * Authenticates to the Fritz Router according to spec. (Challenge -> Response
   * -> SID)
   *
   * @return {Async}             Async Response, returns Promise
   */
  authenticate() {
    if (this.tokenValid()) {
      return Promise.resolve(this.token);
    } else {
      return utils.readURL(this.opts.base + this.opts.login)
      .then(this.getChallenge.bind(this))
      .then(this.encodeResponse.bind(this))
      .then((challenge) => {
        return utils.writeURL(this.opts.base + this.opts.login, challenge)
      })
      .then(this.getToken.bind(this))
      .then((token) => {
        this.token = token;
        this.tokenAt = +new Date();
        return token;
      });
    }
  }

  /**
   * Validates whether a token is still valid. Right now we are setting the
   * valid time to 200000 (tested with own router)
   *
   * @return {Boolean} True when token is valid, false otherwise
   */
  tokenValid() {
    let now = +new Date();
    if (this.token && this.tokenAt && (now - this.tokenAt) < 200000)
      return true;
    else { //invalidate, then return
        this.token = null;
        this.tokenAt = null;
        return false;
    }
  }
  /**
   * Encodes the response by executing plain programs through CLI.
   * Note that this only works for mac right now (md5 package, iconv should be
   * present everywhere)
   *
   * @param  {String}   challenge The challenge from the router
   *
   * @return {Promise}            Async response, returning Promise
   */
  encodeResponse(challenge) {
    return new Promise((resolve, reject) => {
      let challengeBF = `${challenge}-${this.opts.password}`;
      //maybe use buffers (encoding) & crypto http://lollyrock.com/articles/nodejs-encryption/
      exec(`printf "%s" "${challengeBF}" | iconv -f ISO8859-1 -t UTF-16LE | md5 | sed "s/ .*$//"`, (error, stdout, stderr) => {
        if (error) {
          this.logger.error('Renderer', error);
          reject(error);
        }
        else {
          resolve(`${challenge}-${stdout.trim()}`);
        }
      });
    });
  }

  /**
   * Gets the token by parsing the xml and returning the SID field
   *
   * @param  {String}   xml      The raw xml String
   *
   * @return {Promise}           Async response, returning Promise
   */
  getToken(xml) {
    return new Promise((resolve, reject) => {
      parseString(xml, (error, result) => {
        if (error) {
          this.logger.error('Renderer', error);
          reject(error);
        }
        else {
          let token = result.SessionInfo.SID[0];
          if (token && token != '0000000000000000')
            resolve(token);
          else
            reject({ code: 'SID_ERROR', msg: 'No SID created, was: ' + token });
        }
      });
    });

  }
  /**
   * Gets the challenge by parsing the xml and returning the Challenge-Field
   *
   * @param  {String}   xml      The raw xml String
   *
   * @return {Promise}             Async response, returning Promise
   */
  getChallenge(xml) {
    return new Promise((resolve, reject) => {
      parseString(xml, (error, result) => {
        if (error) {
          this.logger.error('Renderer', error);
          reject(error);
        }
        let challenge = result.SessionInfo.Challenge;
        if (challenge)
          resolve(challenge);
        else
          reject({ code: 'NO_CHALLENGE', msg: 'No challenge found' });
      });
    });
  }
  /**
   * @todo Should enable mode where we only subtract every 5 seconds
   * (for first time usage)
   *
   * Maps a new and old series to their difference and adds a timestamp.
   * timestamps are lineary calculated
   *
   * @param  {Object} oldData  The old request result
   * @param  {Object} newData  The new request result
   * @param  {Number} dateNow    Date absolute Number from new request

   * @return {Object}            Returns a mapped version of the diff
   */
  _interpolateDataPoint(oldData, newData, dateNow) {
    let longest = -1;
    let diffData = _.reduce(newData, (acc, data, key) => {
      let diff = this._setDifference(oldData[key], data);
      if (diff.length > longest)
        longest = diff.length;
      acc[key] = diff.length ? diff : [0];
      return acc;
    }, {});
    // if unchanged (i.e. diff([0,0..], [0,0...]) = []), fill up with one single
    // 0, then one single date
    longest = longest == -1 ? 1 : longest;
    let timeSeries = _.range(0, longest).map((v, i) => {
      return parseInt(dateNow - 1000 * ((longest - i) * (5 / longest)))
    })
    return { x: timeSeries, columns: diffData }
  }

  /**
   * Initial substraction, calculates for every datapoint the date by
   * subtracting 5s each.
   *
   * Fills up shorter fields, if neccessary
   *
   * @param  {Object} newData New data object
   * @param  {Number} dateNow Number representing date in GMT
   *
   * @return {Object}         Returns the timeseries (x) and columns (data)
   */
  _subtractDataPoint(newData, dateNow) {
    let returnData = {};
    let timeSeries = _.max(newData, (v) => v.length).map((_, i) => dateNow - (5000 * i)).reverse();
    for (let key of Object.keys(newData)) {
      let data = newData[key].slice();
      if (data.length < timeSeries.length) {

        let diff = timeSeries.length - data.length - 1;
        data = _.range(0, diff, 0).concat(data);
      }
      returnData[key] = data;
    }
    return { x: timeSeries, columns: returnData };
  }
  /**
   * @todo besserer check, wir müssen auf object testen, ob alle values leer sind
   *
   * @param  {Object} oldData   Data from previous request
   * @param  {Object} newData   New data form current request
   * @param  {Number} dateNow   Number representing current date in GMT
   *
   * @return {Object}           Returns the formatted data
   */
  _formatDataPoint(oldData, newData, dateNow) {
    let isEmpty = !oldData || _.chain(newData).map((value, key) => {
      return value.length;
    }).max().value().length == 0;
    if (isEmpty)
      return this._subtractDataPoint(newData, dateNow);
    else
      return this._interpolateDataPoint(oldData, newData, dateNow);
  }

  /**
   * Returns the difference of two Arrays from which the latter was just a
   * left shifted version of the former. Thus we only need to find the first
   * Element of Array B in Array A from right to left
   *
   * @param {Array} arrayA The first Array (old)
   * @param {Array} arrayB The second Array (new)
   *
   * @return {Array}       Returns the difference from the given index or Array A
   */
  _setDifference(arrayA, arrayB) {
    arrayB = arrayB || [];
    for (var i = arrayB.length - 1; i >= 0; i--) {
      if (arrayB[i] == arrayA[arrayA.length - 1])
        return arrayB.slice(i + 1, arrayB.length);
    }
    return arrayA.slice();
  }

  /**
   * Helper method, gets the sum of upstream/downstream of the first element of
   * each category
   *
   * @param  {Object} data The data object from the request
   *
   * @return {Integer}     Returns the sum of all categories.
   */
  _getTotal(data) {
    let sum = 0.0;
    for (let key of Object.keys(data)) {
      sum += data[key][data[key].length - 1];
    }
    return sum.toFixed(3);
  }
  /**
   *
   * Gets the current Bandwidth usage. Should only be called every 5 seconds.
   * Returns data by normalizing to kbit/s. Also we are just returning
   * the difference from the last request since the router always performs
   * a right shift (N-times) from the last request to provide additional data.
   *
   * @return {Async}             Async response, returning Promise
   */
  getGraph() {
    let transforms = {
      upstream: {
        'prio_default_bps': 'default',
        'prio_high_bps': 'high',
        'prio_low_bps': 'low',
        'prio_realtime_bps': 'realtime',
      },
      downstream: {
        'mc_current_bps': 'media',
        'ds_current_bps': 'internet'
      }
    };
    let dateNow = +new Date();
    return this.authenticate().then(() => {
      return utils.readURL(`${this.opts.base}/internet/inetstat_monitor.lua?sid=${this.token}&useajax=1&action=get_graphic&xhr=1&t${dateNow}=nocache`);
    })
    .then((data) => {
      try {
        data = JSON.parse(data)[0]; // is an array with 1 element
      }
      catch (e) { // sometimes returns a HTML page with 503, out of memory
        this.logger.error('Renderer', e);
        throw e; // log then rethrow for promise catch
      }

      let newData = {};
      for (let key of Object.keys(transforms)) { // upstream, downstream
        let typeTransform = transforms[key]
        newData[key] = {};
        for (let keykey of Object.keys(typeTransform)) { //prio_default_bps, ...
          let value = typeTransform[keykey];
          // each entry is byte/s, convert to: kbit/s
          //
          newData[key][value] = data[keykey].split(',').map((date) => { return parseInt(date) * 0.008; }).reverse();
        }
      }

      let oldData = this.lastCall;
      let result = {
        dateReq: dateNow,
        available: {
          upstream: parseInt(data.upstream) / 1000,
          downstream: parseInt(data.downstream) / 1000
        },
        max: {
          upstream: parseInt(data['max_us']) / 1000,
          downstream: parseInt(data['max_ds']) / 1000
        },
        current: {
          upstream: {
            data: this._formatDataPoint(oldData && oldData.upstream, newData.upstream, dateNow),
            $total: this._getTotal(newData.upstream)
          },
          downstream: {
            data: this._formatDataPoint(oldData && oldData.downstream, newData.downstream, dateNow),
            $total: this._getTotal(newData.downstream)
          }
        }
      }
      this.lastCall = newData;
      return result
    })
  }
}
