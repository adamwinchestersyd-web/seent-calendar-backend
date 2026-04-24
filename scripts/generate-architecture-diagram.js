#!/usr/bin/env node
import PDFDocument from "pdfkit";
import fs from "fs";

const OUT = "Architecture_Diagram.pdf";

const COLORS = {
  bg: "#FFFFFF",
  ink: "#1A2332",
  inkSoft: "#475569",
  inkMuted: "#94A3B8",
  rule: "#D1D5DB",
  panel: "#F8FAFC",
  panelBorder: "#E2E8F0",
  github: "#24292E",
  githubTint: "#F2F3F5",
  render: "#0B6E4F",
  renderTint: "#E6F4EE",
  zoho: "#B91C1C",
  zohoTint: "#FDECEC",
  accent: "#C9A227",
  flowDeploy: "#0B6E4F",
  flowRuntime: "#1E40AF",
  flowUser: "#C9A227",
};

const doc = new PDFDocument({
  size: "A4",
  layout: "landscape",
  margin: 0,
});
doc.pipe(fs.createWriteStream(OUT));

const W = doc.page.width;   // 842
const H = doc.page.height;  // 595

// ---------- helpers ----------
function text(str, x, y, opts = {}) {
  doc.fillColor(opts.color || COLORS.ink)
    .font(opts.font || "Helvetica")
    .fontSize(opts.size || 9)
    .text(str, x, y, { width: opts.width, align: opts.align || "left", lineBreak: false });
}

function panel(x, y, w, h, fill, border, radius = 8) {
  doc.save();
  doc.roundedRect(x, y, w, h, radius)
    .fillAndStroke(fill, border);
  doc.restore();
}

function arrow(x1, y1, x2, y2, color, opts = {}) {
  const lineWidth = opts.lineWidth || 1.2;
  const dash = opts.dash;
  doc.save();
  doc.lineWidth(lineWidth).strokeColor(color);
  if (dash) doc.dash(dash[0], { space: dash[1] || dash[0] });
  doc.moveTo(x1, y1).lineTo(x2, y2).stroke();
  doc.undash();
  // arrowhead
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const ah = opts.head || 7;
  const aw = opts.headW || 4;
  const hx = x2 - ah * Math.cos(ang);
  const hy = y2 - ah * Math.sin(ang);
  const lx = hx + aw * Math.cos(ang + Math.PI / 2);
  const ly = hy + aw * Math.sin(ang + Math.PI / 2);
  const rx = hx - aw * Math.cos(ang + Math.PI / 2);
  const ry = hy - aw * Math.sin(ang + Math.PI / 2);
  doc.fillColor(color).polygon([x2, y2], [lx, ly], [rx, ry]).fill();
  doc.restore();
}

function arrowLabel(str, x, y, color = COLORS.inkSoft, size = 7.5) {
  doc.save();
  // tiny pill background for legibility
  doc.font("Helvetica").fontSize(size);
  const tw = doc.widthOfString(str) + 8;
  const th = size + 4;
  doc.roundedRect(x - tw / 2, y - th / 2, tw, th, 3)
    .fillAndStroke("#FFFFFF", COLORS.panelBorder);
  doc.fillColor(color)
    .text(str, x - tw / 2 + 4, y - th / 2 + 2, { width: tw - 8, align: "center", lineBreak: false });
  doc.restore();
}

function chip(x, y, label, color) {
  doc.save();
  doc.font("Helvetica-Bold").fontSize(7);
  const tw = doc.widthOfString(label) + 12;
  doc.roundedRect(x, y, tw, 14, 7).fill(color);
  doc.fillColor("#FFFFFF").text(label, x + 6, y + 3.5, { width: tw - 12, align: "center", lineBreak: false });
  doc.restore();
  return tw;
}

// ---------- HEADER ----------
doc.rect(0, 0, W, 56).fill(COLORS.ink);
text("Deployment Architecture", 36, 16, {
  color: "#FFFFFF", font: "Helvetica-Bold", size: 19,
});
text("Seen By Dashing  •  Install Calendar", 36, 39, {
  color: "#CBD5E1", size: 9,
});
text("v1.0   •   April 2026", W - 200, 18, {
  color: "#CBD5E1", size: 8.5, width: 164, align: "right",
});
text("Prepared by Adam Winchester", W - 200, 32, {
  color: COLORS.accent, size: 8.5, width: 164, align: "right",
});

// thin accent rule under header
doc.rect(0, 56, W, 2).fill(COLORS.accent);

