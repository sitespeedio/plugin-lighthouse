const puppeteer = require('puppeteer');
const lighthouse = require('lighthouse');

const defaultChromeSettings = {
  ignoreHTTPSErrors: true,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu']
};

const launchBrowser = async () => puppeteer.launch(defaultChromeSettings);

const closeBrowser = async browser => browser.close();

const getPort = browser => {
  const browserWSEndpoint = browser.wsEndpoint();
  const { port } = require('url').parse(browserWSEndpoint);
  return port;
};

const executePreScript = async ({ browser, preScript }) =>
  require(preScript)(browser);

const runLighthouse = async ({
  url,
  port,
  lightHouseConfig,
  lighthouseFlags
}) => {
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
  const browser = await launchBrowser();

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
