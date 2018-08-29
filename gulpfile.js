'use strict';

var pkg = require('./package.json');

var git = require('git-rev-sync');

var child_process = require('child_process');
var fs = require('fs');
var path = require('path');

var archiver = require('archiver');
var del = require('del');
var NwBuilder = require('nw-builder');

var gulp = require('gulp');
var concat = require('gulp-concat');
var install = require("gulp-install");
var runSequence = require('run-sequence');
var os = require('os');
var exec = require('child_process').exec;

var distDir = './dist/';
var appsDir = './apps/';
var debugDir = './debug/';
var releaseDir = './release/';
var cacheDir = './cache/';
var nmDir = './node_modules/';

// -----------------
// Helper functions
// -----------------

// Get platform from commandline args
// #
// # gulp <task> [<platform>]+        Run only for platform(s) (with <platform> one of --linux64, --linux32, --osx64, --win32, --win64, or --chromeos)
// # 
function getPlatforms(includeChromeOs) {
    var supportedPlatforms = ['linux64', 'linux32', 'osx64', 'win32', 'win64'];
    var platforms = [];
    var regEx = /--(\w+)/;
    for (var i = 3; i < process.argv.length; i++) {
        var arg = process.argv[i].match(regEx)[1];
        if (supportedPlatforms.indexOf(arg) > -1) {
            platforms.push(arg);
        } else if (arg === 'chromeos') {
            if (includeChromeOs) {
                platforms.push(arg);
            }
        } else {
            console.log(`Your current platform (${os.platform()}) is not a supported build platform. Please specify platform to build for on the command line.`);
            process.exit();
        }
    }
    if (platforms.length === 0) {
        switch (os.platform()) {
            case 'darwin':
                platforms.push('osx64');
                
                break;
            case 'linux':
                platforms.push('linux64');
                
                break;
            case 'win32':
                platforms.push('win32');
                
                break;
            case 'win64':
                platforms.push('win64');
                
                break;
            default:
                break;
        }
    }
    
    console.log('Building for platform(s): ' + platforms + '.');
    
    return platforms;
}

function getRunDebugAppCommand() {
    switch (os.platform()) {
        case 'darwin':
            return 'open ' + path.join(debugDir, pkg.name, 'osx64', pkg.name + '.app');
            
            break;
        case 'linux64':
            return path.join(debugDir, pkg.name, 'linux64', pkg.name);
            
            break;
        case 'linux32':
            return path.join(debugDir, pkg.name, 'linux32', pkg.name);
            
            break;
        case 'win32':
            return path.join(debugDir, pkg.name, 'win32', pkg.name + '.exe');

            break;
            case 'win64':
            return path.join(debugDir, pkg.name, 'win64', pkg.name + '.exe');

            break;
            default:
            return '';
            break;
    }
}
function get_release_filename(platform, ext) {
    
    return 'KISS-GUI_' + pkg.version + '-' + git.branch() + '_' + git.short() + '-' + platform + '.' + ext;
}

// -----------------
// Tasks
// -----------------

gulp.task('clean', function () {
    return runSequence('clean-dist', 'clean-apps', 'clean-debug', 'clean-release');
});

gulp.task('clean-dist', function () {
    return del([distDir + '**'], { force: true });
});

gulp.task('clean-apps', function () {
    return del([appsDir + '**'], { force: true });
});

gulp.task('clean-debug', function () {
    return del([debugDir + '**'], { force: true });
});

gulp.task('clean-release', function () {
    return del([releaseDir + '**'], { force: true });
});

gulp.task('clean-cache', function () {
    return del([cacheDir + '**'], { force: true });
});

gulp.task('clean-node-modules', function () {
    return del([nmDir + '**'], { force: true });
});

// Real work for dist task. Done in another task to call it via
// run-sequence.
gulp.task('dist', ['clean-dist'], function () {

    var distSources = [

        // CSS files
        './main.css',
        './js/libraries/jquery.minicolors.css',
        './js/libraries/jquery-ui.css',
        './js/libraries/jquery-ui.structure.min.css',
        './js/libraries/jquery-ui.theme.min.css',   
        './js/plugins/jquery.kiss.aux.css',
        './js/plugins/jquery.kiss.warning.css',
        './content/*.css',

        // JavaScript
        './js/libraries/github.js',
        './js/libraries/hex_parser.js',
        './js/libraries/imu.js',
        './js/libraries/jquery-3.3.1.min.js',
        './js/libraries/jquery.minicolors.min.js',
        './js/libraries/jquery-ui.min.js',
        './js/libraries/semver.js',       
        './js/libraries/stm32usbdfu.js',
        './js/libraries/three.js',
        './js/libraries/three.min.js',
        './js/libraries/i18n/*.js',
        './js/plugins/jquery.kiss.*.js',
        './js/android_otg_serial.js',
        './js/chrome_serial.js',
        './js/connection_handler.js',
        './js/gui.js',
        './js/input_validation.js',
        './js/port_handler.js',
        './js/protocol.js',
        './js/serial.js',
        './js/startup.js',
        './js/websocket_serial.js',

        // Tabs
        './start.js',
        './main.js',
        './content/*.js',

        // everything else
        './package.json', // For NW.js
        './manifest.json', // For Chrome app
        './eventPage.js',
        './cordova.js', // For cordova
        './*.html',
        './content/*.html',
        './images/*',
        './images/**/*',
        './js/libraries/images/*.png',
        './i18n/*.json',
        './PRESET_PID.txt', // PID presets
        './README.md' // Readme including links for driver
    ];
    return gulp.src(distSources, { base: '.' })
        .pipe(gulp.dest(distDir))
        .pipe(install({
            npm: '--production --ignore-scripts'
        }));;
});
// Create runable app directories in ./apps

