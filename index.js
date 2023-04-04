import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SitespeedioPlugin } from '@sitespeed.io/plugin';

import desktopConfiguration from 'lighthouse/core/config/lr-desktop-config.js';
import mobileConfiguration from 'lighthouse/core/config/lr-mobile-config.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

import { runLighthouse } from './runLighthouse.js';

// Metrics that will be passed on to Graphite/Influx DB
const DEFAULT_SUMMARY_METRICS = [
  'categories.seo.score',
  'categories.performance.score',
  'categories.pwa.score',
  'categories.accessibility.score',
  'categories.best-practices.score',
  'audits.first-contentful-paint.numericValue',
  'audits.largest-contentful-paint.numericValue',
  'audits.total-blocking-time.numericValue',
  'audits.cumulative-layout-shift.numericValue'
];

export default class LighthousePlugin extends SitespeedioPlugin {
  constructor(options, context, queue) {
    super({ name: 'lighthouse', options, context, queue });
  }
  // We only want to run one Lighthouse test at a time to make sure they
  // do not interfer with each other
  concurrency = 1;

  async open(context, options) {
    // The pug is the template that is used for creating the HTML result page
    this.pug = readFileSync(resolve(__dirname, 'lighthouse.pug'), 'utf8');

    // It can be complicated what configuration that is used,
    // so always log that for clarity
    if (options.lighthouse && options.lighthouse.config) {
      super.log(
        'Will use Lighthouse configuration file: %s',
        'info',
        resolve(options.lighthouse.config)
      );
      this.lightHouseConfig = await import(resolve(options.lighthouse.config));
      this.lightHouseConfig = this.lightHouseConfig.default;
    } else {
      if (options.mobile || options.android || options.ios) {
        this.lightHouseConfig = mobileConfiguration;
        super.log('Using default Lighthouse configuration for mobile');
      } else {
        super.log('Using default Lighthouse configuration for desktop');
        this.lightHouseConfig = desktopConfiguration;
      }
    }

    if (options.lighthouse && options.lighthouse.flags) {
      super.log(
        'Will use Lighthouse flags file: %s',
        'info',
        resolve(options.lighthouse.flags)
      );
      this.lighthouseFlags = JSON.parse(
        readFileSync(resolve(options.lighthouse.flags), 'utf8')
      );
    } else {
      this.lighthouseFlags = {};
    }

    // Flags needed to run Lighthouse, lets switch
    // to the new headless soon
    this.chromeFlags = [
      '--headless',
      '--no-sandbox',
      '--ignore-certificate-errors'
    ];

    this.usingBrowsertime = false;
    this.summaries = 0;
    this.urls = [];
    this.alias = {};

    this.storageManager = super.getStorageManager();

    // register which metric of all of those we want to
    // collect and send to time series storage
    // https://www.sitespeed.io/documentation/sitespeed.io/configure-metrics/
    const filterRegistry = super.getFilterRegistry();
    filterRegistry.registerFilterForType(
      DEFAULT_SUMMARY_METRICS,
      'lighthouse.pageSummary'
    );
  }
  async processMessage(message) {
    switch (message.type) {
      case 'browsertime.setup': {
        // We know we will use Browsertime so we wanna keep track of Browseertime summaries
        this.usingBrowsertime = true;
        super.log('Will run Lighthouse tests after Browsertime has finished');
        break;
      }

      // If we have an alias for an URL we browsertime will tell
      // us and we can use that alias for the URL
      case 'browsertime.alias': {
        this.alias[message.url] = message.data;
        break;
      }

      case 'browsertime.pageSummary': {
        // If all URLs been tested in Browsertime we can
        // move on with Lighthouse tests. Lighthouse uses
        // its own Chrome version so we do not want to run that at the
        // same time as we Browsertime since it will affeect our metrics
        if (this.usingBrowsertime) {
          this.summaries++;
          if (this.summaries === this.urls.length)
            for (let urlAndGroup of this.urls) {
              super.sendMessage('lighthouse.audit', urlAndGroup);
            }
        }
        break;
      }

      // sitespeed.io is in the setup phase
      case 'sitespeedio.setup': {
        // Let the HTML plugin know that we want to generate a
        // Lighthouse result page using our pug file
        super.sendMessage('html.pug', {
          id: 'lighthouse',
          name: 'Lighthouse',
          pug: this.pug,
          type: 'pageSummary'
        });

        // If you want to use Lighthouse inn your budget
        // we need to tell our budget plugin what kind of
        // summary messages it will use.
        super.sendMessage('budget.addMessageType', {
          type: 'lighthouse.pageSummary'
        });
        break;
      }

      // Sorry we cannot run Lighthouse when we do Browsertime scripting
      // since Lighthouse using its own Chrome version
      case 'browsertime.navigationScripts': {
        super.log(
          'Lighthouse can only be used on URLs and not with scripting/multiple pages at the moment'
        );
        break;
      }

      case 'url': {
        // If we run Browsertime, we used store the URLs we want to test
        // and run the tests when Browsertime is finisshed.
        if (this.usingBrowsertime) {
          this.urls.push({ url: message.url, group: message.group });
        } else {
          const url = message.url;
          const group = message.group;
          super.sendMessage('lighthouse.audit', {
            url,
            group
          });
        }
        break;
      }

      case 'lighthouse.audit': {
        const { url, group } = message.data;
        let result;
        super.log('Start collecting Lighthouse result for %s', 'info', url);
        super.log(
          'Lighthouse flags %:2j , config %:2j , Chrome flags %:2j',
          'debug',
          this.lighthouseFlags,
          this.lightHouseConfig,
          this.chromeFlags
        );
        try {
          result = await runLighthouse(
            url,
            this.lighthouseFlags,
            this.lightHouseConfig,
            this.chromeFlags,
            super.getLog()
          );
          super.log('Result from Lighthouse:%:2j', 'verbose', result.lhr);
          super.log('Report from Lighthouse:%:2j', 'verbose', result.report);
          await this.storageManager.writeDataForUrl(
            result.report,
            'lighthouse.html',
            url,
            undefined,
            this.alias[url]
          );
          super.sendMessage('lighthouse.report', result.report, {
            url,
            group
          });
          super.sendMessage('lighthouse.pageSummary', result.lhr, {
            url,
            group
          });
        } catch (error) {
          super.log(error, 'error');
          super.sendMessage(
            'error',
            'Lighthouse got the following errors: ' + JSON.stringify(error),
            {
              url
            }
          );
        }
        break;
      }
    }
  }
}
