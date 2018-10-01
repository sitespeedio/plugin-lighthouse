# sitespeed.io plugin for Lighthouse
[![Build Status](https://travis-ci.org/sitespeedio/plugin-lighthouse.svg?branch=master)](https://travis-ci.org/sitespeedio/plugin-lighthouse)

Run Lighthouse as a plugin for sitespeed.io

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

## sitespeed.io version
You need sitespeed.io 7.5 or later to run the plugin.