// had to remove "winIco: './images/icon_128.ico'" since it require wine 
gulp.task('apps', ['dist', 'clean-apps'], function (done) {
    var platforms = getPlatforms();
    console.log('Release build.');

    var builder = new NwBuilder({
        files: './dist/**/*',
        buildDir: appsDir,
        platforms: platforms,
        flavor: 'normal',
        macIcns: './images/icon_128.icns',
        macPlist: { 'CFBundleDisplayName': 'KISS GUI' }
    });
    builder.on('log', console.log);
    builder.build(function (err) {
        if (err) {
            console.log('Error building NW apps: ' + err);
            runSequence('clean-apps', function () {
                process.exit(1);
            });
        }
        done();
    });
});

// had to remove "winIco: './images/icon_128.ico'" since it require wine
// Create debug app directories in ./debug
gulp.task('debug', ['dist', 'clean-debug'], function (done) {
    var platforms = getPlatforms();
    console.log('Debug build.');

    var builder = new NwBuilder({
        files: './dist/**/*',
        buildDir: debugDir,
        platforms: platforms,
        flavor: 'sdk',
        macIcns: './images/icon_128.icns',
        macPlist: { 'CFBundleDisplayName': 'KISS GUI' }
    });
    builder.on('log', console.log);
    builder.build(function (err) {
        if (err) {
            console.log('Error building NW apps: ' + err);
            runSequence('clean-debug', function () {
                process.exit(1);
            });
        }
        var run = getRunDebugAppCommand();
        console.log('Starting debug app (' + run + ')...');
        //exec(run);
        done();
    });
});

// Create distribution package for windows and linux platforms
function release(arch) {
    var src = path.join(appsDir, pkg.name, arch);
    var output = fs.createWriteStream(path.join(releaseDir, get_release_filename(arch, 'zip')));
    var archive = archiver('zip', {
        zlib: { level: 9 }
    });
    archive.on('warning', function (err) { throw err; });
    archive.on('error', function (err) { throw err; });
    archive.pipe(output);
    archive.directory(src, 'KISS-GUI');
    return archive.finalize();
}

// Create distribution package for chromeos platform
function release_chromeos() {
    var src = distDir;
    var output = fs.createWriteStream(path.join(releaseDir, get_release_filename('chromeos', 'zip')));
    var archive = archiver('zip', {
        zlib: { level: 9 }
    });
    archive.on('warning', function (err) { throw err; });
    archive.on('error', function (err) { throw err; });
    archive.pipe(output);
    archive.directory(src, false);
    return archive.finalize();
}

// Create distribution package for macOS platform
function release_osx64() {
    var appdmg = require('gulp-appdmg');
    return gulp.src([])
        .pipe(appdmg({
            target: path.join(releaseDir, get_release_filename('macOS', 'dmg')),
            basepath: path.join(appsDir, pkg.name, 'osx64'),
            specification: {
                title: 'KISS GUI',
                contents: [
                    { 'x': 370, 'y': 170, 'type': 'link', 'path': '/Applications' },
                    { 'x': 90, 'y': 170, 'type': 'file', 'path': pkg.name + '.app', 'name': 'KISS GUI.app' }
                ],
                icon: path.join(__dirname, 'images/icon_128.icns'),
                background: path.join(__dirname, 'images/dmg-background.png'),
                format: 'UDZO',
                window: {
                    size: {
                        width: 600,
                        height: 400
                    }
                }
            },
        })
        );
}

// Create distributable .zip files in ./release
gulp.task('release', ['apps', 'clean-release'], function () {
    fs.mkdir(releaseDir, '0775', function (err) {
        if (err) {
            if (err.code !== 'EEXIST') {
                throw err;
            }
        }
    });
    var platforms = getPlatforms(true);
    console.log('Packing release.');
    if (platforms.indexOf('chromeos') !== -1) {
        release_chromeos();
    }
    if (platforms.indexOf('linux64') !== -1) {
        release('linux64');
    }
    if (platforms.indexOf('linux32') !== -1) {
        release('linux32');
    }
    if (platforms.indexOf('osx64') !== -1) {
        release_osx64();
    }
    if (platforms.indexOf('win32') !== -1) {
        release('win32');
    }
    if (platforms.indexOf('win64') !== -1) {
        release('win64');
    }
});
gulp.task('default', ['debug']);