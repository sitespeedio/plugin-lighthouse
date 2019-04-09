module.exports = async function preScript(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1300, height: 700 });

  await page.goto('https://www.sitespeed.io/');
};
