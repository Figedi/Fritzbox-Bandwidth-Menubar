var gulp   = require('gulp'),
    babel  = require('gulp-babel'),
    runElectron = require("gulp-run-electron"),
    rename = require('gulp-rename'),
    electron = require('gulp-electron'),
    del = require('del')
    packageJson = require('./package.json');

gulp.task('transpile-app', function() {
  return gulp.src('app/src/*.es6')
    .pipe(babel())
    .pipe(rename(function(path) {
      path.extname = '.js'
    }))
    .pipe(gulp.dest('app'));
});

gulp.task('build', ['transpile-app'])

gulp.task('clean', function(cb) {
  return del(['package'], cb);
});

gulp.task('copy-app', ['build', 'clean'], function() {
  var nodeModules = Object.keys(packageJson.dependencies).map(function(dep) {
    return 'node_modules/' + dep + '/**/*';
  });
  return gulp.src(['app/*', 'browser/**/*', 'package.json'].concat(nodeModules), {
      base: '.'
    })
    .pipe(gulp.dest('package'));
});

gulp.task('dist', ['build', 'copy-app'], function() {
  var electronVersion = 'v' + packageJson.devDependencies['electron-prebuilt'].replace(/\^|~/g, '');
  return gulp.src('')
    .pipe(electron({
      src: './package',
      packageJson: packageJson,
      release: './dist',
      cache: './cache',
      version: electronVersion,
      apm: '/usr/local/bin/apm',
      platforms: 'darwin-x64',
      'platformResources': {
        'darwin': {
          'CFBundleDisplayName': 'Fritzbox Menu-let',
          'CFBundleIdentifier': 'de.figedi.fritbox',
          'CFBundleName': 'Fritzbox Menu-let',
          'CFBundleVersion': packageJson.version,
          'icon': './Icon.icns'
        }
      }
    }))

});

gulp.task('run', function() {
  return gulp.src('app')
    .pipe(runElectron());
});


gulp.task('watch', function() {
  gulp.watch(["app/src/*.es6"], ["transpile-app", runElectron.rerun]);
  gulp.watch(["browser/**/*.{js,css,html}", "!browser/jspm_packages/*", "!browser/config.js"], runElectron.rerun);
})

gulp.task('default', ['run', 'watch']);
