"use strict";

const appdmg = require("appdmg");

const pkg = require("./package.json");

const fs = require("fs");
const path = require("path");
const exec = require("child_process").exec;
const execSync = require("child_process").execSync;

const zip = require("gulp-zip");
const del = require("del");
const NwBuilder = require("nw-builder");

const gulp = require("gulp");
const yarn = require("gulp-yarn");
const rename = require("gulp-rename");
const os = require("os");
const git = require("git-rev-sync");
const commandExistsSync = require("command-exists").sync;

const DIST_DIR = "./dist/";
const APPS_DIR = "./apps/";
const DEBUG_DIR = "./debug/";
const RELEASE_DIR = "./release/";

var nwBuilderOptions = {
  version: "0.36.4",
  files: "./dist/**/*",
  macIcns: './images/icon_128.icns',
  macPlist: {
    CFBundleDisplayName: "KISS GUI",
    CFBundleIdentifier: "com.flyduino.kissgui"
  },
  //    winIco: './images/icon_128.ico',
  zip: false
};

//-----------------
//Pre tasks operations
//-----------------
const SELECTED_PLATFORMS = getInputPlatforms();

//-----------------
//Tasks
//-----------------

gulp.task(
  "clean",
  gulp.parallel(clean_dist, clean_apps, clean_debug, clean_release)
);

gulp.task("clean-dist", clean_dist);

gulp.task("clean-apps", clean_apps);

gulp.task("clean-debug", clean_debug);

gulp.task("clean-release", clean_release);

gulp.task("clean-cache", clean_cache);

var distBuild = gulp.series(dist_src);
var distRebuild = gulp.series(clean_dist, distBuild);
gulp.task("dist", distRebuild);

var appsBuild = gulp.series(
  gulp.parallel(clean_apps, distRebuild),
  apps,
  gulp.parallel(listPostBuildTasks(APPS_DIR))
);
gulp.task("apps", appsBuild);

var debugBuild = gulp.series(
  distBuild,
  debug,
  gulp.parallel(listPostBuildTasks(DEBUG_DIR)),
  start_debug
);
gulp.task("debug", debugBuild);

var releaseBuild = gulp.series(
  gulp.parallel(clean_release, appsBuild),
  gulp.parallel(listReleaseTasks())
);
gulp.task("release", releaseBuild);

gulp.task("default", debugBuild);

// -----------------
// Helper functions
// -----------------

// Get platform from commandline args
// #
// # gulp <task> [<platform>]+        Run only for platform(s) (with <platform> one of --linux64, --linux32, --osx64, --win32, --win64, or --chromeos)
// #
function getInputPlatforms() {
  var supportedPlatforms = [
    "linux64",
    "linux32",
    "osx64",
    "win32",
    "win64",
    "chromeos"
  ];
  var platforms = [];
  var regEx = /--(\w+)/;
  console.log(process.argv);
  for (var i = 3; i < process.argv.length; i++) {
    var arg = process.argv[i].match(regEx)[1];
    if (supportedPlatforms.indexOf(arg) > -1) {
      platforms.push(arg);
    } else {
      console.log("Unknown platform: " + arg);
      process.exit();
    }
  }

  if (platforms.length === 0) {
    var defaultPlatform = getDefaultPlatform();
    if (supportedPlatforms.indexOf(defaultPlatform) > -1) {
      platforms.push(defaultPlatform);
    } else {
      console.error(
        `Your current platform (${os.platform()}) is not a supported build platform. Please specify platform to build for on the command line.`
      );
      process.exit();
    }
  }

  if (platforms.length > 0) {
    console.log("Building for platform(s): " + platforms + ".");
  } else {
    console.error("No suitable platforms found.");
    process.exit();
  }

  return platforms;
}

// Gets the default platform to be used
function getDefaultPlatform() {
  var defaultPlatform;
  switch (os.platform()) {
    case "darwin":
      defaultPlatform = "osx64";

      break;
    case "linux":
      defaultPlatform = "linux64";

      break;
    case "win32":
      defaultPlatform = "win32";

      break;

    default:
      defaultPlatform = "";

      break;
  }
  return defaultPlatform;
}

