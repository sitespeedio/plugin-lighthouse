const puppeteer = require('puppeteer');
const lighthouse = require('lighthouse');
const merge = require('lodash.merge');

const defaultChromeSettings = {
  ignoreHTTPSErrors: true,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu']
};

const launchBrowser = async puppeteerSettings =>
  puppeteer.launch(merge(defaultChromeSettings, puppeteerSettings));

const closeBrowser = async browser => browser.close();

const getPort = browser => {
  const browserWSEndpoint = browser.wsEndpoint();
  const { port } = require('url').parse(browserWSEndpoint);
  return port;
};

const executePreScript = ({ browser, lighthousePreScript }) =>
  require(lighthousePreScript)(browser);

const runLighthouse = async ({
  url,
  port,
  lightHouseConfig,
  lighthouseFlags
}) => {
  if (lightHouseConfig && !lightHouseConfig.extends) {
    lightHouseConfig.extends = 'lighthouse:default';
  }

  const results = await lighthouse(
    url,
    Object.assign(
      {},
      {
        port
      },
      lighthouseFlags
    ),
    lightHouseConfig
  );

  const lhrAndReport = { lhr: results.lhr, report: results.report };
  return lhrAndReport;
};

module.exports = async function runAudit({
  url,
  lightHouseConfig,
  lighthouseFlags,
  lighthousePreScript
}) {
  const puppeteerSettings = lightHouseConfig.puppeteer || {};
  const browser = await launchBrowser(puppeteerSettings);

  if (lighthousePreScript) {
    await executePreScript({ browser, lighthousePreScript });
  }

  const results = await runLighthouse({
    url,
    port: getPort(browser),
    lightHouseConfig,
    lighthouseFlags
  });

  await closeBrowser(browser);

  return results;
};
