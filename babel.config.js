module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Expo Router plugin also wires up TS path aliases like "@/*"
      'expo-router/babel',
      // Must be last per Reanimated docs
      'react-native-reanimated/plugin',
    ],
  };
};
