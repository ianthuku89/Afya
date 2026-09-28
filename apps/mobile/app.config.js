module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    // versionCode removed: EAS manages it (remote version source)
    versionCode: undefined,
  },
  extra: {
    ...config.extra,
    apiUrl: process.env.API_URL || config.extra?.apiUrl,
  },
});