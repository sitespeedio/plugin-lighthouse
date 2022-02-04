# CHANGELOG - sitespeed.io Lighthouse plugin 

## 9.3.1 - UNRELEASED
### Breaking changes
* In the new version we drop support for the following:
  * Running multiple runs with Lighthouse. 
  * Using scripts to login the user (or whatever you need before you run your tests)
It's a couple of reasons why I remove those features:
* I been looking for a maintainer of the Lighthouse plugin for +1 year and I don't have one. For me to be able to maintain it I want the plugin to be as simple as possible.
* I deeply regret merging the PR for adding multiple runs for Lighthouse. That PR goes against everthying I know about measuring performance. Lighthouse is not built for getting correct performance metrics, it's built to help (Chrome) developers to get insights how they make the page "faster". Lets stick to the basics and keep it possible to get those recommendations from Lighthouse.
* Someday Lighthouse will have support for user journeys/logging in etc, lets wait until that is officially supported and then I can check if it could bu used in the plugin.

With the new release we also break how you configure Lighthouse. People has had problem with that since day 1. With the new version we support two new ways to configure Lighthouse:
- By configuration JSON file. `--lighthouse.config config.js`
- By Lightouse flags file. `--lighthouse.flags flag.json`

If you don't need to configure Lightouse you can use the default settings both for dekstop and mobile. If you run without any settings, the plugin will use desktop settings. If you run with `--mobile`, `--android` or `--ios` the mobile settings will be used. 
### Added
* The plugin will now follow the release number of Lighthouse.
* Upgraded to Lightouse 9.3.1
* Added experimental install as bin support (documentation coming later on).