function getPlatforms() {
  return SELECTED_PLATFORMS.slice();
}

function removeItem(platforms, item) {
  var index = platforms.indexOf(item);
  if (index >= 0) {
    platforms.splice(index, 1);
  }
}

function getRunDebugAppCommand(arch) {
  switch (arch) {
    case "osx64":
      return "open " + path.join(DEBUG_DIR, pkg.name, arch, pkg.name + ".app");

      break;

    case "linux64":
    case "linux32":
      return path.join(DEBUG_DIR, pkg.name, arch, pkg.name);

      break;

    case "win32":
    case "win64":
      return path.join(DEBUG_DIR, pkg.name, arch, pkg.name + ".exe");

      break;

    default:
      return "";

      break;
  }
}

function getReleaseFilename(platform, ext) {
  return (
    pkg.name +
    "_" +
    pkg.version +
    "-" +
    git.branch() +
    "_" +
    git.short() +
    "-" +
    platform +
    "." +
    ext
  );
}

function clean_dist() {
  return del([DIST_DIR + "**"], { force: true });
}

function clean_apps() {
  return del([APPS_DIR + "**"], { force: true });
}

function clean_debug() {
  return del([DEBUG_DIR + "**"], { force: true });
}

function clean_release() {
  return del([RELEASE_DIR + "**"], { force: true });
}

function clean_cache() {
  return del(["./cache/**"], { force: true });
}

// Real work for dist task. Done in another task to call it via
// run-sequence.
function dist_src() {
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

  return (
    gulp
      .src(distSources, { base: "." })
      .pipe(gulp.src("manifest.json", { passthrougth: true }))
      .pipe(gulp.src("package.json", { passthrougth: true }))
      // .pipe(gulp.src('changelog.html', { passthrougth: true }))
      .pipe(gulp.dest(DIST_DIR))
      .pipe(
        yarn({
          production: true,
          ignoreScripts: true
        })
      )
  );
}

// Create runnable app directories in ./apps
function apps(done) {
  var platforms = getPlatforms();
  removeItem(platforms, "chromeos");

  buildNWApps(platforms, "normal", APPS_DIR, done);
}

function listPostBuildTasks(folder, done) {
  var platforms = getPlatforms();

  var postBuildTasks = [];

  if (platforms.indexOf("linux32") != -1) {
    postBuildTasks.push(function post_build_linux32(done) {
      return post_build("linux32", folder, done);
    });
  }

  if (platforms.indexOf("linux64") != -1) {
    postBuildTasks.push(function post_build_linux64(done) {
      return post_build("linux64", folder, done);
    });
  }

  // We need to return at least one task, if not gulp will throw an error
  if (postBuildTasks.length == 0) {
    postBuildTasks.push(function post_build_none(done) {
      done();
    });
  }
  return postBuildTasks;
}

function post_build(arch, folder, done) {
  if (arch === "linux32" || arch === "linux64") {
    // Copy Ubuntu launcher scripts to destination dir
    var launcherDir = path.join(folder, pkg.name, arch);
    console.log("Copy Ubuntu launcher scripts to " + launcherDir);
    return gulp.src("assets/linux/**").pipe(gulp.dest(launcherDir));
  }

  return done();
}

// Create debug app directories in ./debug
function debug(done) {
  var platforms = getPlatforms();
  removeItem(platforms, "chromeos");

  buildNWApps(platforms, "sdk", DEBUG_DIR, done);
}

function buildNWApps(platforms, flavor, dir, done) {
  if (platforms.length > 0) {
    var builder = new NwBuilder(
      Object.assign(
        {
          buildDir: dir,
          platforms: platforms,
          flavor: flavor
        },
        nwBuilderOptions
      )
    );
    builder.on("log", console.log);
    builder.build(function(err) {
      if (err) {
        console.log("Error building NW apps: " + err);
        clean_debug();
        process.exit(1);
      }
      done();
    });
  } else {
    console.log("No platform suitable for NW Build");
    done();
  }
}