// ---------- ZONE LAYOUT ----------
const zoneTop = 76;
const zoneH = 300;
const zonePad = 12;
const colW = 232;
const gap = 38;
const startX = (W - (colW * 3 + gap * 2)) / 2;

const cols = [
  {
    title: "Source Control",
    sub: "GitHub (private repos)",
    tint: COLORS.githubTint,
    accent: COLORS.github,
    icon: "GH",
    items: [
      {
        env: "TEST",
        envColor: COLORS.flowDeploy,
        primary: "seent-dev",
        meta: "adamwinchestersyd-web  /  branch: main",
      },
      {
        env: "PRODUCTION",
        envColor: COLORS.zoho,
        primary: "seent-calendar-backend",
        meta: "adamwinchestersyd-web  /  branch: main",
      },
    ],
  },
  {
    title: "Render Hosting",
    sub: "Auto-deploy on push to main",
    tint: COLORS.renderTint,
    accent: COLORS.render,
    icon: "RD",
    items: [
      {
        env: "TEST",
        envColor: COLORS.flowDeploy,
        primary: "seent-dev",
        meta: "Web Service • Node (Starter)",
        url: "seent-dev.onrender.com",
      },
      {
        env: "PRODUCTION",
        envColor: COLORS.zoho,
        primary: "seent-calendar-backend",
        meta: "Static Site",
        url: "seent-calendar-backend.onrender.com",
      },
    ],
  },
  {
    title: "Zoho CRM Web Tabs",
    sub: "Embedded as iframes",
    tint: COLORS.zohoTint,
    accent: COLORS.zoho,
    icon: "Z",
    items: [
      {
        env: "TEST",
        envColor: COLORS.flowDeploy,
        primary: "Job Calendar Dev",
        meta: "Web Tab",
        url: "seent-dev.onrender.com",
      },
      {
        env: "PRODUCTION",
        envColor: COLORS.zoho,
        primary: "Job Calendar",
        meta: "Web Tab",
        url: "seent-calendar-backend.onrender.com",
      },
    ],
  },
];

// Coordinates we'll need later for arrows
const itemBoxes = []; // per-column array of {x,y,w,h,centerY}

cols.forEach((col, ci) => {
  const x = startX + ci * (colW + gap);
  const y = zoneTop;

  // Outer zone panel
  panel(x, y, colW, zoneH, col.tint, col.accent, 10);

  // Header strip
  doc.save();
  doc.roundedRect(x, y, colW, 36, 10).fill(col.accent);
  // square the bottom so it visually sits flush
  doc.rect(x, y + 26, colW, 10).fill(col.accent);
  doc.restore();

  text(col.title, x + zonePad, y + 9, {
    color: "#FFFFFF", font: "Helvetica-Bold", size: 12,
  });
  text(col.sub, x + zonePad, y + 23, {
    color: "#E2E8F0", size: 8,
  });

  // Items
  const itemTop = y + 50;
  const itemH = 110;
  const itemGap = 12;
  itemBoxes[ci] = [];

  col.items.forEach((item, ii) => {
    const ix = x + zonePad;
    const iy = itemTop + ii * (itemH + itemGap);
    const iw = colW - zonePad * 2;
    panel(ix, iy, iw, itemH, "#FFFFFF", COLORS.panelBorder, 8);

    // env chip
    chip(ix + 12, iy + 12, item.env, item.envColor);

    // primary name
    text(item.primary, ix + 12, iy + 32, {
      font: "Helvetica-Bold", size: 10, width: iw - 24,
    });

    // meta
    text(item.meta, ix + 12, iy + 48, {
      color: COLORS.inkSoft, size: 8.5, width: iw - 24,
    });

    // url (if present)
    if (item.url) {
      text(item.url, ix + 12, iy + 62, {
        color: col.accent, font: "Helvetica-Bold", size: 8.5, width: iw - 24,
      });
    }

    // small footer note per item
    if (ci === 0) {
      text("source of truth", ix + 12, iy + itemH - 18, {
        color: COLORS.inkMuted, size: 7.5,
      });
    } else if (ci === 1) {
      const note = ii === 0
        ? "Express API + React UI"
        : "static bundle (front-end only)";
      text(note, ix + 12, iy + itemH - 18, {
        color: COLORS.inkMuted, size: 7.5,
      });
    } else {
      text("loaded inside CRM", ix + 12, iy + itemH - 18, {
        color: COLORS.inkMuted, size: 7.5,
      });
    }

    itemBoxes[ci].push({
      x: ix, y: iy, w: iw, h: itemH,
      leftMid: { x: ix, y: iy + itemH / 2 },
      rightMid: { x: ix + iw, y: iy + itemH / 2 },
    });
  });
});

