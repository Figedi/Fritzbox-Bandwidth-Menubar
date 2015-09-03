# Fritzbox-Bandwidth-Menubar

Small Menubar Application which shows the current Bandwidth usage for Fritzbox Routers

# Installation

This project uses Angular over JSPM over Electron and NPM over Electron. Standard Installation rules apply (`jspm install`, `npm install`)

# Known Bugs

JSPM has this weird issue, that it replaces the `baseURL` in the `config.js` after package installation to the system path. 
After that, it cannot find packages anymore. I fixed that by always changing the path to `__dirname + "/"` afterwards. Maybe
I just overlook an issue here but that did the fix.


