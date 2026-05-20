const ENTITIES = [
  {
    id: 'USER', label: 'USER', type: 'strong', x: 40, y: 60, w: 200, h: 130,
    attrs: [
      {name:'UserId', role:'pk', note:'идентификатор'},
      {name:'Email', role:'uk', note:'AK1 — альтернативный идент.'},
      {name:'FullName', role:'', note:''},
      {name:'RegisteredAt', role:'', note:''},
      {name:'IsActive', role:'', note:'boolean'},
    ]
  },
  {
    id: 'AUTHOR', label: 'AUTHOR', type: 'strong', x: 920, y: 60, w: 200, h: 130,
    attrs: [
      {name:'AuthorId', role:'pk', note:'идентификатор'},
      {name:'FullName', role:'', note:''},
      {name:'Biography', role:'', note:'GIN FTS, 0..1'},
      {name:'BirthDate', role:'', note:'0..1'},
      {name:'Country', role:'', note:'0..1'},
    ]
  },
  {
    id: 'CATEGORY', label: 'CATEGORY', type: 'strong', x: 920, y: 300, w: 210, h: 110,
    attrs: [
      {name:'CategoryId', role:'pk', note:'идентификатор'},
      {name:'ParentCategoryId', role:'fk', note:'рекурсия, 0..1'},
      {name:'Name', role:'', note:''},
    ]
  },
  {
    id: 'BOOK', label: 'BOOK', type: 'strong', x: 400, y: 200, w: 240, h: 190,
    attrs: [
      {name:'BookId', role:'pk', note:'идентификатор'},
      {name:'ISBN', role:'uk', note:'AK1'},
      {name:'Title', role:'', note:'GIN trgm'},
      {name:'Description', role:'', note:'GIN FTS, 0..1'},
      {name:'PublicationYear', role:'', note:'B-tree, 0..1'},
      {name:'Price', role:'', note:'B-tree'},
      {name:'Tags', role:'', note:'GIN array, 0..N'},
      {name:'Metadata', role:'', note:'GIN jsonb, 0..1'},
    ]
  },
  {
    id: 'WAREHOUSE', label: 'WAREHOUSE', type: 'strong', x: 920, y: 530, w: 200, h: 110,
    attrs: [
      {name:'WarehouseId', role:'pk', note:'идентификатор'},
      {name:'Name', role:'', note:''},
      {name:'Location', role:'', note:'GiST'},
      {name:'Capacity', role:'', note:'0..1'},
    ]
  },
  {
    id: 'ORDER', label: 'ORDER', type: 'strong', x: 40, y: 290, w: 210, h: 140,
    attrs: [
      {name:'OrderId', role:'pk', note:'идентификатор'},
      {name:'UserId', role:'fk', note:'→ USER'},
      {name:'Status', role:'', note:'new/paid/shipped/...'},
      {name:'TotalAmount', role:'', note:'numeric'},
      {name:'CreatedAt', role:'', note:'BRIN'},
      {name:'UpdatedAt', role:'', note:''},
    ]
  },
  {
    id: 'ORDER_ITEM', label: 'ORDER_ITEM', type: 'dep', x: 280, y: 530, w: 210, h: 120,
    attrs: [
      {name:'OrderItemId', role:'pk', note:'суррогатный'},
      {name:'OrderId', role:'fk', note:'→ ORDER'},
      {name:'BookId', role:'fk', note:'→ BOOK'},
      {name:'Quantity', role:'', note:''},
      {name:'UnitPrice', role:'', note:'историческая цена'},
    ]
  },
  {
    id: 'REVIEW', label: 'REVIEW', type: 'dep', x: 530, y: 530, w: 210, h: 130,
    attrs: [
      {name:'ReviewId', role:'pk', note:'идентификатор'},
      {name:'UserId', role:'fk', note:'→ USER'},
      {name:'BookId', role:'fk', note:'→ BOOK'},
      {name:'Rating', role:'', note:'1..5'},
      {name:'ReviewText', role:'', note:'GIN FTS, 0..1'},
      {name:'IsPublished', role:'', note:'частичный индекс'},
    ]
  },
  {
    id: 'USER_SESSION', label: 'USER_SESSION', type: 'dep', x: 40, y: 550, w: 200, h: 110,
    attrs: [
      {name:'SessionId', role:'pk', note:'идентификатор'},
      {name:'UserId', role:'fk', note:'→ USER'},
      {name:'IP', role:'', note:'SP-GiST, inet'},
      {name:'StartedAt', role:'', note:''},
      {name:'UserAgent', role:'', note:'0..1'},
    ]
  },
  {
    id: 'BOOK_AUTHOR', label: 'BOOK_AUTHOR', type: 'assoc', x: 690, y: 100, w: 180, h: 80,
    attrs: [
      {name:'BookId', role:'pk', note:'PK+FK → BOOK'},
      {name:'AuthorId', role:'pk', note:'PK+FK → AUTHOR'},
    ]
  },
  {
    id: 'BOOK_CATEGORY', label: 'BOOK_CATEGORY', type: 'assoc', x: 690, y: 300, w: 180, h: 80,
    attrs: [
      {name:'BookId', role:'pk', note:'PK+FK → BOOK'},
      {name:'CategoryId', role:'pk', note:'PK+FK → CATEGORY'},
    ]
  },
  {
    id: 'STOCK', label: 'STOCK', type: 'assoc', x: 690, y: 480, w: 180, h: 90,
    attrs: [
      {name:'BookId', role:'pk', note:'PK+FK → BOOK'},
      {name:'WarehouseId', role:'pk', note:'PK+FK → WAREHOUSE'},
      {name:'Quantity', role:'', note:'остаток'},
    ]
  },
];

