// deps
import app from 'app';
import menubar from 'menubar';
import ipc from 'ipc';
import path from 'path';
import Promise from 'bluebird';
import fs from 'fs';
import _ from 'lodash';

let packageJson = require('../package.json');
// for some reason getName doesnt output the name of package.json, thus it fails to write a custom directory
app.setPath('userData', app.getPath('userData') + '/' + packageJson.name);

// own deps
import Fritzbox from './fritzbox_layer';
import { utils, Logger, ConfigStore } from './common';
import Startup from './startup';

// consts

const DEBUG = false; //switch to true for larger view and devtools
const BROWSER_PATH = path.join(__dirname, '..', 'browser');

let config = new ConfigStore(fs, app.getPath('userData'));

let startup = new Startup({
  user: process.env.USER, // username
  label: `de.figedi.${packageJson.name}`,
  overrideFile: true,
  plist: {
    path: process.env.PATH,
    binary: process.argv[0], // default args with binary
    indexPath: process.argv[1] //this folder -> index.js
  }
});

let logger = utils.getLogger({
  mode: Logger.MODES.DEV,
  loglevel: Logger.LOG_LEVELS.LOG,
  fs: fs,
  logPath: `${app.getPath('userData')}/production.log`
});
// attaching remote logger to normal logger
ipc.on('logger', (event, message) => {
  logger[message.type](message.head || 'Remote Log', ...message.args);
});

let fritz, mb;
if (DEBUG) {
  mb = menubar({
    dir: BROWSER_PATH,
    preloadWindow: true,
    width: 1000,
    height: 1000
  });

  mb.on('ready', function() {
    mb.window.webContents.openDevTools();
  });
} else {
  mb = menubar({
    dir: BROWSER_PATH,
    preloadWindow: true,
    width: 350,
    height: 640
  });
}

let setupTransport = (cb) => {
  config.get('form', (e, d) => {
    if (fs.existsSync('./config')) {
      let conf = require('./config');
      d = _.assign(conf, d);
    }
    fritz = new Fritzbox(d, logger);
    cb();
  });
}

let resetupTransport = (cb) => {
  ipc.removeListener('renderer', onIPCMessage);
  setupTransport(bindEvents);
}

let getData = (sender) => {
  if (!fritz)
    return;
  fritz.getGraph().then((data) => {
    sender.send('main', { type: 'data', data: data });
  })
  .catch(SyntaxError, (error) => { // parse error during xml parsing
    sender.send('main', { type: 'data-error', error: error });
  })
  .catch((error) => { // unknown error
    if (error.code == 'EACCES' || error.code == 'ENOTFOUND' || error.code == 'SID_ERROR') {
      sender.send('main', { type: 'connection-error', error: error });
    } else {
      console.log('Error', 'Unknown Error', error);
    }
  });
}

let bindEvents = () => {
  ipc.on('renderer', onIPCMessage);
};

let onIPCMessage = (event, message) => {
  switch(message.type) {
    case 'DATA':
      //just get data and send it back
      getData(event.sender);
      break;
    case 'EXIT':
      app.quit();
      break;
    case 'STARTUP_ON':
      startup.load((e) => {
        event.sender.send('config', { type: 'STARTUP_STATUS', status: e == undefined ? 'ON' : 'OFF' });
      });
      break;
    case 'STARTUP_OFF':
      startup.unload((e) => {
        event.sender.send('config', { type: 'STARTUP_STATUS', status: e == undefined ? 'OFF' : 'ON' });
      });
      break;
    case 'CONFIG_CHANGED':
      resetupTransport();
      break;
    default:
      logger.log('foo', message);
  }
}
setupTransport(bindEvents);