// ---------- DEPLOY ARROWS (GitHub -> Render) ----------
[0, 1].forEach((row) => {
  const from = itemBoxes[0][row].rightMid;
  const to = itemBoxes[1][row].leftMid;
  arrow(from.x + 2, from.y, to.x - 2, to.y, COLORS.flowDeploy, {
    lineWidth: 1.4, dash: [4, 3], head: 8, headW: 4.5,
  });
  // Short label that fits inside the 62pt inter-column gap; the dashed
  // green line + legend entry communicates the "git push" semantics.
  arrowLabel("auto-deploy", (from.x + to.x) / 2, from.y - 12, COLORS.flowDeploy);
});

// ---------- RUNTIME ARROWS (Render -> Zoho iframe load) ----------
[0, 1].forEach((row) => {
  const from = itemBoxes[1][row].rightMid;
  const to = itemBoxes[2][row].leftMid;
  arrow(to.x - 2, to.y, from.x + 2, from.y, COLORS.flowRuntime, {
    lineWidth: 1.4, head: 8, headW: 4.5,
  });
  arrowLabel("HTTPS  iframe", (from.x + to.x) / 2, from.y - 12, COLORS.flowRuntime);
});

// ---------- RUNTIME DATA FLOW (Backend ↔ Zoho CRM API) ----------
// Draw curved paths beneath the zones connecting Render Web Service (test)
// to a "Zoho CRM Platform" badge that represents the API + webhooks.
const dataY = zoneTop + zoneH + 26;

// Zoho CRM Platform badge (centred horizontally on the page).
// Width is chosen so the rail in the LEFT gap (railX) and the rail in the
// RIGHT gap (rightRail) both sit OUTSIDE the badge horizontally. That way
// both runtime-data arrows can route around the production Render box
// without crossing it.
const badgeW = 232;
const badgeH = 50;
const badgeX = (W - badgeW) / 2;
const badgeY = dataY;
panel(badgeX, badgeY, badgeW, badgeH, "#FFFFFF", COLORS.zoho, 8);
doc.save();
doc.roundedRect(badgeX, badgeY, 8, badgeH, 8).fill(COLORS.zoho);
doc.rect(badgeX, badgeY, 4, badgeH).fill(COLORS.zoho);
doc.restore();
text("Zoho CRM Platform", badgeX + 16, badgeY + 6, {
  font: "Helvetica-Bold", size: 10.5,
});
text("Cases module  •  REST API", badgeX + 16, badgeY + 22, {
  color: COLORS.inkSoft, size: 8, width: badgeW - 24,
});
text("OAuth2 refresh-token  +  webhook", badgeX + 16, badgeY + 35, {
  color: COLORS.inkMuted, size: 7.5, width: badgeW - 24,
});

// Web Service (test) box <-> Zoho Platform: bidirectional API
// Route the runtime arrows through the LEFT gap (between Source Control and
// Render columns) using L-shapes so they do NOT pass through the
// production Render box that sits below the test web-service box.
const wsBox = itemBoxes[1][0]; // Render TEST web service (top item, col 1)
const railX = wsBox.x - 22;     // vertical rail in the gap, left of Render zone

// Outbound (REST fetch): leaves TEST web-service from left edge,
// goes left to rail, down to badge level, then right into the badge.
const restOutStart = { x: wsBox.x, y: wsBox.y + wsBox.h * 0.45 };
const restOutEnd   = { x: badgeX,  y: badgeY + 14 };
doc.save();
doc.lineWidth(1.4).strokeColor(COLORS.flowRuntime);
doc.moveTo(restOutStart.x, restOutStart.y)
   .lineTo(railX, restOutStart.y)
   .lineTo(railX, restOutEnd.y)
   .lineTo(restOutEnd.x - 6, restOutEnd.y)
   .stroke();
doc.restore();
// arrow head at end (pointing right into badge)
(function () {
  const ax = restOutEnd.x, ay = restOutEnd.y;
  doc.save();
  doc.fillColor(COLORS.flowRuntime);
  doc.moveTo(ax, ay).lineTo(ax - 7, ay - 4).lineTo(ax - 7, ay + 4).closePath().fill();
  doc.restore();
})();
// Label sits in the empty band ABOVE the badge, centered horizontally on
// the page so it does not overlap the GitHub column items on the left or
// the Zoho Web-Tab items on the right.
arrowLabel("REST: fetch cases  (cron every 10 min  +  on-demand)",
  W / 2, (zoneTop + zoneH + badgeY) / 2, COLORS.flowRuntime);

