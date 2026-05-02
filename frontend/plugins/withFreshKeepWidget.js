// Expo config plugin: installs the FreshKeep Android home-screen widget.
//
// This plugin runs at `expo prebuild` time and:
//   1. Copies Kotlin sources from widget-android-src/java/ into
//      android/app/src/main/java/.../widget/
//   2. Copies res/xml/widget_*_info.xml + res/values/widget_strings.xml
//      into android/app/src/main/res/.
//   3. Adds <receiver> entries to AndroidManifest.xml for the three
//      AppWidgetReceivers.
//   4. Adds androidx.glance:glance-appwidget to app/build.gradle.
//
// After every `expo prebuild --clean` this is re-applied, so the native
// code stays in sync with what's in the repo.

const { withDangerousMod, withAndroidManifest, withAppBuildGradle } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PACKAGE_PATH_SUFFIX = ['com', 'owentjandra', 'freshkeep', 'widget'];
const SOURCE_DIR_KOTLIN = path.join(__dirname, '..', 'widget-android-src', 'java', ...PACKAGE_PATH_SUFFIX);
const SOURCE_DIR_RES_XML    = path.join(__dirname, '..', 'widget-android-src', 'res', 'xml');
const SOURCE_DIR_RES_VALUES = path.join(__dirname, '..', 'widget-android-src', 'res', 'values');

const GLANCE_VERSION = '1.1.0';

// ───────── 1. Copy Kotlin sources + res files into the prebuilt android/ dir ─────────

const withWidgetSources = (config) =>
  withDangerousMod(config, [
    'android',
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const androidProjectRoot = cfg.modRequest.platformProjectRoot;

      // Kotlin sources
      const javaTarget = path.join(
        androidProjectRoot, 'app', 'src', 'main', 'java', ...PACKAGE_PATH_SUFFIX
      );
      copyDir(SOURCE_DIR_KOTLIN, javaTarget);

      // res/xml
      const xmlTarget = path.join(androidProjectRoot, 'app', 'src', 'main', 'res', 'xml');
      copyDir(SOURCE_DIR_RES_XML, xmlTarget);

      // res/values  — merge or copy widget_strings.xml
      const valuesTarget = path.join(androidProjectRoot, 'app', 'src', 'main', 'res', 'values');
      ensureDir(valuesTarget);
      fs.copyFileSync(
        path.join(SOURCE_DIR_RES_VALUES, 'widget_strings.xml'),
        path.join(valuesTarget, 'widget_strings.xml')
      );

      return cfg;
    },
  ]);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyDir(src, dst) {
  ensureDir(dst);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

// ───────── 2. AndroidManifest receivers ─────────

const RECEIVERS = [
  { className: '.widget.FreshKeepSmallWidgetReceiver',  metadataResource: '@xml/widget_small_info'  },
  { className: '.widget.FreshKeepMediumWidgetReceiver', metadataResource: '@xml/widget_medium_info' },
  { className: '.widget.FreshKeepLargeWidgetReceiver',  metadataResource: '@xml/widget_large_info'  },
];

const withWidgetManifest = (config) =>
  withAndroidManifest(config, (cfg) => {
    const application = cfg.modResults.manifest.application?.[0];
    if (!application) return cfg;
    application.receiver = application.receiver || [];

    for (const r of RECEIVERS) {
      // Avoid duplicate inserts when prebuild re-runs.
      const exists = application.receiver.some(
        (rec) => rec.$['android:name'] === r.className
      );
      if (exists) continue;

      application.receiver.push({
        $: {
          'android:name':     r.className,
          'android:exported': 'false',
        },
        'intent-filter': [{
          action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }],
        }],
        'meta-data': [{
          $: {
            'android:name':     'android.appwidget.provider',
            'android:resource': r.metadataResource,
          },
        }],
      });
    }
    return cfg;
  });

// ───────── 3. Glance dependency in app/build.gradle ─────────

const withGlanceDependency = (config) =>
  withAppBuildGradle(config, (cfg) => {
    const dep = `implementation "androidx.glance:glance-appwidget:${GLANCE_VERSION}"`;
    if (cfg.modResults.contents.includes(dep)) return cfg;
    cfg.modResults.contents = cfg.modResults.contents.replace(
      /dependencies\s*\{/,
      `dependencies {\n    ${dep}`
    );
    return cfg;
  });

// ───────── Compose ─────────

module.exports = function withFreshKeepWidget(config) {
  config = withWidgetSources(config);
  config = withWidgetManifest(config);
  config = withGlanceDependency(config);
  return config;
};
