const ENTITIES = [
  {
    id: 'USER_SESSION', label: 'USER_SESSION', type: 'dep',
    x: 40, y: 40, w: 210, h: 175,
    keys: [{name:'SessionID', type:'PK'}, {name:'UserID', type:'FK'}],
    attrs: [{name:'IP'}, {name:'StartedAt'}, {name:'UserAgent'}]
  },
  {
    id: 'USER', label: 'USER', type: 'strong',
    x: 40, y: 275, w: 210, h: 175,
    keys: [{name:'UserID', type:'PK'}],
    attrs: [{name:'Email'}, {name:'FullName'}, {name:'RegisteredAt'}, {name:'IsActive'}]
  },
  {
    id: 'ORDER', label: 'ORDER', type: 'strong',
    x: 380, y: 275, w: 210, h: 195,
    keys: [{name:'OrderID', type:'PK'}, {name:'UserID', type:'FK'}],
    attrs: [{name:'Status'}, {name:'TotalAmount'}, {name:'CreatedAt'}, {name:'UpdatedAt'}]
  },
  {
    id: 'ORDER_ITEM', label: 'ORDER_ITEM', type: 'dep',
    x: 380, y: 540, w: 210, h: 155,
    keys: [{name:'OrderID', type:'FK'}, {name:'BookID', type:'FK'}],
    attrs: [{name:'Quantity'}, {name:'UnitPrice'}]
  },
  {
    id: 'REVIEW', label: 'REVIEW', type: 'dep',
    x: 700, y: 40, w: 250, h: 195,
    keys: [{name:'ReviewID', type:'PK'}, {name:'UserID', type:'FK'}, {name:'BookID', type:'FK'}],
    attrs: [{name:'Rating'}, {name:'ReviewText'}, {name:'IsPublished'}]
  },
  {
    id: 'BOOK', label: 'BOOK', type: 'strong',
    x: 700, y: 295, w: 250, h: 235,
    keys: [{name:'BookID', type:'PK'}],
    attrs: [{name:'ISBN'}, {name:'Title'}, {name:'Description'}, {name:'PublicationYear'}, {name:'Price'}, {name:'Tags'}, {name:'Metadata'}]
  },
  {
    id: 'BOOK_AUTHOR', label: 'BOOK_AUTHOR', type: 'assoc',
    x: 1080, y: 60, w: 210, h: 100,
    keys: [{name:'BookID', type:'FK'}, {name:'AuthorID', type:'FK'}],
    attrs: []
  },
  {
    id: 'BOOK_CATEGORY', label: 'BOOK_CATEGORY', type: 'assoc',
    x: 1080, y: 360, w: 210, h: 100,
    keys: [{name:'BookID', type:'FK'}, {name:'CategoryID', type:'FK'}],
    attrs: []
  },
  {
    id: 'STOCK', label: 'STOCK', type: 'assoc',
    x: 1080, y: 560, w: 210, h: 135,
    keys: [{name:'BookID', type:'FK'}, {name:'WarehouseID', type:'FK'}],
    attrs: [{name:'Quantity'}]
  },
  {
    id: 'AUTHOR', label: 'AUTHOR', type: 'strong',
    x: 1400, y: 70, w: 210, h: 175,
    keys: [{name:'AuthorID', type:'PK'}],
    attrs: [{name:'FullName'}, {name:'Biography'}, {name:'BirthDate'}, {name:'Country'}]
  },
  {
    id: 'CATEGORY', label: 'CATEGORY', type: 'strong',
    x: 1400, y: 345, w: 210, h: 135,
    keys: [{name:'CategoryID', type:'PK'}, {name:'ParentCategoryID', type:'FK'}],
    attrs: [{name:'Name'}]
  },
  {
    id: 'WAREHOUSE', label: 'WAREHOUSE', type: 'strong',
    x: 1400, y: 560, w: 210, h: 155,
    keys: [{name:'WarehouseID', type:'PK'}],
    attrs: [{name:'Name'}, {name:'Location'}, {name:'Capacity'}]
  }
];

const SMART_PATHS = [
  { from: 'USER', to: 'USER_SESSION', path: 'M 145 275 L 145 215', card: ['one','zeroOrMany'] },
  { from: 'USER', to: 'ORDER', path: 'M 250 372 L 380 372', card: ['one','zeroOrMany'] },
  { from: 'USER', to: 'REVIEW', path: 'M 250 320 L 315 320 L 315 20 L 790 20 L 790 40', card: ['one','zeroOrMany'] },
  { from: 'ORDER', to: 'ORDER_ITEM', path: 'M 485 470 L 485 540', card: ['one','oneOrMany'] },
  { from: 'BOOK', to: 'ORDER_ITEM', path: 'M 740 530 L 740 620 L 590 620', card: ['one','zeroOrMany'] },
  { from: 'BOOK', to: 'REVIEW', path: 'M 810 295 L 810 235', card: ['one','zeroOrMany'] },
  { from: 'BOOK', to: 'BOOK_AUTHOR', path: 'M 950 330 L 1010 330 L 1010 110 L 1080 110', card: ['one','oneOrMany'] },
  { from: 'BOOK', to: 'BOOK_CATEGORY', path: 'M 950 410 L 1080 410', card: ['one','oneOrMany'] },
  { from: 'BOOK', to: 'STOCK', path: 'M 950 490 L 1030 490 L 1030 627 L 1080 627', card: ['one','zeroOrMany'] },
  { from: 'AUTHOR', to: 'BOOK_AUTHOR', path: 'M 1400 110 L 1290 110', card: ['one','zeroOrMany'] },
  { from: 'CATEGORY', to: 'BOOK_CATEGORY', path: 'M 1400 410 L 1290 410', card: ['one','zeroOrMany'] },
  { from: 'WAREHOUSE', to: 'STOCK', path: 'M 1400 627 L 1290 627', card: ['one','zeroOrMany'] },
  { from: 'CATEGORY', to: 'CATEGORY', path: 'M 1610 380 L 1660 380 L 1660 445 L 1610 445', card: ['zeroOrOne','zeroOrMany'] }
];

