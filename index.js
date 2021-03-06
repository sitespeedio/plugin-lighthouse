'use strict';

const fs = require('fs');
const path = require('path');
const omit = require('object.omit');
const merge = require('lodash.merge');
const runAudit = require('./runAudit');
const Aggregator = require('./aggregator');

const DEFAULT_SINGLE_RUN_SUMMARY_METRICS = [
  'categories.seo.score',
  'categories.performance.score',
  'categories.pwa.score',
  'categories.accessibility.score',
  'categories.best-practices.score'
];

const DEFAULT_MULTI_RUN_SUMMARY_METRICS = [
  'categories.seo.*',
  'categories.performance.*',
  'categories.pwa.*',
  'categories.accessibility.*',
  'categories.best-practices.*'
];

const defaultConfig = {
  settings: {
    output: 'html'
  },
  iterations: 1
};

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

    this.lightHouseConfig =
      options.lighthouse && omit(options.lighthouse, 'preScript');

    this.lightHouseConfig = merge(defaultConfig, this.lightHouseConfig);

    this.lighthouseFlags = options.verbose > 0 ? { logLevel: 'verbose' } : {};

    this.lighthousePreScript =
      options.lighthouse && options.lighthouse.preScript;
    this.usingBrowsertime = false;
    this.summaries = 0;
    this.urls = [];
    this.alias = {};

    this.storageManager = context.storageManager;
    this.filterRegistry = context.filterRegistry;
    if (this.lightHouseConfig.iterations === 1) {
      context.filterRegistry.registerFilterForType(
        DEFAULT_SINGLE_RUN_SUMMARY_METRICS,
        'lighthouse.pageSummary'
      );
    } else {
      context.filterRegistry.registerFilterForType(
        DEFAULT_MULTI_RUN_SUMMARY_METRICS,
        'lighthouse.pageSummary'
      );
    }
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
        this.aggregator = new Aggregator(this.statsHelpers, this.log);
        const { url, group } = message.data;
        let result;
        for (let i = 0; i < this.lightHouseConfig.iterations; i++) {
          log.info(
            'Start collecting Lighthouse result for %s iteration %d',
            url,
            i + 1
          );
          try {
            result = await runAudit({
              url,
              lightHouseConfig: this.lightHouseConfig,
              lighthouseFlags: this.lighthouseFlags,
              lighthousePreScript: this.lighthousePreScript
            });
            log.verbose('Result from Lighthouse:%:2j', result.lhr);
            this.aggregator.addToAggregate(result.lhr);
            log.verbose('Report from Lighthouse:%:2j', result.report);
            queue.postMessage(
              make('lighthouse.report', result.report, {
                url,
                group,
                iteration: i + 1
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
        if (this.lightHouseConfig.iterations > 1) {
          const summary = this.filterRegistry.filterMessage({
            type: 'lighthouse.pageSummary',
            data: this.aggregator.summarize()
          }).data;
          queue.postMessage(
            make(
              'lighthouse.pageSummary',
              merge(summary, {
                iterations: this.lightHouseConfig.iterations
              }),
              { url, group }
            )
          );
        } else {
          queue.postMessage(
            make(
              'lighthouse.pageSummary',
              merge(result.lhr, { iterations: 1 }),
              { url, group }
            )
          );
        }
        break;
      }
      case 'lighthouse.report': {
        return this.storageManager.writeDataForUrl(
          message.data,
          `lighthouse.${message.iteration}.${
            this.lightHouseConfig &&
            this.lightHouseConfig.settings &&
            this.lightHouseConfig.settings.output
              ? this.lightHouseConfig.settings.output
              : 'json'
          }`,
          message.url,
          undefined,
          this.alias[message.url]
        );
      }
    }
  }
};
