// configstore:
// https://github.com/atom/electron/blob/f02cae1b0ab60824f76dfdfb13732edee5924eae/docs/api/app.md#appgetpathname
// app.getPath('userData') --> .json einfach reinschreiben fertig z.b. mit
// {
//  "username": "foo",
//  "ip": "bar",
//  "password": "baz"
// }
//
import crypto from 'crypto';
import { exec } from 'child_process';
import { parseString } from 'xml2js';

import utils from './utils';

const defaultConfig = {
  base: 'http://fritz.box',
  login: '/login_sid.lua',
  password: process.env.FRITZ_PW
}

export default class Fritzbox {
  //foo
  constructor(opts) {
    this.opts = defaultConfig;
    this.lastCall = {};
    for (let key in opts) {
      this.opts[key] = opts[key]
    }
  }
  // i should use q in pipe mode for this, ourgh
  authenticate(callback) {
    if (this.tokenValid())
      return callback(undefined, this.token);
    utils.readURL(this.opts.base + this.opts.login, (error, xml) => {
      if (error)
        return callback(error, undefined);
      else {
        this.getChallenge(xml, (error, challenge) => {
          if (error)
            return callback(error, undefined);
          else {
            this.encodeResponse(challenge, (error, response) => {
              if (error)
                return callback(error, undefined);
              utils.writeURL(this.opts.base + this.opts.login, response, (error, xml) => {
                this.getToken(xml, (error, token) => {
                  if (error)
                    return callback(error, undefined);
                  else {
                    this.token = token;
                    this.tokenAt = +new Date();
                    callback(undefined, token);
                  }
                });
              });
            });
          }
        });
      }
    });
  }

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

  encodeResponse(challenge, callback) {
    let challengeBF = `${challenge}-${this.opts.password}`;
    //maybe use buffers (encoding) & crypto http://lollyrock.com/articles/nodejs-encryption/
    exec(`printf "%s" "${challengeBF}" | iconv -f ISO8859-1 -t UTF-16LE | md5 | sed "s/ .*$//"`, (error, stdout, stderr) => {
      if (error) {
        utils.log('Renderer', error);
        callback(error, undefined);
      }
      else {
        callback(undefined, `${challenge}-${stdout.trim()}`)
      }
    });
  }

  /* NACH 284225 ms gabs nen 503 --> neuen token holen, z.b. nach 200000 ms
<HTML><HEAD><TITLE>503 Service Unavailable (ERR_NO_MEMORY)</TITLE></HEAD><BODY><H1>503 Service Unavailable</H1><BR>ERR_NO_MEMORY<HR><B>Webserver</B> Wed, 02 Sep 2015 17:08:08 GMT</BODY></HTML>
   */
  getToken(xml, callback) {
    parseString(xml, (error, result) => {
      if (error) {
        utils.log('Renderer', error);
        return callback(error, undefined);
      }
      else {
        utils.log('DEBUUUUG', +new Date(), result);
        let token = result.SessionInfo.SID[0];
        if (token && token != '0000000000000000')
          callback(undefined, token);
        else
          callback({ msg: 'No SID created, was: ' + token }, undefined);
      }
    });
  }

  getChallenge(xml, callback) {
    parseString(xml, (error, result) => {
      if (error) {
        utils.log('Renderer', error);
        return callback(error, undefined);
      }
      let challenge = result.SessionInfo.Challenge;
      if (challenge)
        callback(undefined, challenge);
      else
        callback({ msg: 'No challenge found' }, undefined);
    })
  }
  //TODO: reverse properly!!
  _mapDataPoint(oldSeries, newSeries, key, dateNow) {
    let diff = this._setDifference(newSeries[key], oldSeries[key]);
    for (let i = 0; i < diff.length; i++) {
      diff[i] = { x: parseInt(dateNow - 1000 * ((diff.length - i) * (5 / diff.length))), y: diff[i] }
    }
    return diff;
  }

  //map diff for A\B sets, which means find the first index from which the arrays
  //are the same --> slice A at this index
  //we can use the first index since arrayB is just arrayA with a right shift for an unknown number of elements
  _setDifference(arrayA, arrayB) {
    arrayB = arrayB || []; //B can be undefined upon initialization
    for (let idxA in arrayA) {
      if (arrayA[idxA] === arrayB[0]) {
        return arrayA.slice(0, idxA);
      }
    }
    return arrayA.slice();
  }
  //todo look at interval and how many elements are returned, maybe its just evenly divided from the last request
  // --> always return the diff from lastCall, so only new elements
  //https://github.com/robin13/API-FritzBox/blob/master/lib/API/FritzBox.pm#L249
  getGraph(callback) {

    let getInetStat = (callback) => {

      let transforms = ['prio_default_bps', 'prio_high_bps', 'prio_low_bps', 'prio_realtime_bps', 'mc_current_bps', 'ds_current_bps'];
      //http://fritz.box/internet/inetstat_monitor.lua?sid=<SID>&useajax=1&action=get_graphic&xhr=1&t<timestamp in ms>=nocache
      let dateNow = +new Date();
      let url = `${this.opts.base}/internet/inetstat_monitor.lua?sid=${this.token}&useajax=1&action=get_graphic&xhr=1&t${dateNow}=nocache`;
      utils.readURL(url, (error, data) => {
        if (error) {
          utils.log('Renderer', error);
          return callback(error, undefined);
        }
        try {
          data = JSON.parse(data)[0]; //is an array with 1 element
        }
        catch (e) { //sometimes returns a HTML page with 503, out of memory
          utils.log('Renderer', e);
          return callback(e, undefined);
        }
        for (let type of transforms) {
          //normalize to bits per second from bytes
          data[type] = data[type].split(',').map((date) => { return parseInt(date) / 1000; }).reverse();
        }

        let old = this.lastCall;

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
          /*
             "ds_current_bps": "2830,4229,133242,174772,2745,1229,1172996,2185582,2148302,2187182,2185158,2183271,2185985,2184649,2137755,2179179,2186917,2188433,2172724,2177293",
             links ist das allerneueste, der rest sind vergangene werte, wird also immer nur nach rechts verschoben, VORSICHT: nicht immer nur ein element, manchmal sogar 2
             --> speichere das letzte el, gucke wo es ist, alles was links davon ist neu, wenn mehr als 1, die timestamps entsprechend anpassen, z.b. i*5/N
           */
          current: {
            upstream: {
              low: this._mapDataPoint(old, data, 'prio_low_bps', dateNow),
              default: this._mapDataPoint(old, data, 'prio_default_bps', dateNow),
              high: this._mapDataPoint(old, data, 'prio_high_bps', dateNow),
              realtime: this._mapDataPoint(old, data, 'prio_realtime_bps', dateNow),
              $total: data['prio_low_bps'][0] + data['prio_default_bps'][0] + data['prio_high_bps'][0] + data['prio_realtime_bps'][0]
            },
            downstream: {
              internet: this._mapDataPoint(old, data, 'ds_current_bps', dateNow),
              media: this._mapDataPoint(old, data, 'mc_current_bps', dateNow),
              $total: data['ds_current_bps'][0] + data['mc_current_bps'][0]
            }
          }
        }
        this.lastCall = data;
        callback(undefined, result);
      });
    }
    if (this.tokenValid()) {
      getInetStat(callback);
    }
    else {
      this.authenticate((error, token) => {
        if (error)
          return callback(error, undefined);
        else
          getInetStat(callback);
      });
    }
  }
}
