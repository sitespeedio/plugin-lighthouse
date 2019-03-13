'use strict';

const fs = require('fs');
const path = require('path');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

const DEFAULT_SUMMARY_METRICS = [
  'categories.seo.score',
  'categories.performance.score',
  'categories.pwa.score',
  'categories.accessibility.score',
  'categories.best-practices.score'
];

const defaultChromeSettings = {
  chromeFlags: [
    '--no-sandbox',
    '--headless',
    '--disable-gpu',
    '--ignore-certificate-errors'
  ]
};

async function launchChromeAndRunLighthouse(url, config, flags) {
  return chromeLauncher
    .launch({ chromeFlags: defaultChromeSettings.chromeFlags })
    .then(chrome => {
      if (config && !config.extends) {
        config.extends = 'lighthouse:default';
      }
      return lighthouse(url, { 
        port: chrome.port, 
        ...flags
      }, config).then(results => {
        return chrome.kill().then(() => results.lhr);
      });
    });
}

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

    this.lightHouseOptions = options.lighthouse;

    this.lighthouseFlags = {
      ...!!options.debug ? { logLevel: 'verbose' } : {}
    }
 
    this.usingBrowsertime = false;
    this.summaries = 0;
    this.urls = [];

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
                const result = await launchChromeAndRunLighthouse(
                  urlAndGroup.url,
                  this.lightHouseOptions,
                  this.lighthouseFlags
                );
                log.info('Got Lighthouse metrics');
                log.verbose('Result from Lightouse:%:2j', result);
                queue.postMessage(
                  make('lighthouse.pageSummary', result, {
                    url: urlAndGroup.url,
                    group: urlAndGroup.group
                  })
                );
              } catch (e) {
                log.error(
                  'Lighthouse could not test %s please create an upstream issue: https://github.com/GoogleChrome/lighthouse/issues/new?template=Bug_report.md',
                  urlAndGroup.url
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
            const result = await launchChromeAndRunLighthouse(
              url,
              this.lightHouseOptions,
              this.lighthouseFlags
            );
            log.info('Got Lighthouse metrics');
            log.verbose('Result from Lightouse:%:2j', result);
            queue.postMessage(
              make('lighthouse.pageSummary', result, {
                url,
                group
              })
            );
          } catch (e) {
            log.error(
              'Lighthouse could not test %s please create an upstream issue: https://github.com/GoogleChrome/lighthouse/issues/new?template=Bug_report.md',
              url
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
      }
    }
  }
};
