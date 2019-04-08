# sitespeed.io plugin for Lighthouse
[![Build Status](https://travis-ci.org/sitespeedio/plugin-lighthouse.svg?branch=master)](https://travis-ci.org/sitespeedio/plugin-lighthouse)

Run Lighthouse as a plugin for sitespeed.io (inspired by [siteriaitaliana](https://github.com/siteriaitaliana/plugin-lighthouse)).

You can read more about sitespeed.io plugins [here](https://www.sitespeed.io/documentation/sitespeed.io/plugins/).

## Test with current master

If you have checked out as the same level as sitespeed.io you run it like this (else just change the path).

```bash
git clone https://github.com/sitespeedio/sitespeed.io.git
cd sitespeed.io
npm install
bin/sitespeed.js --plugins.add ../plugin-lighthouse/ https://www.sitespeed.io/ -n 1
```

## Run in production
If you want to run Lighthouse with your other sitespeed.io test, follow the instructions in the [add a plugin docs](https://www.sitespeed.io/documentation/sitespeed.io/plugins/#add-a-plugin).

The Lighthouse tests will run after Browsertime finished and run Chrome headless.

## Lighthouse reports
By default, it will generate `lighthouse` report json-files in `/pages/YOURPAGE/data`.

This examples will allow you to set the Lighthouse report type (output type):

`--lighthouse.extends lighthouse:default --lighthouse.settings.output html` for html-reports,
`--lighthouse.extends lighthouse:default --lighthouse.settings.output csv` for csv-reports.

## Data to Graphite/InfluxDB
The plugin will automatically send the performance, pwa, best practice, accessibility and SEO score to Graphite/InfluxDB. 

If you want to sent other Lighthouse metrics you should start by reading the [documentation about collecting metrics](https://www.sitespeed.io/documentation/sitespeed.io/metrics/).

You can do that by following [https://www.sitespeed.io/documentation/sitespeed.io/metrics/#list-metrics](https://www.sitespeed.io/documentation/sitespeed.io/metrics/#list-metrics) and you need to run Lighthouse at the same time, so sitespeed.io pick up those metrics.
I did a test run and run the plugin like this:
```--plugins.add ../plugin-lighthouse/ https://www.sitespeed.io/ -n 1 --metrics.list```
and then in the root data folder I open the *metrics.txt* file (that is large since Lighthouse generates a lot of metrics).

Search for **lighthouse.pageSummary.** there you will have all the metrics that are collected for one page. When I looked I wonder if **lighthouse.pageSummary.audits.first-cpu-idle.rawValue** and **lighthouse.pageSummary.audits.first-contentful-paint.rawValue** is the right ones (I'm not familiar with the Lighthouse data structure).

The look at the docs on how you can send them: [https://www.sitespeed.io/documentation/sitespeed.io/metrics/#add-a-metric](https://www.sitespeed.io/documentation/sitespeed.io/metrics/#add-a-metric).

## Configuration
You can pass config to Lighthouse using the `--lighthouse` CLI flag. Since this plugin using the Lighthouse node module and not the CLI, some options from the CLI API are not available. You can find a list of supported flags by checking out the [SharedFlagsSetting](https://github.com/GoogleChrome/lighthouse/blob/41bc409deddb44dd607d2606b7e57e1d239641a7/types/externs.d.ts) interface in the Lighthouse repository.

You can extend the Lighthouse presets by adding the `extends` property. By default, `lighthouse:default` is asssumed, so it can be omited. There are two options available:

[lighthouse:default](https://github.com/GoogleChrome/lighthouse/blob/master/lighthouse-core/config/default-config.js)\
[lighthouse:full](https://github.com/GoogleChrome/lighthouse/blob/master/lighthouse-core/config/full-config.js)

**Example:** To change the device type from 'mobile' to 'desktop' mode, you could use:\
`--lighthouse.extends lighthouse:default --lighthouse.settings.emulatedFormFactor desktop`

To add multiple settings, repeat `--lighthouse.settings.*`.

For more details, check out the [Lighthouse Configuration](https://github.com/GoogleChrome/lighthouse/blob/master/docs/configuration.md) page.

## Debug
If you need logging from Lighthouse you can turn on verbose logging by adding `--verbose` to sitespeed.io.

## sitespeed.io version
You need sitespeed.io 7.5 or later to run the plugin.
