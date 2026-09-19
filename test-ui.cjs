const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    for (const width of [360, 390, 768, 1280]) {
      const page = await browser.newPage({viewport:{width,height:1000}});
      const errors=[];
      page.on('pageerror', e=>errors.push(e.message));
      await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
      const card=page.locator('.food-card').first();
      await card.locator('.moisture').fill('10');
      await card.locator('.energy').fill('400');
      await card.locator('[data-nutrient="粗たんぱく質"]').fill('25');
      assert.match(await card.locator('.result-cards').innerText(), /62.5 g/);
      assert.match(await card.locator('.result-cards').innerText(), /52.1 g/);
      await card.locator('.standard-select').selectOption('fediaf110');
      assert.match(await card.locator('.standard-result').innerText(), /45 g/);
      assert.equal(await card.locator('option[value="aafco"]').isDisabled(),true);
      await card.locator('.standard-select').selectOption('none');
      assert.equal(await card.locator('.standard-result').count(),0);
      await card.locator('.standard-select').selectOption('fediaf95');
      await card.locator('.optional-select').selectOption('リン');
      await card.locator('[data-nutrient="リン"]').fill('0.8');
      assert.match(await card.locator('.result-cards').innerText(), /1.16 g/);
      await page.locator('#add-food').click();
      const second=page.locator('.food-card').nth(1);
      await second.locator('.moisture').fill('10');
      await second.locator('.energy-unit[value="kg"]').check();
      await second.locator('.energy').fill('4000');
      await second.locator('[data-nutrient="粗たんぱく質"]').fill('25');
      assert.match(await second.locator('.result-cards').innerText(), /62.5 g/);
      assert.equal(await second.locator('.energy-unit:checked').count(),1);
      assert.equal(await card.locator('.energy-unit:checked').inputValue(),'100g');
      await page.locator('#compare-foods').click();
      assert.match(await page.locator('#comparison-table').innerText(), /62.5 g/);
      for (const value of ['0','-1','']) {
        await second.locator('.energy').fill(value);
        assert.equal(await second.locator('.result-card').count(),0);
      }
      await second.locator('.energy').fill('4000');
      await second.locator('.moisture').fill('100');
      assert.equal(await second.locator('.result-card').count(),0);
      await second.locator('.moisture').fill('10');
      await second.locator('[data-nutrient="粗たんぱく質"]').fill('101');
      assert.equal(await second.locator('.result-card').count(),0);
      await second.locator('[data-nutrient="粗たんぱく質"]').fill('0');
      assert.match(await second.locator('.result-cards').innerText(), /0 mg/);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
      assert.equal(await card.locator('.moisture').evaluate(el=>getComputedStyle(el).fontSize),'19px');
      assert.deepEqual(errors,[]);
      await card.locator('.results').screenshot({path:`/tmp/dogeat-results-${width}.png`});
      console.log(`PASS ${width}px: standards, conversions, per-food units, invalid inputs, comparison, no overflow`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
