const { DEFAULT_CONFIG, runAndroidAutomation } = require('./automation');

runAndroidAutomation(DEFAULT_CONFIG).catch((error) => {
  console.error(error);
  process.exit(1);
});
