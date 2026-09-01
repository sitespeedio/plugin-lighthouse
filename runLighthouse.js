import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

import { installCookies, parseCookies } from './cookies.js';

export function prepareLighthouseRun(url, flags = {}) {
  const { cookies, lighthouseFlags } = parseCookies(url, flags);

  if (cookies.length > 0) lighthouseFlags.disableStorageReset = true;
  return { cookies, lighthouseFlags };
}

export async function runLighthouse(url, flags, config, chromeFlags, log) {
  const { cookies, lighthouseFlags } = prepareLighthouseRun(url, flags);
  let chrome;
  try {
    chrome = await chromeLauncher.launch({ chromeFlags });
    lighthouseFlags.port = chrome.port;
    lighthouseFlags.output = 'html';
  } catch (error) {
    log.error(
      'Could not start Chrome with flags: %:2j and error %s',
      chromeFlags,
      error
    );
    throw error;
  }

  try {
    if (cookies.length > 0) {
      try {
        await installCookies(chrome.port, cookies);
        log.info('Installed %d cookies in Lighthouse Chrome', cookies.length);
      } catch (error) {
        log.error('Could not install cookies in Lighthouse Chrome: %s', error);
        throw error;
      }
    }

    return await lighthouse(url, lighthouseFlags, config);
  } catch (error) {
    log.error(
      'Lighthouse could not test %s please create an upstream issue: https://github.com/GoogleChrome/lighthouse/issues/new?assignees=&labels=bug&template=bug-report.yml',
      url,
      error
    );
    throw error;
  } finally {
    try {
      await chrome.kill();
    } catch (error) {
      log.error('Could not kill chrome: %s', error);
    }
  }
}