function start_debug(done) {
  var platforms = getPlatforms();

  if (platforms.length === 1) {
    var run = getRunDebugAppCommand(platforms[0]);
    console.log("Starting debug app (" + run + ")...");
    exec(run);
  } else {
    console.log("More than one platform specified, not starting debug app");
  }
  done();
}

// Create distribution package (zip) for windows and linux platforms
function release_zip(arch) {
  var src = path.join(APPS_DIR, pkg.name, arch, "**");
  var output = getReleaseFilename(arch, "zip");
  var base = path.join(APPS_DIR, pkg.name, arch);

  return compressFiles(src, base, output, "KISS GUI");
}

// Create distribution package for chromeos platform
function release_chromeos() {
  var src = path.join(DIST_DIR, "**");
  var output = getReleaseFilename("chromeos", "zip");
  var base = DIST_DIR;

  return compressFiles(src, base, output, ".");
}

// Compress files from srcPath, using basePath, to outputFile in the RELEASE_DIR
function compressFiles(srcPath, basePath, outputFile, zipFolder) {
  return gulp
    .src(srcPath, { base: basePath })
    .pipe(
      rename(function(actualPath) {
        actualPath.dirname = path.join(zipFolder, actualPath.dirname);
      })
    )
    .pipe(zip(outputFile))
    .pipe(gulp.dest(RELEASE_DIR));
}


// Create distribution package for macOS platform
function osx64_sign(done) {
  if (commandExistsSync("tmp/codesign.sh")) {
    console.log("Codesign activity...");
    execSync("tmp/codesign.sh", function(error, stdOut, stdErr) {
    });
  } else {
    console.log("No valid script for codesign");
  }
  //release_zip("osx64",done);
  release_osx64(done);
  return done();
}


function release_osx64(done) {
  // Create DMG
  createDirIfNotExists(RELEASE_DIR);
  const ee = appdmg({
    target: path.join(RELEASE_DIR, getReleaseFilename("macOS", "dmg")),
    basepath: path.join(APPS_DIR, pkg.name, "osx64"),
    specification: {
      title: "KISS GUI",
      contents: [
        { x: 370, y: 170, type: "link", path: "/Applications" },
        {
          x: 90,
          y: 170,
          type: "file",
          path: pkg.name + ".app",
          name: "KISS GUI.app"
        }
      ],
      icon: path.join(__dirname, 'images/icon_128.icns'),
      background: path.join(__dirname, 'images/dmg-background.png'),

      format: "UDZO",
      window: {
        size: {
            width: 600,
            height: 400
        }
      }
    }
  }).on("progress", function(info) {
    if (info.type == "step-begin")
      console.log(info.title + " [" + info.current + "/" + info.total + "]");
    else console.log("..");
  });

  ee.on("error", function(err) {
    console.log(err);
  });
  
  return done();
}

// Create the dir directory, with write permissions
function createDirIfNotExists(dir) {
  fs.mkdir(dir, "0775", function(err) {
    if (err) {
      if (err.code !== "EEXIST") {
        throw err;
      }
    }
  });
}

// Create a list of the gulp tasks to execute for release
function listReleaseTasks(done) {
  var platforms = getPlatforms();

  var releaseTasks = [];

  if (platforms.indexOf("chromeos") !== -1) {
    releaseTasks.push(release_chromeos);
  }

  if (platforms.indexOf("linux64") !== -1) {
    releaseTasks.push(function release_linux64_zip() {
      return release_zip("linux64");
    });
  }

  if (platforms.indexOf("linux32") !== -1) {
    releaseTasks.push(function release_linux32_zip() {
      return release_zip("linux32");
    });
  }

  if (platforms.indexOf("osx64") !== -1) {
    releaseTasks.push(function release_osx64_dmg(done) {
      return osx64_sign(done);
    });
  }

  if (platforms.indexOf("win32") !== -1) {
    releaseTasks.push(function release_win32_zip() {
      return release_zip("win32");
    });
  }

  if (platforms.indexOf("win64") !== -1) {
    releaseTasks.push(function release_win64_zip() {
      return release_zip("win64");
    });
  }

  return releaseTasks;
}