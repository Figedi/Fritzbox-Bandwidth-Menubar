'use strict';

let _stringify = (o) => {
  let stringifyable = /Object|Array/.test(Object.prototype.toString.call(o))
  return stringifyable ? JSON.stringify(o) : o
}

// permanent config store, cant require electron modules here due to jspm resolving
// issues when requiring this utils class
//
export class ConfigStore {

  constructor(fs, userFolder) {
    this.fs = fs;
    this.userFolder = userFolder;
    this.configFile = `${userFolder}/config.json`;
    this.testFile();
  }

  testFile() {
    this.fs.stat(this.configFile, (e, stat) => {
      if (e && e.code == 'ENOENT') {
        this.fs.writeFile(this.configFile, '{}');
      }
    });
  }

  get() {
    let args = Array.prototype.slice.call(arguments);
    var key, callback;
    if (args.length > 2)
      throw new Error('Too many arguments for set operation, only 2 allowed');
    else if (args.length < 1)
      throw new Error('Too few arguments, need at least a callback function');
    else if (typeof args[0] !== 'function' && typeof args[1] === 'function') {
      key = args[0];
      callback = args[1];
    } else {
      callback = args[0];
    }
    this.fs.readFile(this.configFile, (err, data) => {
      if (err) {
        return callback(err, undefined);
      }
      data = JSON.parse(data + ""); // convert from buffer to string, then parse
      callback(undefined, key ? data[key] : data);
    });
  }

  set(key, value, callback = () => {}) {

    this.get((err, data) => {
      if (err) {
        return callback(err, undefined);
      }
      data[key] = value;
      this.fs.writeFile(this.configFile, JSON.stringify(data), (err) => {
        if (err) {
          return callback(err, undefined);
        }
        else {
          callback(undefined, 'success');
        }
      });
    });
  }
}

export class Logger {

  static LOG_LEVELS = {
    DISABLED: -1,
    LOG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  }

  static MODES = {
    DEV: 0,
    PROD: 1
  }
  constructor(opts = {}) {
    this.loglevel = opts.loglevel == undefined ? Logger.LOG_LEVELS.INFO : opts.loglevel;
    this.fs = opts.fs;
    this.logPath = opts.logPath;
    this.mode = opts.mode == undefined ? Logger.MODES.DEV : opts.mode;
  }

  _log(m, head, ...args) {
    if (this.loglevel == Logger.LOG_LEVELS.DISABLED)
      return;
    let mappedArgs = args.map((e) => { return _stringify(e) });
    if (this.mode == Logger.MODES.PROD && this.fs && this.logPath) {
      mappedArgs.map((arg) => {
        this.fs.appendFile(this.logPath, `[${head} - ${+new Date()}] ${m}: ${arg}\n`);
      });
    } else {
      for (let line of mappedArgs) {
        console[m](`[${head}] ${line}\n`);
      }
    }
  }
  // only support exact log levels for now, don't really want to support
  // multiple (<=) right now
  log(head, ...args) {
    this.loglevel == Logger.LOG_LEVELS.LOG ? this._log('log', head, ...args) : undefined;
  }

  info(head, ...args) {
    this.loglevel == Logger.LOG_LEVELS.INFO ? this._log('info', head, ...args) : undefined;
  }

  error(head, ...args) {
    this.loglevel == Logger.LOG_LEVELS.ERROR ? this._log('error', head, ...args) : undefined;
  }

  warn(head, ...args) {
    this.loglevel == Logger.LOG_LEVELS.WARN ? this._log('warn', head, ...args) : undefined;
  }

  logRaw(...args) {
    for (let arg of args) {
      console.log(`[Log-Raw] ${arg}\n`);
    }
  }
}

export class RemoteLogger {
  constructor(opts = {}) {
    this.logger = new Logger(opts);
    this.ipc = opts.ipc;
  }

  _sendRemote(type, head, args) {
    this.ipc.send('logger', { type: type, head: head, args: args });
  }

  // backup for uncaught events
  bootstrap() {
    console.log = (...args) => this._sendRemote('log', undefined, args);

    window.addEventListener('error', (e) => {
      e.preventDefault();
      this._sendRemote('error', undefined, (e.error.stack && e.error.stack.split('\n')) || 'Uncaught ' + e.error);
    });
  }

  log(head, ...args) {
    this._sendRemote('log', `${head} (Remote)`, args);
  }

  info(head, ...args) {
    this._sendRemote('info', `${head} (Remote)`, args);
  }

  error(head, ...args) {
    this._sendRemote('error', `${head} (Remote)`, args);
  }

  warn(head, ...args) {
    this._sendRemote('warn', `${head} (Remote)`, args);
  }

  logRaw(...args) {
    this._sendRemote('logRaw', 'LogRaw (Remote)', args);
  }
}

//================ Normal Config

export let utils = {
  getLogger: (opts) => { return new Logger(opts); },
  getRemoteLogger: (opts) => { return new RemoteLogger(opts); },
  noop: () => {},
  stringify: _stringify,
  splitLast: (a, splitChar = '\n') => {
    let aSplitted = a.split(splitChar);
    return aSplitted[aSplitted.length - 1];
  }
}
