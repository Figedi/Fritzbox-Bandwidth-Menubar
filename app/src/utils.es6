import request from 'request';
import Promise from 'bluebird';

import { utils as commonUtils } from './common';

let logger = commonUtils.getLogger();

let utils = {
  writeURL: (url, data, callback) => {
    let opts = {
      url: url + `?username=admin&response=${data}`
    }
    return new Promise((resolve, reject) => {
      return request(opts, (error, response, body) => {
        if (error) {
          logger.error('Renderer', error);
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
          logger.error('Renderer', error);
          reject(error);
        }
        else {
          resolve(body);
        }
      });
    })

  }
}
for (let key in commonUtils) {
  utils[key] = commonUtils[key];
}
export default utils;
