import request from 'request';
import common from './common';

let utils = {
  writeURL: (url, data, callback) => {
    let opts = {
      url: url + `?username=admin&response=${data}`
    }
    request(opts, (error, response, body) => {
      if (error) {
        _log('Renderer', error);
        callback(error, undefined);
      }
      else {
        callback(undefined, body)
      }
    });
  },
  readURL: (url, callback) => {
    let opts = {
      url: url,
      headers: {
        'Accept': 'application/xml',
        'Content-Type': 'text/plain'
      }
    }
    request(opts, (error, response, body) => {
      if (error) {
        _log('Renderer', error);
        callback(error, undefined);
      }
      else {
        callback(undefined, body);
      }
    });
  }
}
for (let key in common) {
  utils[key] = common[key];
}
export default utils;
