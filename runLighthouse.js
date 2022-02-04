const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

async function runLighthouse(url, flags, config, chromeFlags, log) {
  const chrome = await chromeLauncher.launch({ chromeFlags });
  flags.port = chrome.port;
  flags.output = 'html';

  let result = {};
  try {
    result = await lighthouse(url, flags, config);
  } catch (e) {
    log.error(
      'Lighthouse could not test %s please create an upstream issue: https://github.com/GoogleChrome/lighthouse/issues/new?assignees=&labels=bug&template=bug-report.yml',
      url,
      e
    );
    throw e;
  }
  try {
    await chrome.kill();
  } catch (e) {
    log.error('Could not kill chrome: %s', e);
  }

  return result;
}

module.exports = runLighthouse;
