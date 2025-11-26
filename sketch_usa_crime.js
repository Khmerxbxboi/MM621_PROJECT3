// sketch_crime_maps.js
// Sodaro US ➜ California ➜ Alameda drilldown
// A_001.png = USA map (no CSV)
// A_002.png = California neon map (paired with California_2024.csv + Alemeda_2024.csv)

const VIEW_US  = "us";
const VIEW_CA  = "ca";
let currentView = VIEW_US;

let usaImg, caImg;

// CSV + parsed stats
let tableCA, tableAlameda;
let statsCA = null;        // from California_2024.csv
let statsAlameda = null;   // from Alemeda_2024.csv

// approximate clickable box over California on USA map
let caHit = { x: 0, y: 0, w: 0, h: 0 };

// GNews API
const GNEWS_KEY = "09dd0671e0a943a29eeb56a1cd9fefd2";
let lastNewsView = null;

// ------------- preload -------------
function preload() {
  // IMPORTANT: filenames must match these exactly
  usaImg = loadImage("A_001.png");  // USA PNG
  caImg  = loadImage("A_002.png");  // California neon PNG

  // California + Alameda offense CSVs
  tableCA      = loadTable("California_2024.csv", "csv", "header");
  tableAlameda = loadTable("Alemeda_2024.csv", "csv", "header");
}

// ------------- setup -------------
function setup() {
  const holder = document.getElementById("map-holder");
  const w = holder.clientWidth  || window.innerWidth * 0.65;
  const h = holder.clientHeight || window.innerHeight * 0.7;

  const c = createCanvas(w, h);
  c.parent("map-holder");

  textFont("system-ui, -apple-system, Segoe UI, sans-serif");

  computeCaHitbox();
  parseAllStats();
  updateDashboardFor(VIEW_US);   // USA view uses CA CSV in the side panel
  fetchNewsFor(VIEW_US);
}

function windowResized() {
  const holder = document.getElementById("map-holder");
  const w = holder.clientWidth  || window.innerWidth * 0.65;
  const h = holder.clientHeight || window.innerHeight * 0.7;

  resizeCanvas(w, h);
  computeCaHitbox();
}

// ------------- gradient background -------------
function sodaroGradientBG() {
  noFill();
  for (let y = 0; y < height; y++) {
    const t = y / height;
    const c = lerpColor(
      color(2, 6, 23),   // deep navy
      color(15, 23, 42), // slate
      t
    );
    stroke(c);
    line(0, y, width, y);
  }
}

// ------------- hitbox for California on USA map -------------
function computeCaHitbox() {
  const margin = width * 0.04;
  const mapW = width - margin * 2;
  const mapH = height - margin * 2;

  // Rough region of California on A_001.png
  // tweak 0.06 / 0.42 / 0.14 / 0.34 if the box is slightly off
  caHit.x = margin + mapW * 0.06;
  caHit.y = margin + mapH * 0.42;
  caHit.w = mapW * 0.14;
  caHit.h = mapH * 0.34;
}

// ------------- CSV parsing -------------
function parseAllStats() {
  if (tableCA)      statsCA      = parseStatsFromTable(tableCA, "California 2024");
  if (tableAlameda) statsAlameda = parseStatsFromTable(tableAlameda, "Alameda County 2024");
}

// CSV assumed like:
// Offense, Value
// "Homicide", 123
// "Robbery",  456
function parseStatsFromTable(tbl, label) {
  const stats = { label, rows: [], total: 0 };

  for (let r = 0; r < tbl.getRowCount(); r++) {
    const name = (tbl.getString(r, 0) || "").trim();
    const raw  = (tbl.getString(r, 1) || "").trim();
    if (!name) continue;

    let value = parseFloat(raw.replace(/,/g, ""));
    if (isNaN(value)) value = 0;

    stats.rows.push({ name, value });
    stats.total += value;
  }
  return stats;
}

// ------------- draw loop -------------
function draw() {
  background(3, 6, 20);

  if (currentView === VIEW_US)  drawUSA();
  if (currentView === VIEW_CA)  drawCalifornia();
}

