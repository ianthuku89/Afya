module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins || []),
    'expo-font',
  ],
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