const CONNECTIONS = [
  ['USER','ORDER','||','o{','размещает'],
  ['USER','REVIEW','||','o{','пишет'],
  ['USER','USER_SESSION','||','o{','создаёт'],
  ['ORDER','ORDER_ITEM','||','|{','содержит'],
  ['BOOK','ORDER_ITEM','||','o{','входит в'],
  ['BOOK','REVIEW','||','o{','получает'],
  ['CATEGORY','CATEGORY','|o','o{','иерархия'],
  ['BOOK','BOOK_AUTHOR','||','|{','—'],
  ['AUTHOR','BOOK_AUTHOR','||','o{','—'],
  ['BOOK','BOOK_CATEGORY','||','|{','—'],
  ['CATEGORY','BOOK_CATEGORY','||','o{','—'],
  ['BOOK','STOCK','||','o{','хранится'],
  ['WAREHOUSE','STOCK','||','o{','содержит'],
];

function buildErMermaid() {
  const roleKey = r => r === 'pk' ? 'PK' : r === 'uk' ? 'UK' : r === 'fk' ? 'FK' : r === 'pkfk' ? 'PK,FK' : '';
  const quote = s => `"${String(s).replace(/"/g, "'")}"`;

  let txt = '%%{init: {"er": {"layoutDirection": "LR", "minEntityWidth": 120, "minEntityHeight": 60, "entityPadding": 20, "useMaxWidth": false}}}%%\nerDiagram\n';
  for (const ent of ENTITIES) {
    txt += `  ${ent.label} {\n`;
    for (const a of ent.attrs) {
      const role = roleKey(a.role);
      const comment = a.note ? ' ' + quote(a.note) : '';
      txt += `    attr ${a.name}${role ? ' ' + role : ''}${comment}\n`;
    }
    txt += `  }\n`;
  }
  for (const [from, to, l, r] of CONNECTIONS) {
    txt += `  ${from} ${l}--${r} ${to} : " "\n`;
  }
  return txt;
}

async function drawER() {
  const target = document.getElementById('er-mermaid');
  if (!target || typeof mermaid === 'undefined') return;
  try {
    const { svg } = await mermaid.render('er-mermaid-svg', buildErMermaid());
    target.innerHTML = svg;
    const svgEl = target.querySelector('svg');
    if (svgEl) {
      svgEl.style.minWidth = '1200px';
      svgEl.style.width = '100%';
      svgEl.style.height = 'auto';
    }
    const wrap = document.getElementById('er-svg-wrap');
    setupErZoom(target);
    if (wrap) setupErPan(wrap);
  } catch (err) {
    target.innerHTML = `<pre style="color:#f87171;padding:12px;white-space:pre-wrap">${err.message}</pre>`;
  }
}

function setupErZoom(target) {
  const wrap = document.getElementById('er-svg-wrap');
  if (!wrap) return;
  let scale = 1;
  const step = 0.2;
  const update = () => {
    target.style.transform = `scale(${scale})`;
    target.style.transformOrigin = 'top left';
    const svgEl = target.querySelector('svg');
    if (svgEl) wrap.style.minHeight = (svgEl.getBoundingClientRect().height * scale + 32) + 'px';
  };
  document.getElementById('er-zoom-in')   ?.addEventListener('click', () => { scale = Math.min(scale + step, 3);   update(); });
  document.getElementById('er-zoom-out')  ?.addEventListener('click', () => { scale = Math.max(scale - step, 0.3); update(); });
  document.getElementById('er-zoom-reset')?.addEventListener('click', () => { scale = 1; update(); });
}

function setupErPan(wrap) {
  let dragging = false, x0 = 0, y0 = 0, sl = 0, st = 0;
  wrap.style.cursor = 'grab';
  wrap.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    dragging = true; x0 = e.clientX; y0 = e.clientY;
    sl = wrap.scrollLeft; st = wrap.scrollTop;
    wrap.style.cursor = 'grabbing';
    e.preventDefault();
  });
  wrap.addEventListener('mousemove', e => {
    if (!dragging) return;
    wrap.scrollLeft = sl - (e.clientX - x0);
    wrap.scrollTop  = st - (e.clientY - y0);
  });
  const stop = () => { dragging = false; wrap.style.cursor = 'grab'; };
  wrap.addEventListener('mouseup', stop);
  wrap.addEventListener('mouseleave', stop);
}