// Inbound (Zoho webhook): leaves badge LEFT side, goes left to rail,
// up to web-service level, then right back into the test web-service.
const hookOutStart = { x: badgeX,  y: badgeY + badgeH - 14 };
const hookOutEnd   = { x: wsBox.x, y: wsBox.y + wsBox.h * 0.70 };
const railX2 = railX - 14; // slightly further out so the two paths don't overlap
doc.save();
doc.lineWidth(1.4).strokeColor(COLORS.zoho);
doc.moveTo(hookOutStart.x, hookOutStart.y)
   .lineTo(railX2, hookOutStart.y)
   .lineTo(railX2, hookOutEnd.y)
   .lineTo(hookOutEnd.x - 6, hookOutEnd.y)
   .stroke();
doc.restore();
(function () {
  const ax = hookOutEnd.x, ay = hookOutEnd.y;
  doc.save();
  doc.fillColor(COLORS.zoho);
  doc.moveTo(ax, ay).lineTo(ax - 7, ay - 4).lineTo(ax - 7, ay + 4).closePath().fill();
  doc.restore();
})();
// Webhook label sits in the empty band BELOW the badge (legend is
// pushed down further to leave room).
arrowLabel("POST /api/webhook/crm-case-updated  (secret-protected)",
  W / 2, badgeY + badgeH + 13, COLORS.zoho);

// End-user → Zoho CRM badge (left side of badge)
const userX = startX + 8;
const userY = badgeY + badgeH / 2;
// little user "icon" (circle + body)
doc.save();
doc.fillColor(COLORS.flowUser).circle(userX + 8, userY - 6, 5).fill();
doc.roundedRect(userX, userY - 1, 16, 9, 4).fill(COLORS.flowUser);
doc.restore();
text("Zoho CRM user", userX + 22, userY - 8, {
  font: "Helvetica-Bold", size: 9,
});
text("opens Web Tab", userX + 22, userY + 3, {
  color: COLORS.inkSoft, size: 8,
});

// Arrow user -> Zoho platform badge
arrow(userX + 90, userY - 1, badgeX - 4, userY - 1, COLORS.flowUser, {
  lineWidth: 1.4, head: 7, headW: 4,
});

// ---------- LEGEND ----------
const legendY = badgeY + badgeH + 28;
text("Legend", 36, legendY, { font: "Helvetica-Bold", size: 9 });

function legendItem(x, y, color, label, dash = false) {
  doc.save();
  doc.lineWidth(1.6).strokeColor(color);
  if (dash) doc.dash(4, { space: 3 });
  doc.moveTo(x, y + 4).lineTo(x + 26, y + 4).stroke();
  doc.undash();
  // small arrowhead
  doc.fillColor(color).polygon([x + 26, y + 4], [x + 22, y + 1.5], [x + 22, y + 6.5]).fill();
  doc.restore();
  text(label, x + 32, y, { size: 8.5, color: COLORS.inkSoft });
}

let lx = 90;
legendItem(lx, legendY, COLORS.flowDeploy, "Deploy pipeline (git push, Render auto-deploy)", true);
lx += 280;
legendItem(lx, legendY, COLORS.flowRuntime, "Runtime data (HTTPS, REST API)");
lx += 210;
legendItem(lx, legendY, COLORS.zoho, "Zoho-to-Backend webhook");
lx += 170;
legendItem(lx, legendY, COLORS.flowUser, "End-user traffic");

// ---------- FOOTER CAPTION ----------
const capY = legendY + 16;
doc.font("Helvetica").fontSize(8).fillColor(COLORS.inkSoft).text(
  "Two parallel environments (TEST + PRODUCTION) each map 1:1 from a private GitHub repository to a Render service to a Zoho CRM Web Tab. TEST mirrors PRODUCTION but is fed by a separate repo so changes can be validated before promotion.",
  36, capY,
  { width: W - 72, align: "left" }
);

// brand strip
doc.rect(0, H - 18, W, 18).fill(COLORS.ink);
text("Seen By Dashing  •  Install Calendar  •  Architecture Diagram", 36, H - 13, {
  color: "#CBD5E1", size: 7.5,
});
text("adamwinchester.com", W - 200, H - 13, {
  color: COLORS.accent, size: 7.5, width: 164, align: "right",
});

doc.end();

doc.on("end", () => {
  console.log(`✓ Wrote ${OUT}`);
});
