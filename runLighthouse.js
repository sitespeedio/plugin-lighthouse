import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

export async function runLighthouse(url, flags, config, chromeFlags, log) {
  let chrome;
  try {
    chrome = await chromeLauncher.launch({ chromeFlags });
    flags.port = chrome.port;
    flags.output = 'html';
  } catch (error) {
    log.error(
      'Could not start Chrome with flags: %:2j and error %s',
      chromeFlags,
      error
    );
    throw error;
  }

  let result = {};
  try {
    result = await lighthouse(url, flags, config);
  } catch (error) {
    log.error(
      'Lighthouse could not test %s please create an upstream issue: https://github.com/GoogleChrome/lighthouse/issues/new?assignees=&labels=bug&template=bug-report.yml',
      url,
      error
    );
    throw error;
  }
  try {
    await chrome.kill();
  } catch (error) {
    log.error('Could not kill chrome: %s', error);
  }

  return result;
}
