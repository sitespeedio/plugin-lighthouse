# sitespeed.io plugin for Lighthouse
[![Run Lighthouse plugin on Linux](https://github.com/sitespeedio/plugin-lighthouse/actions/workflows/linux.yml/badge.svg)](https://github.com/sitespeedio/plugin-lighthouse/actions/workflows/linux.yml)

Run Lighthouse as a plugin for sitespeed.io (inspired by [siteriaitaliana](https://github.com/siteriaitaliana/plugin-lighthouse)).

You can read more about sitespeed.io plugins [here](https://www.sitespeed.io/documentation/sitespeed.io/plugins/).

## Test with current main

If you have checked out as the same level as sitespeed.io you run it like this (else just change the path).

```bash
git clone https://github.com/sitespeedio/sitespeed.io.git
cd sitespeed.io
npm install
bin/sitespeed.js --plugins.add ../plugin-lighthouse/index.js https://www.sitespeed.io/ -n 1
```
## Run in production
If you want to run Lighthouse with your other sitespeed.io test, follow the instructions in the [add a plugin docs](https://www.sitespeed.io/documentation/sitespeed.io/plugins/#add-a-plugin) or use the sitespeed.io +1 container. Read the [documentation](https://www.sitespeed.io/documentation/sitespeed.io/lighthouse/).

If you use NodeJs the simplest way is to install the plugin globally:
```npm install @sitespeed.io/plugin-lighthouse -g```

And then run sitespeed.io adding the pluging using the package name:
```sitespeed.io --plugins.add @sitespeed.io/plugin-lighthouse https://www.sitespeed.io```

The Lighthouse tests will run after Browsertime finished and run Chrome headless.

## Lighthouse reports
By default, it will generate `lighthouse` HTML-report in `/pages/YOURPAGE/data` that is iframed into the sitespeed.io result

## Data to Graphite/InfluxDB
The plugin will automatically send the performance, pwa, best practice, accessibility, SEO score and Google Web Vitals to Graphite/InfluxDB. 

If you want to sent other Lighthouse metrics you should start by reading the [documentation about collecting metrics](https://www.sitespeed.io/documentation/sitespeed.io/metrics/).

## Configuration
By default the plugin run the tests with desktop settings (*lighthouse/core/config/lr-desktop-config*). If you run sitespeed.io with `--mobile`, `--android` or `--ios` the plugin will run the tests with mobile settings (*lighthouse/core/config/lr-mobile-config*).

If you want you can run the tests with your own configuration. You will do that by adding your own JavaScript configuration file ```--lighthouse.config config.js```.

And a configuration file like this:

```JavaScript
export default config = {
  extends: 'lighthouse:default',
  settings: {
    onlyAudits: ['first-meaningful-paint', 'speed-index', 'interactive']
  }
};
```

You can also add Lighthouse flags by a JSON file ```--lighthouse.flags flag.json```. If you pass on command like flags that contains hyphens, they are removed and converted internally in Lighthouse, so for example to get the command line flag `--extra-headers` to work, the JSON should be like this:

```JSON
{
    "extraHeaders": { "key": "value"} 
}
```


Read all about configuring Lighthouse at [https://github.com/GoogleChrome/lighthouse/blob/master/docs/configuration.md](https://github.com/GoogleChrome/lighthouse/blob/master/docs/configuration.md).

