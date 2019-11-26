'use strict';

const forEach = require('lodash.foreach');
const set = require('lodash.set');

class Aggregator {
  constructor(statsHelpers, log) {
    this.statsHelpers = statsHelpers;
    this.log = log;
    this.stats = {};
  }

  _pushStats(path, value) {
    if (!value) {
      this.log.info(`stat ${path} was empty, skipping`);
      return;
    }
    this.statsHelpers.pushStats(this.stats, path, value);
  }

  addToAggregate(result) {
    forEach(result.categories, category => {
      this._pushStats(['categories', category.id], category.score);
    });

    forEach(result.audits, audit => {
      switch (audit.scoreDisplayMode) {
        case 'numeric':
          this._pushStats(['audits', audit.id], audit.numericValue);
          break;
        case 'binary':
          this._pushStats(['audits', audit.id], audit.score);
          break;
        default:
          break;
      }
    });
  }

  summarize() {
    if (Object.keys(this.stats).length === 0) {
      return undefined;
    }
    return this.summarizePerObject(this.stats);
  }

  summarizePerObject(obj) {
    return Object.keys(obj).reduce((summary, name) => {
      const categoryData = {};
      forEach(obj[name], (stats, timingName) => {
        set(
          categoryData,
          timingName,
          this.statsHelpers.summarizeStats(stats, { decimals: 2 })
        );
      });
      summary[name] = categoryData;
      return summary;
    }, {});
  }
}

module.exports = Aggregator;