// ------------- USA view -------------
function drawUSA() {
  // 1) Dark gradient background
  sodaroGradientBG();

  // 2) USA map centered with margin, tinted Sodaro blue
  if (usaImg) {
    push();
    const margin = width * 0.04;
    const mapW = width - margin * 2;
    const mapH = height - margin * 2;
    tint(37, 99, 235, 240);   // Sodaro blue tint
    image(usaImg, margin, margin, mapW, mapH);
    pop();
  } else {
    fill(37, 99, 235);
    rect(0, 0, width, height);
  }

  // 3) Dark glass overlay
  noStroke();
  fill(15, 23, 42, 120);
  rect(0, 0, width, height);

  // 4) California highlight (glow)
  const hovering = pointInRect(mouseX, mouseY, caHit);

  // outer glow
  noFill();
  stroke(56, 189, 248, hovering ? 210 : 150);
  strokeWeight(5);
  rect(caHit.x - 6, caHit.y - 6, caHit.w + 12, caHit.h + 12, 18);

  // inner box
  noStroke();
  fill(8, 47, 73, hovering ? 190 : 130);
  rect(caHit.x, caHit.y, caHit.w, caHit.h, 14);

  // tag label
  const tagX = caHit.x + caHit.w + 14;
  const tagY = caHit.y + caHit.h * 0.35;

  fill(15, 23, 42, 230);
  rect(tagX, tagY - 18, 110, 28, 999);

  noStroke();
  fill(226, 232, 240);
  textAlign(LEFT, CENTER);
  textSize(13);
  text("California", tagX + 10, tagY - 3);

  // bottom-right hint chip
  const chipW = 230;
  const chipH = 26;
  const chipX = width - chipW - 18;
  const chipY = height - chipH - 18;

  fill(15, 23, 42, 220);
  rect(chipX, chipY, chipW, chipH, 999);

  noStroke();
  fill(148, 163, 184);
  textAlign(CENTER, CENTER);
  textSize(11);
  text("Hover California • Click to drill into Alameda", chipX + chipW / 2, chipY + chipH / 2);

  // 5) On hover, show CA bar-card overlay on the right
  if (hovering && statsCA) {
    drawBarCard(
      statsCA,
      "California 2024 (hover)",
      width * 0.55,
      height * 0.10,
      width * 0.38,
      height * 0.55
    );
  }
}

// ------------- California view -------------
function drawCalifornia() {
  const pad = width * 0.06;

  // Card background behind neon California image
  noStroke();
  fill(10, 18, 40);
  rect(pad, pad, width - pad * 2, height - pad * 2, 24);

  // Glow border
  noFill();
  stroke(6, 182, 255, 200);
  strokeWeight(2);
  rect(pad + 1, pad + 1, width - pad * 2 - 2, height - pad * 2 - 2, 24);

  // Neon California PNG on the left
  if (caImg) {
    const innerPad = pad + 18;
    const innerW = width * 0.38;
    const innerH = height - innerPad * 2;
    image(caImg, innerPad, innerPad, innerW, innerH);
  } else {
    // fallback
    fill(56, 189, 248);
    rect(width * 0.22, height * 0.10, width * 0.3, height * 0.78, 32);
  }

  // Header text
  noStroke();
  fill(248, 250, 252);
  textAlign(LEFT, TOP);
  textSize(18);
  text("California ➜ Alameda County Focus", pad + 18, pad - 4);

  fill(148, 163, 184);
  textSize(12);
  text("Click anywhere on the map to go back to USA.", pad + 18, pad + 14);

  // Alameda bar-card on the right
  if (statsAlameda) {
    const cardX = width * 0.52;
    const cardY = pad + 32;
    const cardW = width * 0.40;
    const cardH = height - pad * 2 - 56;
    drawBarCard(statsAlameda, "Alameda County 2024", cardX, cardY, cardW, cardH);
  }
}

// ------------- mouse -------------
function mousePressed() {
  if (currentView === VIEW_US) {
    if (pointInRect(mouseX, mouseY, caHit)) {
      currentView = VIEW_CA;
      updateDashboardFor(VIEW_CA);   // switch side cards to Alameda
      fetchNewsFor(VIEW_CA);
    }
  } else {
    currentView = VIEW_US;
    updateDashboardFor(VIEW_US);     // side cards show CA again
    fetchNewsFor(VIEW_US);
  }
}

// ------------- helpers -------------
function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

// CLEAN + SPACED SODARO BAR CHART (used in both views)
function drawBarCard(stats, title, x, y, w, h) {
  // Card background
  noStroke();
  fill(9, 12, 32, 235);
  rect(x, y, w, h, 18);

  // Border
  noFill();
  stroke(6, 182, 255, 140);
  strokeWeight(1.5);
  rect(x + 1, y + 1, w - 2, h - 2, 18);

  // Title
  noStroke();
  fill(248);
  textAlign(LEFT, TOP);
  textSize(14);
  text(title, x + 14, y + 12);

  // Total
  fill(148, 163, 184);
  textSize(11);
  text("Total: " + stats.total.toLocaleString(), x + 14, y + 30);

  // Column headers
  const headerY = y + 52;
  textSize(11);
  fill(148, 163, 184);
  textAlign(LEFT, TOP);
  text("Offense", x + 14, headerY);
  textAlign(RIGHT, TOP);
  text("Count", x + w - 18, headerY);

  // Chart layout
  const top = headerY + 20;
  const left = x + 14;
  const right = x + w - 18;

  const barH = 12;       // slimmer bars
  const rowH = 42;       // more spacing between rows
  const rowsToShow = Math.min(8, stats.rows.length);

  // Find max
  let maxVal = 1;
  stats.rows.forEach(r => {
    if (r.value > maxVal) maxVal = r.value;
  });

  textSize(12);

  for (let i = 0; i < rowsToShow; i++) {
    const r = stats.rows[i];
    const rowY = top + i * rowH;

    // Offense label ABOVE bar
    fill(229, 231, 235);
    textAlign(LEFT, BOTTOM);
    text(r.name, left, rowY - 4);

    // Bar background
    noStroke();
    fill(20, 28, 45);
    rect(left, rowY, right - left, barH, 6);

    // Bar fill (smooth neon)
    const barWidth = map(r.value, 0, maxVal, 0, right - left);
    const barColor = color(6, 182, 255, 230);
    fill(barColor);
    rect(left, rowY, barWidth, barH, 6);

    // Count on right
    textAlign(RIGHT, CENTER);
    fill(148, 163, 184);
    text(r.value.toLocaleString(), right, rowY + barH / 2);
  }
}

