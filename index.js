'use strict';

const fs = require('fs');
const path = require('path');
const omit = require('object.omit');
const merge = require('lodash.merge');
const runAudit = require('./runAudit');

const DEFAULT_SUMMARY_METRICS = [
  'categories.seo.score',
  'categories.performance.score',
  'categories.pwa.score',
  'categories.accessibility.score',
  'categories.best-practices.score'
];

const defaultConfig = {
  settings: {
    output: 'html'
  }
};

module.exports = {
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

    this.lightHouseConfig =
      options.lighthouse && omit(options.lighthouse, 'preScript');

    this.lightHouseConfig = merge(defaultConfig, this.lightHouseConfig);

    this.lighthouseFlags = options.verbose > 0 ? { logLevel: 'verbose' } : {};

    this.lighthousePreScript =
      options.lighthouse && options.lighthouse.preScript;
    this.usingBrowsertime = false;
    this.summaries = 0;
    this.urls = [];

    this.storageManager = context.storageManager;

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

      case 'browsertime.pageSummary': {
        if (this.usingBrowsertime) {
          this.summaries++;
          if (this.summaries === this.urls.length) {
            for (let urlAndGroup of this.urls) {
              log.info(
                'Will collect Lighthouse metrics for %s',
                urlAndGroup.url
              );
              try {
                const result = await runAudit({
                  url: urlAndGroup.url,
                  lightHouseConfig: this.lightHouseConfig,
                  lighthouseFlags: this.lighthouseFlags,
                  lighthousePreScript: this.lighthousePreScript
                });
                log.info('Got Lighthouse metrics');
                log.verbose('Result from Lightouse:%:2j', result.lhr);
                queue.postMessage(
                  make('lighthouse.pageSummary', result.lhr, {
                    url: urlAndGroup.url,
                    group: urlAndGroup.group
                  })
                );
                log.verbose('Report from Lightouse:%:2j', result.report);
                queue.postMessage(
                  make('lighthouse.report', result.report, {
                    url: urlAndGroup.url,
                    group: urlAndGroup.group
                  })
                );
              } catch (e) {
                log.error(
                  'Lighthouse could not test %s please create an upstream issue: https://github.com/GoogleChrome/lighthouse/issues/new?template=Bug_report.md',
                  urlAndGroup.url,
                  e
                );
                queue.postMessage(
                  make(
                    'error',
                    'Lighthouse got the following errors: ' + JSON.stringify(e),
                    {
                      url: urlAndGroup.url
                    }
                  )
                );
              }
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
          log.info('Start collecting Lighthouse result for %s', url);
          try {
            const result = await runAudit({
              url,
              lightHouseConfig: this.lightHouseConfig,
              lighthouseFlags: this.lighthouseFlags,
              lighthousePreScript: this.lighthousePreScript
            });
            log.verbose('Result from Lightouse:%:2j', result.lhr);
            queue.postMessage(
              make('lighthouse.pageSummary', result.lhr, {
                url,
                group
              })
            );
            log.verbose('Report from Lightouse:%:2j', result.report);
            queue.postMessage(
              make('lighthouse.report', result.report, {
                url,
                group
              })
            );
          } catch (e) {
            log.error(
              'Lighthouse could not test %s please create an upstream issue: https://github.com/GoogleChrome/lighthouse/issues/new?template=Bug_report.md',
              url,
              e
            );
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
        }
        break;
      }
      case 'lighthouse.report': {
        return this.storageManager.writeDataForUrl(
          message.data,
          `lighthouse.${
            this.lightHouseConfig &&
            this.lightHouseConfig.settings &&
            this.lightHouseConfig.settings.output
              ? this.lightHouseConfig.settings.output
              : 'json'
          }`,
          message.url
        );
      }
    }
  }
};
