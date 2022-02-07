'use strict';

const fs = require('fs');
const path = require('path');
const runLighthouse = require('./runLighthouse');
const desktopConfiguration = require('lighthouse/lighthouse-core/config/lr-desktop-config');
const mobileConfiguration = require('lighthouse/lighthouse-core/config/lr-mobile-config');

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

module.exports = {
  concurrency: 1,
  name() {
    return 'lighthouse';
  },
  open(context, options) {
    this.make = context.messageMaker('lighthouse').make;
    this.log = context.intel.getLogger('sitespeedio.plugin.lighthouse');
    this.pug = fs.readFileSync(
      path.resolve(__dirname, 'lighthouse.pug'),
      'utf8'
    );
    this.statsHelpers = context.statsHelpers;

    if (options.lighthouse && options.lighthouse.config) {
      this.log.info(
        'Will use Lighthouse configuration file: %s',
        path.resolve(options.lighthouse.config)
      );
      this.lightHouseConfig = require(path.resolve(options.lighthouse.config));
    } else {
      if (options.mobile || options.android || options.ios) {
        this.lightHouseConfig = mobileConfiguration;
        this.log.info('Using default Lighthouse configuration for mobile');
      } else {
        this.log.info('Using default Lighthouse configuration for desktop');
        this.lightHouseConfig = desktopConfiguration;
      }
    }

    if (options.lighthouse && options.lighthouse.flags) {
      this.log.info(
        'Will use Lighthouse flags file: %s',
        path.resolve(options.lighthouse.flags)
      );
      this.lighthouseFlags = JSON.parse(
        fs.readFileSync(path.resolve(options.lighthouse.flags), 'utf8')
      );
    } else {
      this.lighthouseFlags = {};
    }

    this.chromeFlags = ['--headless'];

    this.usingBrowsertime = false;
    this.summaries = 0;
    this.urls = [];
    this.alias = {};

    this.storageManager = context.storageManager;
    this.filterRegistry = context.filterRegistry;
    context.filterRegistry.registerFilterForType(
      DEFAULT_SUMMARY_METRICS,
      'lighthouse.pageSummary'
    );
  },
  async processMessage(message, queue) {
    const make = this.make;
    const log = this.log;

    switch (message.type) {
      case 'browsertime.setup': {
        // We know we will use Browsertime so we wanna keep track of Browseertime summaries
        this.usingBrowsertime = true;
        log.info('Will run Lighthouse tests after Browsertime has finished');
        break;
      }
      case 'browsertime.alias': {
        this.alias[message.url] = message.data;
        break;
      }

      case 'browsertime.pageSummary': {
        if (this.usingBrowsertime) {
          this.summaries++;
          if (this.summaries === this.urls.length) {
            for (let urlAndGroup of this.urls) {
              queue.postMessage(make('lighthouse.audit', urlAndGroup));
            }
          }
        }
        break;
      }

      case 'sitespeedio.setup': {
        queue.postMessage(
          make('html.pug', {
            id: 'lighthouse',
            name: 'Lighthouse',
            pug: this.pug,
            type: 'pageSummary'
          })
        );

        queue.postMessage(
          make('budget.addMessageType', {
            type: 'lighthouse.pageSummary'
          })
        );
        break;
      }

      case 'browsertime.navigationScripts': {
        log.info(
          'Lighthouse can only be used on URLs and not with scripting/multiple pages at the moment'
        );
        break;
      }

      case 'url': {
        if (this.usingBrowsertime) {
          this.urls.push({ url: message.url, group: message.group });
        } else {
          const url = message.url;
          const group = message.group;
          queue.postMessage(
            make('lighthouse.audit', {
              url,
              group
            })
          );
        }
        break;
      }

      case 'lighthouse.audit': {
        const { url, group } = message.data;
        let result;
        log.info('Start collecting Lighthouse result for %s', url);
        log.debug(
          'Lighthouse flags %:2j , config %:2j , Chrome flags %:2j',
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
            log
          );
          log.verbose('Result from Lighthouse:%:2j', result.lhr);
          log.verbose('Report from Lighthouse:%:2j', result.report);
          await this.storageManager.writeDataForUrl(
            result.report,
            'lighthouse.html',
            url,
            undefined,
            this.alias[url]
          );
          queue.postMessage(
            make('lighthouse.report', result.report, {
              url,
              group
            })
          );
          queue.postMessage(
            make('lighthouse.pageSummary', result.lhr, {
              url,
              group
            })
          );
        } catch (e) {
          queue.postMessage(
            make(
              'error',
              'Lighthouse got the following errors: ' + JSON.stringify(e),
              {
                url
              }
            )
          );
        }
        break;
      }
    }
  }
};