// ------------- Dashboard (DOM on the right) -------------
function updateDashboardFor(viewKey) {
  const crumb  = document.getElementById("crumb");
  const status = document.getElementById("status");
  const snapLabel = document.getElementById("snapshotLabel");
  const breakdownLabel = document.getElementById("breakdownLabel");
  const summary = document.getElementById("summaryMetrics");
  const tableDiv = document.getElementById("tableMetrics");

  let where = "";
  let srcStats = null;

  if (viewKey === VIEW_US) {
    // USA view → side cards show California CSV
    where = "USA (California focus)";
    srcStats = statsCA;
    status.textContent = "View: USA — hover California for CA stats; click California to zoom into Alameda.";
    snapLabel.textContent = "California 2024 (CSV roll-up)";
  } else {
    // California view → side cards show Alameda CSV
    where = "USA ▸ California ▸ Alameda County";
    srcStats = statsAlameda;
    status.textContent = "View: California ➜ Alameda — click the map to go back to USA.";
    snapLabel.textContent = "Alameda County 2024 (CSV roll-up)";
  }

  crumb.textContent = where;

  summary.innerHTML = "";
  tableDiv.innerHTML = "";
  if (!srcStats) return;

  // summary
  const totalRow = document.createElement("div");
  totalRow.className = "metric-row";
  totalRow.innerHTML = `
    <span class="label">Total offenses</span>
    <span>${srcStats.total.toLocaleString()}</span>
  `;
  summary.appendChild(totalRow);

  if (statsCA && statsAlameda) {
    const ratio = statsAlameda.total / statsCA.total;
    const share = document.createElement("div");
    share.className = "metric-row";
    share.innerHTML = `
      <span class="label">Alameda share of CA</span>
      <span>${(ratio * 100).toFixed(2)}%</span>
    `;
    summary.appendChild(share);
  }

  breakdownLabel.textContent = "Top offenses by count";

  srcStats.rows.slice(0, 8).forEach(row => {
    const div = document.createElement("div");
    div.className = "metric-row";
    div.innerHTML = `
      <span class="label">${row.name}</span>
      <span>${row.value.toLocaleString()}</span>
    `;
    tableDiv.appendChild(div);
  });
}

// ------------- News (GNews) -------------
async function fetchNewsFor(viewKey) {
  if (viewKey === lastNewsView) return;  // avoid spamming API
  lastNewsView = viewKey;

  const statusEl = document.getElementById("news-status");
  const listEl = document.getElementById("news-list");
  statusEl.textContent = "Fetching crime news…";
  listEl.innerHTML = "";

  let query = "crime AND United States";
  if (viewKey === VIEW_CA) {
    query = "crime AND Alameda County OR Oakland AND California";
  }

  const q = encodeURIComponent(query);
  const url = `https://gnews.io/api/v4/search?q=${q}&lang=en&country=us&max=6&apikey=${GNEWS_KEY}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status + " " + res.statusText);
    const data = await res.json();
    const articles = data.articles || [];

    if (!articles.length) {
      statusEl.textContent = "No headlines found (rate limit or empty result).";
      return;
    }

    statusEl.textContent = `Showing ${Math.min(articles.length, 6)} latest crime headlines`;
    listEl.innerHTML = "";

    articles.slice(0, 6).forEach(a => {
      const item = document.createElement("a");
      item.href = a.url;
      item.target = "_blank";
      item.rel = "noopener noreferrer";
      item.className = "news-item";
      item.innerHTML = `
        <div class="news-title">• ${a.title}</div>
        <div class="news-meta">${new Date(a.publishedAt).toLocaleString()} · ${a.source?.name || "Source"}</div>
      `;
      listEl.appendChild(item);
    });
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Error fetching news (check console / API key / CORS).";
  }
}
