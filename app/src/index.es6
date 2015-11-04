// deps
import app from 'app';
import menubar from 'menubar';
import ipc from 'ipc';
import path from 'path';
import Promise from 'bluebird';
import fs from 'fs';

let packageJson = require('../package.json');
// for some reason getName doesnt output the name of package.json, thus it fails to write a custom directory
app.setPath('userData', app.getPath('userData') + '/' + packageJson.name);

// own deps
import Fritzbox from './fritzbox_layer';
import { utils, Logger, ConfigStore } from './common';
import { config } from './config';

// consts

const DEBUG = false; //switch to true for larger view and devtools
const BROWSER_PATH = path.join(__dirname, '..', 'browser');

let logger = utils.getLogger({
  mode: Logger.MODES.PROD,
  loglevel: Logger.LOG_LEVELS.INFO,
  fs: fs,
  logPath: `${app.getPath('userData')}/production.log`
});
// attaching remote logger to normal logger
ipc.on('logger', (event, message) => {
  logger[message.type](message.head || 'Remote Log', ...message.args);
});

let mb;
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

let fritz = new Fritzbox(config.fritzbox, logger);

let getData = (sender) => {
  fritz.getGraph().then((data) => {
    sender.send('main', { type: 'data', data: data });
  })
  .catch(SyntaxError, (error) => { // parse error during xml parsing
    sender.send('main', { type: 'data-error', error: error });
  })
  .catch((error) => { // unknown error
    console.log('Error', 'Unknown Error', error);
  });
}

ipc.on('renderer', (event, message) => {
  switch(message.type) {
    case 'DATA':
      //just get data and send it back
      getData(event.sender);
      break;
    case 'EXIT':
      app.quit();
      break;
    default:
      logger.log('foo', message);
  }
});
