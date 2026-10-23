const MEALS = ["Breakfast", "Brunch", "Lunch", "Dinner"];
const $ = s => document.querySelector(s);
const toMin = t => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const fmt = t => { let [h, m] = t.split(":").map(Number); const ap = h < 12 ? "a" : "p"; h = h % 12 || 12; return h + (m ? ":" + String(m).padStart(2, "0") : "") + ap; };
const laNow = () => new Date(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

let menus, hours, meal;

function hallHours(key, now) {
  const h = hours.halls[key]; if (!h) return null;
  return h[now.getDay() % 6 === 0 ? "weekend" : "weekday"];
}

// Meal "now": in a meal window, else the next upcoming one, else the last of the day.
function pickMeal(now) {
  const mins = now.getHours() * 60 + now.getMinutes();
  const avail = MEALS.filter(m => Object.values(menus.halls).some(h => h.meals[m]));
  if (!avail.length) return "Dinner";
  const span = {};
  for (const key in hours.halls) {
    const sched = hallHours(key, now); if (!sched) continue;
    for (const m in sched) { const [a, b] = sched[m].map(toMin); const s = span[m] ||= [a, b]; s[0] = Math.min(s[0], a); s[1] = Math.max(s[1], b); }
  }
  const order = avail.filter(m => span[m]).sort((x, y) => span[x][0] - span[y][0]);
  return order.find(m => mins < span[m][1] + 15) || order.at(-1) || avail[0];
}

function render() {
  const now = laNow(), mins = now.getHours() * 60 + now.getMinutes();
  const q = $("#q").value.toLowerCase().trim(), fV = $("#fV").checked, fVGN = $("#fVGN").checked, fGF = $("#fGF").checked;
  const out = [];
  for (const [key, hall] of Object.entries(menus.halls)) {
    const info = hours.halls[key] || {};
    const items = hall.meals[meal];
    const win = hallHours(key, now)?.[meal];
    const hrs = win ? `${fmt(win[0])}–${fmt(win[1])}` : "";
    if (!items) { out.push(`<details class="closed"><summary>${esc(info.name || key)}<small>no ${meal.toLowerCase()} menu</small></summary></details>`); continue; }
    const list = items.filter(i => (!fVGN || i.vgn) && (!fV || i.v) && (!fGF || i.gf) && (!q || (i.name + i.ingredients).toLowerCase().includes(q)));
    const open = win && mins >= toMin(win[0]) && mins <= toMin(win[1]);
    const lis = list.map(i => `<li><span class="n">${esc(i.name)}</span>${i.vgn ? '<span class="tag vgn">vegan</span>' : i.v ? '<span class="tag v">veg</span>' : ""}${i.gf ? '<span class="tag gf">GF</span>' : ""}${i.allergens ? `<div class="m">Contains: ${esc(i.allergens)}</div>` : ""}</li>`).join("");
    out.push(`<details open><summary>${esc(info.name || key)}<small>${open ? "open now · " : ""}${hrs}${hrs ? " · " : ""}${list.length} items</small></summary><ul>${lis || '<li class="m">No matching dishes</li>'}</ul></details>`);
  }
  $("#halls").innerHTML = out.join("");
}

function renderMeals(now) {
  const avail = MEALS.filter(m => Object.values(menus.halls).some(h => h.meals[m]));
  $("#meals").innerHTML = avail.map(m => `<button role="tab" aria-selected="${m === meal}" data-m="${m}">${m}${m === pickMeal(now) ? '<span class="now">• now</span>' : ""}</button>`).join("");
}

async function init() {
  [menus, hours] = await Promise.all(["menus.json", "hours.json"].map(f => fetch(f, { cache: "no-cache" }).then(r => r.json())));
  const now = laNow();
  $("#when").textContent = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const gen = new Date(menus.generated_at);
  $("#stamp").textContent = "Updated " + gen.toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" }) + (menus.date !== now.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }) ? " — ⚠ menu data is for " + menus.date : "");
  meal = pickMeal(now);
  renderMeals(now); render();
  $("#meals").onclick = e => { const b = e.target.closest("button"); if (b) { meal = b.dataset.m; renderMeals(now); render(); } };
  ["q", "fV", "fVGN", "fGF"].forEach(id => $("#" + id).addEventListener("input", render));
}
init().catch(e => { $("#halls").textContent = "Couldn't load menus: " + e; });
