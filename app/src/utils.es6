import request from 'request';
import Promise from 'bluebird';
import _ from 'lodash';

import { common } from './common';

let utils = {
  writeURL: (url, data, callback) => {
    let opts = {
      url: url + `?username=admin&response=${data}`
    }
    return new Promise((resolve, reject) => {
      return request(opts, (error, response, body) => {
        if (error) {
          _log('Renderer', error);
          reject(error);
        }
        else {
          resolve(body);
        }
      });
    })

  },
  readURL: (url, callback) => {
    let opts = {
      url: url,
      headers: {
        'Accept': 'application/xml',
        'Content-Type': 'text/plain'
      }
    }
    return new Promise((resolve, reject) => {
      return request(opts, (error, response, body) => {
        if (error) {
          _log('Renderer', error);
          reject(error);
        }
        else {
          resolve(body);
        }
      });
    })

  }
}
for (let key in common) {
  utils[key] = common[key];
}
export default utils;
