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
  chromeFlags: ['--no-sandbox', '--headless', '--disable-gpu']
};

function launchChromeAndRunLighthouse(url, opts) {
  return chromeLauncher
    .launch({ chromeFlags: defaultChromeSettings.chromeFlags })
    .then(chrome => {
      opts.port = chrome.port;
      return lighthouse(url, opts).then(results => {
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

    this.lightHouseOptions = options.lighthouse || {};

    context.filterRegistry.registerFilterForType(
      DEFAULT_SUMMARY_METRICS,
      'lighthouse.pageSummary'
    );
  },
  processMessage(message, queue) {
    const make = this.make;
    const log = this.log;

    switch (message.type) {
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

      case 'url': {
        const url = message.url;
        const group = message.group;
        log.info('Start collecting Lighthouse result');

        // Usage:
        return launchChromeAndRunLighthouse(url, this.lightHouseOptions).then(
          result => {
            log.info('Got Lighthouse metrics');
            queue.postMessage(
              make('lighthouse.pageSummary', result, {
                url,
                group
              })
            );
          }
        );
      }
    }
  }
};
