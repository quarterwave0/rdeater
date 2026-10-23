"""Fetch today's menus for every Stanford dining hall into site/menus.json.

Deliberately gentle: one GET, then one postback per hall/meal (chained from the
previous response like a person changing dropdowns), spaced by a few seconds.
Stops on any HTTP error. Meals tried come from site/hours.json.
"""
import json, sys, time, pathlib
from datetime import datetime
from zoneinfo import ZoneInfo
import requests
from bs4 import BeautifulSoup

URL = "https://rdeapps.stanford.edu/dininghallmenu/"
UA = "personal-dining-menu-aggregator/1.0 (hobby project; low volume, ~30 requests/run)"
DELAY = 4
ROOT = pathlib.Path(__file__).resolve().parent.parent
ALL_MEALS = ["Breakfast", "Lunch", "Dinner", "Brunch"]


def hidden(soup):
    return {i["name"]: i.get("value", "") for i in soup.select("input[type=hidden]") if i.get("name")}


def parse_menu(html):
    """Return list of menu items from a result page (empty if none)."""
    soup = BeautifulSoup(html, "html.parser")
    items = []
    for li in soup.select("li.clsMenuItem"):
        cls = li.get("class", [])
        txt = lambda sel: (li.select_one(sel).get_text(" ", strip=True) if li.select_one(sel) else "")
        strip = lambda s, p: s[len(p):].strip() if s.startswith(p) else s
        name = txt("h3.clsLabel_Name")
        if not name:
            continue
        items.append({
            "name": name,
            "description": txt(".clsLabel_Description"),
            "ingredients": strip(txt(".clsLabel_Ingredients"), "Ingredients:"),
            "allergens": strip(txt(".clsLabel_Allergens"), "Allergens:"),
            "trace": strip(txt(".clsLabel_TraceAllergens"), "Made on shared equipment with"),
            "mindful": txt(".clsMindful"),
            "gf": "clsGF_Row" in cls,
            "v": "clsV_Row" in cls or "clsVGN_Row" in cls,
            "vgn": "clsVGN_Row" in cls,
        })
    return items


def main():
    now = datetime.now(ZoneInfo("America/Los_Angeles"))
    day = now.strftime("%m/%d/%Y")
    weekend = now.weekday() >= 5
    hours = json.loads((ROOT / "site/hours.json").read_text())["halls"]
    s = requests.Session()
    s.headers["User-Agent"] = UA
    r = s.get(URL, timeout=30); r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    halls = [o["value"] for o in soup.select("#MainContent_lstLocations option") if o.get("value")]
    days = [o["value"] for o in soup.select("#MainContent_lstDay option")]
    if day not in days:
        sys.exit(f"{day} not offered by site ({days}); leaving menus.json untouched")
    out = {"generated_at": now.isoformat(timespec="seconds"), "date": day, "halls": {}}
    for hall in halls:
        h = hours.get(hall, {})
        sched = h.get("weekend" if weekend else "weekday")
        meals = list(sched) if sched else (["Brunch", "Dinner"] if weekend else ["Lunch", "Dinner"])
        out["halls"][hall] = {"meals": {}}
        for meal in meals:
            time.sleep(DELAY)
            data = {**hidden(soup), "__EVENTTARGET": "GetMenulstMealType", "__EVENTARGUMENT": "",
                    "ctl00$MainContent$lstLocations": hall, "ctl00$MainContent$lstDay": day,
                    "ctl00$MainContent$lstMealType": meal}
            r = s.post(URL, data=data, timeout=30)
            r.raise_for_status()
            soup = BeautifulSoup(r.text, "html.parser")
            items = parse_menu(r.text)
            print(hall, meal, len(items), "items")
            if items:
                out["halls"][hall]["meals"][meal] = items
    (ROOT / "site/menus.json").write_text(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()
