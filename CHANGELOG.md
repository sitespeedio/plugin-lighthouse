# CHANGELOG - sitespeed.io Lighthouse plugin 


## 11.3.2 - 2023-11-05
### Fixed
* Downgrade puppeteer, thank you [bairov pavel](https://github.com/Amerousful) for PR [#123](https://github.com/sitespeedio/plugin-lighthouse/pull/123)

## 11.3.1 - 2023-11-03
### Fixed
* Added dev-shim fix.

## 11.3.0 - 2023-11-03
### Added
* Updated to Lighthoue 11.3.0

## 11.2.0 - 2023-10-15
### Added 
* Updated to Lighthouse 11.2.0

## 11.1.0 - 2023-09-27
### Added 
* Updated to Lighthouse 11.1.0

## 10.1.0 - 2023-04-05
### Added 
* Updated to Lighthouse 10.1.0
* Use the new Chrome headless flag when running Lighthouse.
## 10.0.2 - 2023-04-04
### Added
* Updated to Lighthouse 10.0.2

### Changed 
* The plughin work with sitespeed.io version > 27
## 9.5.0 - 2022-03-31
### Added
* Updated to Lighthouse 9.5.0.

## 9.4.0 - 2022-03-05
### Added
* Updated to Lighthouse 9.4.0 and chrome-launcher 0.15.0.
### Fixed
* Catch and log if Chrome cannot start [#97](https://github.com/sitespeedio/plugin-lighthouse/pull/97).
* More generous Chrome flags by default to make Chrome work in Docker [#98](https://github.com/sitespeedio/plugin-lighthouse/pull/98).
## 9.3.1 - 2022-02-07
### Breaking changes
* In the new version we drop support for the following:
  * Running multiple runs with Lighthouse. 
  * Using scripts to login the user (or whatever you need before you run your tests)
It's a couple of reasons why I remove those features:
* I been looking for a maintainer of the Lighthouse plugin for +1 year and I haven't found one. For me to be able to maintain it I want the plugin to be as simple as possible.
* I deeply regret merging the PR for adding multiple runs for Lighthouse. That PR goes against everything I know about measuring performance. Lighthouse is not built for getting correct performance metrics, it's built to help (Chrome) developers to get insights how they make the page "faster". Lets stick to the basics and keep it possible to get those recommendations from Lighthouse.
* Maybe someday Lighthouse will have support for user journeys, lets wait until that is officially supported and then I can check if it could be used in the plugin.

With the new release we also break how you configure Lighthouse. People has had problem with that since day 1. With the new version we support two new ways to configure Lighthouse:
- By configuration JSON file. `--lighthouse.config config.js`
- By Lightouse flags file. `--lighthouse.flags flag.json`

If you don't need to configure Lightouse you can use the default settings both for desktop and mobile. If you run without any settings, the plugin will use desktop settings. If you run with `--mobile`, `--android` or `--ios` the mobile settings will be used. 
### Added
* The plugin will now follow the release number of Lighthouse.
* Upgraded to Lightouse 9.3.1
* Added experimental install as bin support (documentation coming later on).
* Introducing the changelog.