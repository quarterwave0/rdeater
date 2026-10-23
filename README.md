# Stanford Dining Today
Static page (`site/`) showing every residential dining hall's menu for today's current meal.
`scraper/fetch_menus.py` fills `site/menus.json` (~30 spaced requests/run, 3 runs/day via GitHub Actions).
Hours live in `site/hours.json` (from R&DE's "dining locations hours" page; update each quarter).
Note: rdeapps.stanford.edu/robots.txt disallows crawlers. Keep volume low, and consider asking R&DE for permission or an official feed.
Local: `pip install -r scraper/requirements.txt && python scraper/fetch_menus.py && python -m http.server -d site`
