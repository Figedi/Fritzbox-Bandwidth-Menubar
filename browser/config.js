System.config({
  "baseURL": __dirname + "/",
  "transpiler": "babel",
  "babelOptions": {
    "optional": [
      "runtime"
    ]
  },
  "paths": {
    "*": "*.js",
    "github:*": "jspm_packages/github/*.js",
    "npm:*": "jspm_packages/npm/*.js",
    "common": "../app/common.js"
  },
  "buildCSS": true,
  "separateCSS": false
});

System.config({
  "map": {
    "angular": "github:angular/bower-angular@1.4.5",
    "angular-chart": "npm:angular-chart.js@0.8.1",
    "babel": "npm:babel-core@5.8.23",
    "babel-runtime": "npm:babel-runtime@5.8.20",
    "bootstrap": "github:twbs/bootstrap@3.3.5",
    "chart.js": "npm:chart.js@1.0.2",
    "core-js": "npm:core-js@0.9.18",
    "css": "github:systemjs/plugin-css@0.1.15",
    "highcharts-ng": "npm:highcharts-ng@0.0.9-dev",
    "github:jspm/nodelibs-process@0.1.1": {
      "process": "npm:process@0.10.1"
    },
    "github:twbs/bootstrap@3.3.5": {
      "jquery": "github:components/jquery@2.1.4"
    },
    "npm:angular-chart.js@0.8.1": {
      "fs": "github:jspm/nodelibs-fs@0.1.2"
    },
    "npm:babel-runtime@5.8.20": {
      "process": "github:jspm/nodelibs-process@0.1.1"
    },
    "npm:chart.js@1.0.2": {
      "child_process": "github:jspm/nodelibs-child_process@0.1.0",
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "systemjs-json": "github:systemjs/plugin-json@0.1.0"
    },
    "npm:core-js@0.9.18": {
      "fs": "github:jspm/nodelibs-fs@0.1.2",
      "process": "github:jspm/nodelibs-process@0.1.1",
      "systemjs-json": "github:systemjs/plugin-json@0.1.0"
    },
    "npm:highcharts-ng@0.0.9-dev": {
      "process": "github:jspm/nodelibs-process@0.1.1"
    }
  }
});
