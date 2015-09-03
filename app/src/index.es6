// deps
import app from 'app';
import menubar from 'menubar';
import ipc from 'ipc';
import path from 'path';
import crashReporter from 'crash-reporter';
crashReporter.start();
// own deps
import Fritzbox from './fritzbox_layer';
import utils from './utils';

let browserPath = path.join(__dirname, '..', 'browser');

let mb = menubar({
  dir: browserPath,
  preloadWindow: true,
  width: 500,
  height: 700
});

let fritz = new Fritzbox();

let getData = (event, callback) => {
  fritz.getGraph((error, data) => {
    callback ? callback(error, data) : event.sender.send('main', { type: 'data', data: data });
  });
}

ipc.on('renderer', (event, message) => {
  switch(message.type) {
    case 'DATA':
      //just get data and send it back
      getData(event);
      break;
    case 'EXIT':
      app.quit();
      break;
    default:
      console.log("foo");
  }
});
