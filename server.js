const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

app.get('/', (req, res) => res.status(200).send('OK'));
app.get('/healthz', (req, res) => res.status(200).send('OK'));

app.get('/scrape', async (req, res) => {
  try {
    const { query, maxResults } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'query parametresi zorunludur' });
    }

    const limit = Math.min(parseInt(maxResults || '20', 10), 50);

    const browser = await puppeteer.launch({ 
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'] 
});

    const page = await browser.newPage();
    const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;

    await page.goto(url, { waitUntil: 'networkidle2' });
    await page.waitForSelector('div[role="article"]', { timeout: 30000 });

    const businesses = await page.evaluate(() => {
      const results = [];
      const items = document.querySelectorAll('div[role="article"]');

      items.forEach(item => {
        const nameEl = item.querySelector('div.fontHeadlineSmall');
        const phoneButton = item.querySelector('button[data-item-id*="phone"]');

        results.push({
          name: nameEl ? nameEl.innerText : 'N/A',
          phone: phoneButton ? phoneButton.getAttribute('aria-label') : 'N/A'
        });
      });

      return results;
    });

    await browser.close();
    return res.json(businesses.slice(0, limit));
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Listening on ${PORT}`));