function cardSymbol(px, py, ux, uy, kind) {
  const vx = -uy, vy = ux;
  const S = 'stroke="#334155" stroke-width="2" fill="none"';
  const pt = (d, s) => [px - ux * d + vx * s, py - uy * d + vy * s];
  const fmt = (xy) => xy.map(v => v.toFixed(1)).join(' ');
  const bar = (d) => `<line x1="${pt(d,7)[0].toFixed(1)}" y1="${pt(d,7)[1].toFixed(1)}" x2="${pt(d,-7)[0].toFixed(1)}" y2="${pt(d,-7)[1].toFixed(1)}" ${S}/>`;
  const circle = (d) => `<circle cx="${pt(d,0)[0].toFixed(1)}" cy="${pt(d,0)[1].toFixed(1)}" r="4" stroke="#334155" stroke-width="2" fill="#f8fafc"/>`;
  const crow = () => {
    const a = pt(16, 0);
    return `<path d="M ${fmt(a)} L ${fmt(pt(1,7))} M ${fmt(a)} L ${fmt(pt(1,0))} M ${fmt(a)} L ${fmt(pt(1,-7))}" ${S}/>`;
  };
  switch (kind) {
    case 'one':        return bar(9) + bar(15);
    case 'zeroOrMany': return crow() + circle(23);
    case 'oneOrMany':  return crow() + bar(22);
    case 'zeroOrOne':  return bar(10) + circle(20);
    default:           return bar(10);
  }
}

function pathPoints(d) {
  const n = d.match(/-?\d+(?:\.\d+)?/g).map(Number);
  const pts = [];
  for (let i = 0; i < n.length - 1; i += 2) pts.push([n[i], n[i + 1]]);
  return pts;
}

function unitTowards(a, b) {
  let dx = a[0] - b[0], dy = a[1] - b[1];
  const len = Math.hypot(dx, dy) || 1;
  return [dx / len, dy / len];
}

function generatePureSvgER() {
  let svg = `<svg viewBox="0 0 1700 740" width="100%" height="auto" preserveAspectRatio="xMinYMin meet" style="background:#f8fafc; font-family: system-ui, sans-serif;">
    <defs>
      <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.06"/>
      </filter>
    </defs>

    <g id="connections">`;

  for (const p of SMART_PATHS) {
    const dash = p.from === p.to ? '6,4' : '0';
    svg += `<path d="${p.path}" fill="none" stroke="#334155" stroke-width="2" stroke-dasharray="${dash}" />`;
  }

  svg += `</g>\n<g id="cardinality">`;
  for (const p of SMART_PATHS) {
    const pts = pathPoints(p.path);
    if (pts.length < 2) continue;
    const card = p.card || ['one', 'zeroOrMany'];
    const s = pts[0], s2 = pts[1];
    const [sux, suy] = unitTowards(s, s2);
    svg += cardSymbol(s[0], s[1], sux, suy, card[0]);
    const e = pts[pts.length - 1], e2 = pts[pts.length - 2];
    const [eux, euy] = unitTowards(e, e2);
    svg += cardSymbol(e[0], e[1], eux, euy, card[1]);
  }

  svg += `</g>\n<g id="entities">`;

  for (const ent of ENTITIES) {
    const headerBg = ent.type === 'assoc' ? '#0f766e' : ent.type === 'dep' ? '#1e3a8a' : '#0f172a';

    svg += `
    <g transform="translate(${ent.x}, ${ent.y})" filter="url(#shadow)">
      <rect width="${ent.w}" height="${ent.h}" rx="8" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5"/>
      <path d="M 0 8 A 8 8 0 0 1 8 0 L ${ent.w - 8} 0 A 8 8 0 0 1 ${ent.w} 8 L ${ent.w} 32 L 0 32 Z" fill="${headerBg}"/>
      <text x="${ent.w / 2}" y="21" fill="#ffffff" font-size="13" font-weight="bold" text-anchor="middle" letter-spacing="0.5">${ent.label}</text>
    `;

    let currentY = 50;
    const keys = ent.keys || [];
    const attrs = ent.attrs || [];

    for (const k of keys) {
      const isPK = k.type === 'PK';
      svg += `<text x="15" y="${currentY}" fill="#0f172a" font-size="12"
        font-weight="${isPK ? '700' : '500'}"
        text-decoration="${isPK ? 'underline' : 'none'}"
        font-style="${isPK ? 'normal' : 'italic'}">${k.name}</text>`;
      currentY += 20;
    }

    if (keys.length > 0 && attrs.length > 0) {
      currentY += 2;
      svg += `<line x1="14" y1="${currentY}" x2="${ent.w - 14}" y2="${currentY}" stroke="#94a3b8" stroke-width="1.2" stroke-linecap="round"/>`;
      currentY += 16;
    }

    for (const a of attrs) {
      svg += `<text x="15" y="${currentY}" fill="#475569" font-size="12">${a.name}</text>`;
      currentY += 20;
    }

    svg += `</g>`;
  }

  svg += `</g></svg>`;
  return svg;
}

function drawER() {
  const container = document.getElementById('er-interactive-container');
  if (!container) return;
  container.innerHTML = generatePureSvgER();
  if (typeof makeZoomable === 'function') makeZoomable('er-svg-wrap', 'er');
}
