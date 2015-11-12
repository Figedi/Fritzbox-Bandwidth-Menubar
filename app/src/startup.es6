let exec = require('child_process').exec;
let fs = require('fs');

export default class Startup {

  constructor(opts) {
    this.opts = opts;
    this.filePath = `/Users/${this.opts.user}/Library/LaunchAgents/${this.opts.label}.plist`;
  }

  load(callback) {
    this.makePlist((e) => {
      if (!e) {
        this.activateService(callback);
      }
    });
  }

  unload(callback) {
    this.deactivateService((e) => {
      if (!e) {
        this.removePlist(callback);
      }
    })
  }

  activateService(callback) {
    this.serviceExists((exists) => {
      if (!exists) {
        exec(`launchctl load ${this.filePath}`, () => {
          exec(`launchctl stop ${this.opts.label}`, callback)
        });
      }
      else {
        callback(false);
      }
    });
  }

  deactivateService(callback) {
    this.serviceExists((exists) => {
      if (exists) {
        exec(`launchctl unload ${this.filePath}`, callback);
      }
      else {
        callback(false);
      }
    });
  }
  // true <=> exists
  fileExists(callback) {
    fs.stat(this.filePath, (e, stat) => {
      callback(e == undefined);
    })
  }

  // true <=> exists
  // todo: noch buggy
  serviceExists(callback) {
    exec(`launchctl list ${this.opts.label}`, (e) => {
      callback(e == undefined);
    })
  }

  removePlist(callback) {
    exec(`rm ${this.filePath}`, callback);
  }

  makePlist(callback) {
    let writeFile = () => {
      let content =
        `<?xml version=\\"1.0\\" encoding=\\"UTF-8\\"?>
        <!DOCTYPE plist PUBLIC \\"-//Apple//DTD PLIST 1.0//EN\\" \\"http://www.apple.com/DTDs/PropertyList-1.0.dtd\\">
        <plist version=\\"1.0\\">
        <dict>
          <key>Disabled</key>
          <false/>
          <key>EnvironmentVariables</key>
          <dict>
            <key>PATH</key>
            <string>${this.opts.plist.path}</string>
          </dict>
          <key>KeepAlive</key>
          <false/>
          <key>Label</key>
          <string>${this.opts.label}</string>
          <key>ProgramArguments</key>
          <array>
            <string>${this.opts.plist.binary}</string>
            <string>${this.opts.plist.indexPath}</string>
          </array>
          <key>RunAtLoad</key>
          <true/>
        </dict>
        </plist>`
      // escaping of content?
      let cmd = `echo "${content}" > ${this.filePath}`;
      exec(cmd, callback);
    }

    // always overwrite the file if wished in opts, else check b4 writing
    if (this.opts.overrideFile) {
      writeFile();
    } else {
      this.fileExists((exists) => {
        return exists ? callback(true) : writeFile();
      });
    }
  }
}
