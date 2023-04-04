export default {
  extends: 'lighthouse:default',
  settings: {
    onlyAudits: ['first-meaningful-paint', 'speed-index', 'interactive']
  }
};
