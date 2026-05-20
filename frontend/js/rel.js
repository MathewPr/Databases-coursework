const RELATIONS = [
  {
    name: 'USERS', nf: '3НФ', note: 'Сильная сущность',
    cols: [
      {name:'UserId',       type:'bigint',      role:'pk',   nullable:'NOT NULL', constraint:'BIGSERIAL', fkref:''},
      {name:'Email',        type:'varchar(255)', role:'uk',   nullable:'NOT NULL', constraint:'UNIQUE (AK1)', fkref:''},
      {name:'FullName',     type:'varchar(255)', role:'',     nullable:'NOT NULL', constraint:'', fkref:''},
      {name:'RegisteredAt', type:'timestamptz',  role:'',     nullable:'NOT NULL', constraint:'', fkref:''},
      {name:'IsActive',     type:'boolean',      role:'',     nullable:'NOT NULL', constraint:'DEFAULT true', fkref:''},
    ],
    fds: 'UserId → Email, FullName, RegisteredAt, IsActive; Email → UserId (AK)',
  },
  {
    name: 'AUTHORS', nf: '3НФ', note: 'Сильная сущность',
    cols: [
      {name:'AuthorId',  type:'bigint',      role:'pk', nullable:'NOT NULL', constraint:'BIGSERIAL', fkref:''},
      {name:'FullName',  type:'varchar(255)', role:'',   nullable:'NOT NULL', constraint:'', fkref:''},
      {name:'Biography', type:'text',         role:'',   nullable:'NULL',     constraint:'', fkref:''},
      {name:'BirthDate', type:'date',         role:'',   nullable:'NULL',     constraint:'', fkref:''},
      {name:'Country',   type:'varchar(100)', role:'',   nullable:'NULL',     constraint:'', fkref:''},
    ],
    fds: 'AuthorId → FullName, Biography, BirthDate, Country',
  },
  {
    name: 'CATEGORIES', nf: '3НФ', note: 'Рекурсивная самоссылка',
    cols: [
      {name:'CategoryId',       type:'bigint',      role:'pk', nullable:'NOT NULL', constraint:'BIGSERIAL', fkref:''},
      {name:'ParentCategoryId', type:'bigint',      role:'fk', nullable:'NULL',     constraint:'', fkref:'CATEGORIES(CategoryId)'},
      {name:'Name',             type:'varchar(255)', role:'',  nullable:'NOT NULL', constraint:'', fkref:''},
    ],
    fds: 'CategoryId → ParentCategoryId, Name',
  },
  {
    name: 'BOOKS', nf: '3НФ', note: 'Tags — намеренная денормализация (GIN)',
    cols: [
      {name:'BookId',          type:'bigint',       role:'pk',  nullable:'NOT NULL', constraint:'BIGSERIAL', fkref:''},
      {name:'ISBN',            type:'varchar(20)',   role:'uk',  nullable:'NOT NULL', constraint:'UNIQUE (AK1)', fkref:''},
      {name:'Title',           type:'varchar(500)',  role:'',    nullable:'NOT NULL', constraint:'', fkref:''},
      {name:'Description',     type:'text',          role:'',    nullable:'NULL',     constraint:'', fkref:''},
      {name:'PublicationYear', type:'smallint',      role:'',    nullable:'NULL',     constraint:'', fkref:''},
      {name:'Pages',           type:'integer',       role:'',    nullable:'NULL',     constraint:'', fkref:''},
      {name:'Price',           type:'numeric(10,2)', role:'',    nullable:'NOT NULL', constraint:'', fkref:''},
      {name:'Tags',            type:'text[]',        role:'',    nullable:'NOT NULL', constraint:'DEFAULT \'{}\'', fkref:''},
      {name:'Metadata',        type:'jsonb',         role:'',    nullable:'NOT NULL', constraint:'DEFAULT \'{}\'', fkref:''},
      {name:'Fts',             type:'tsvector',      role:'gen', nullable:'NOT NULL', constraint:'GENERATED ALWAYS AS', fkref:''},
    ],
    fds: 'BookId → ISBN, Title, Description, …; ISBN → BookId (AK)',
  },
  {
    name: 'BOOK_AUTHORS', nf: 'БКНФ', note: 'Промежуточная M:N',
    cols: [
      {name:'BookId',   type:'bigint', role:'pkfk', nullable:'NOT NULL', constraint:'', fkref:'BOOKS(BookId)'},
      {name:'AuthorId', type:'bigint', role:'pkfk', nullable:'NOT NULL', constraint:'', fkref:'AUTHORS(AuthorId)'},
    ],
    fds: '(BookId, AuthorId) — составной PK; тривиальные ФЗ',
  },
  {
    name: 'BOOK_CATEGORIES', nf: 'БКНФ', note: 'Промежуточная M:N',
    cols: [
      {name:'BookId',     type:'bigint', role:'pkfk', nullable:'NOT NULL', constraint:'', fkref:'BOOKS(BookId)'},
      {name:'CategoryId', type:'bigint', role:'pkfk', nullable:'NOT NULL', constraint:'', fkref:'CATEGORIES(CategoryId)'},
    ],
    fds: '(BookId, CategoryId) — составной PK',
  },
  {
    name: 'WAREHOUSES', nf: '3НФ', note: 'Сильная сущность',
    cols: [
      {name:'WarehouseId', type:'bigint',  role:'pk', nullable:'NOT NULL', constraint:'BIGSERIAL', fkref:''},
      {name:'Name',        type:'varchar(255)', role:'', nullable:'NOT NULL', constraint:'', fkref:''},
      {name:'Location',    type:'point',   role:'',   nullable:'NOT NULL', constraint:'', fkref:''},
      {name:'Capacity',    type:'integer', role:'',   nullable:'NOT NULL', constraint:'', fkref:''},
    ],
    fds: 'WarehouseId → Name, Location, Capacity',
  },
  {
    name: 'STOCK', nf: 'БКНФ', note: 'M:N с атрибутом Quantity',
    cols: [
      {name:'BookId',      type:'bigint',  role:'pkfk', nullable:'NOT NULL', constraint:'', fkref:'BOOKS(BookId)'},
      {name:'WarehouseId', type:'bigint',  role:'pkfk', nullable:'NOT NULL', constraint:'', fkref:'WAREHOUSES(WarehouseId)'},
      {name:'Quantity',    type:'integer', role:'',     nullable:'NOT NULL', constraint:'CHECK >= 0', fkref:''},
    ],
    fds: '(BookId, WarehouseId) → Quantity',
  },
  {
    name: 'ORDERS', nf: '3НФ', note: 'TotalAmount — денормализация для производительности',
    cols: [
      {name:'OrderId',     type:'bigint',       role:'pk', nullable:'NOT NULL', constraint:'BIGSERIAL', fkref:''},
      {name:'UserId',      type:'bigint',       role:'fk', nullable:'NOT NULL', constraint:'', fkref:'USERS(UserId)'},
      {name:'Status',      type:'varchar(20)',   role:'',   nullable:'NOT NULL', constraint:'', fkref:''},
      {name:'TotalAmount', type:'numeric(12,2)', role:'',  nullable:'NOT NULL', constraint:'', fkref:''},
      {name:'CreatedAt',   type:'timestamptz',  role:'',   nullable:'NOT NULL', constraint:'', fkref:''},
      {name:'UpdatedAt',   type:'timestamptz',  role:'',   nullable:'NOT NULL', constraint:'', fkref:''},
    ],
    fds: 'OrderId → UserId, Status, TotalAmount, CreatedAt, UpdatedAt',
  },
  {
    name: 'ORDER_ITEMS', nf: '3НФ', note: 'Суррогатный PK вместо составного',
    cols: [
      {name:'OrderItemId', type:'bigint',       role:'pk', nullable:'NOT NULL', constraint:'BIGSERIAL', fkref:''},
      {name:'OrderId',     type:'bigint',       role:'fk', nullable:'NOT NULL', constraint:'', fkref:'ORDERS(OrderId)'},
      {name:'BookId',      type:'bigint',       role:'fk', nullable:'NOT NULL', constraint:'', fkref:'BOOKS(BookId)'},
      {name:'Quantity',    type:'integer',      role:'',   nullable:'NOT NULL', constraint:'', fkref:''},
      {name:'UnitPrice',   type:'numeric(10,2)', role:'',  nullable:'NOT NULL', constraint:'', fkref:''},
    ],
    fds: 'OrderItemId → OrderId, BookId, Quantity, UnitPrice',
  },
  {
    name: 'REVIEWS', nf: '3НФ', note: 'Частичный индекс по IsPublished',
    cols: [
      {name:'ReviewId',    type:'bigint',     role:'pk', nullable:'NOT NULL', constraint:'BIGSERIAL', fkref:''},
      {name:'UserId',      type:'bigint',     role:'fk', nullable:'NOT NULL', constraint:'', fkref:'USERS(UserId)'},
      {name:'BookId',      type:'bigint',     role:'fk', nullable:'NOT NULL', constraint:'', fkref:'BOOKS(BookId)'},
      {name:'Rating',      type:'smallint',   role:'',   nullable:'NOT NULL', constraint:'', fkref:''},
      {name:'ReviewText',  type:'text',       role:'',   nullable:'NULL',     constraint:'', fkref:''},
      {name:'IsPublished', type:'boolean',    role:'',   nullable:'NOT NULL', constraint:'', fkref:''},
      {name:'CreatedAt',   type:'timestamptz', role:'',  nullable:'NOT NULL', constraint:'', fkref:''},
    ],
    fds: 'ReviewId → UserId, BookId, Rating, ReviewText, IsPublished, CreatedAt',
  },
  {
    name: 'USER_SESSIONS', nf: '3НФ', note: 'SP-GiST по IP (inet)',
    cols: [
      {name:'SessionId', type:'bigint',      role:'pk', nullable:'NOT NULL', constraint:'BIGSERIAL', fkref:''},
      {name:'UserId',    type:'bigint',      role:'fk', nullable:'NOT NULL', constraint:'', fkref:'USERS(UserId)'},
      {name:'IP',        type:'inet',        role:'',   nullable:'NOT NULL', constraint:'', fkref:''},
      {name:'StartedAt', type:'timestamptz', role:'',   nullable:'NOT NULL', constraint:'', fkref:''},
      {name:'UserAgent', type:'varchar(500)', role:'',  nullable:'NULL',     constraint:'', fkref:''},
    ],
    fds: 'SessionId → UserId, IP, StartedAt, UserAgent',
  },
];

const RD_TABLES = [
  { id:'users', name:'USERS', cols:[
    {n:'id',            t:'bigserial',   r:'pk'},
    {n:'email',         t:'text',        r:'uk'},
    {n:'full_name',     t:'text',        r:''},
    {n:'registered_at', t:'timestamptz', r:''},
    {n:'is_active',     t:'boolean',     r:''},
  ]},
  { id:'orders', name:'ORDERS', cols:[
    {n:'id',           t:'bigserial',    r:'pk'},
    {n:'user_id',      t:'bigint',       r:'fk'},
    {n:'status',       t:'text',         r:''},
    {n:'total_amount', t:'numeric_12_2', r:''},
    {n:'created_at',   t:'timestamptz',  r:''},
    {n:'updated_at',   t:'timestamptz',  r:''},
  ]},
  { id:'user_sessions', name:'USER_SESSIONS', cols:[
    {n:'id',         t:'bigserial',   r:'pk'},
    {n:'user_id',    t:'bigint',      r:'fk'},
    {n:'ip',         t:'inet',        r:''},
    {n:'started_at', t:'timestamptz', r:''},
    {n:'user_agent', t:'text',        r:'',  nu:true},
  ]},
  { id:'books', name:'BOOKS', cols:[
    {n:'id',               t:'bigserial',    r:'pk'},
    {n:'isbn',             t:'text',         r:'uk'},
    {n:'title',            t:'text',         r:''},
    {n:'description',      t:'text',         r:'',   nu:true},
    {n:'publication_year', t:'smallint',     r:'',   nu:true},
    {n:'pages',            t:'integer',      r:'',   nu:true},
    {n:'price',            t:'numeric_10_2', r:''},
    {n:'tags',             t:'text_array',   r:''},
    {n:'metadata',         t:'jsonb',        r:''},
    {n:'fts',              t:'tsvector',     r:'gen'},
  ]},
  { id:'order_items', name:'ORDER_ITEMS', cols:[
    {n:'id',         t:'bigserial',    r:'pk'},
    {n:'order_id',   t:'bigint',       r:'fk'},
    {n:'book_id',    t:'bigint',       r:'fk'},
    {n:'quantity',   t:'integer',      r:''},
    {n:'unit_price', t:'numeric_10_2', r:''},
  ]},
  { id:'reviews', name:'REVIEWS', cols:[
    {n:'id',          t:'bigserial',   r:'pk'},
    {n:'user_id',     t:'bigint',      r:'fk'},
    {n:'book_id',     t:'bigint',      r:'fk'},
    {n:'rating',      t:'smallint',    r:''},
    {n:'text',        t:'text',        r:'',  nu:true},
    {n:'is_published',t:'boolean',     r:''},
    {n:'created_at',  t:'timestamptz', r:''},
  ]},
  { id:'book_authors', name:'BOOK_AUTHORS', cols:[
    {n:'book_id',   t:'bigint', r:'pkfk'},
    {n:'author_id', t:'bigint', r:'pkfk'},
  ]},
  { id:'authors', name:'AUTHORS', cols:[
    {n:'id',         t:'bigserial', r:'pk'},
    {n:'full_name',  t:'text',      r:''},
    {n:'biography',  t:'text',      r:'',  nu:true},
    {n:'birth_date', t:'date',      r:'',  nu:true},
    {n:'country',    t:'text',      r:'',  nu:true},
  ]},
  { id:'book_categories', name:'BOOK_CATEGORIES', cols:[
    {n:'book_id',     t:'bigint', r:'pkfk'},
    {n:'category_id', t:'bigint', r:'pkfk'},
  ]},
  { id:'categories', name:'CATEGORIES', cols:[
    {n:'id',        t:'bigserial', r:'pk'},
    {n:'parent_id', t:'bigint',    r:'fk',  nu:true},
    {n:'name',      t:'text',      r:''},
  ]},
  { id:'stock', name:'STOCK', cols:[
    {n:'book_id',      t:'bigint',  r:'pkfk'},
    {n:'warehouse_id', t:'bigint',  r:'pkfk'},
    {n:'quantity',     t:'integer', r:''},
  ]},
  { id:'warehouses', name:'WAREHOUSES', cols:[
    {n:'id',       t:'bigserial', r:'pk'},
    {n:'name',     t:'text',      r:''},
    {n:'location', t:'point',     r:''},
    {n:'capacity', t:'integer',   r:''},
  ]},
];

const RD_LINKS = [
  {from:'orders',          fc:'user_id',      to:'users',      tc:'id'},
  {from:'user_sessions',   fc:'user_id',      to:'users',      tc:'id'},
  {from:'order_items',     fc:'order_id',     to:'orders',     tc:'id'},
  {from:'order_items',     fc:'book_id',      to:'books',      tc:'id'},
  {from:'reviews',         fc:'user_id',      to:'users',      tc:'id'},
  {from:'reviews',         fc:'book_id',      to:'books',      tc:'id'},
  {from:'book_authors',    fc:'book_id',      to:'books',      tc:'id'},
  {from:'book_authors',    fc:'author_id',    to:'authors',    tc:'id'},
  {from:'book_categories', fc:'book_id',      to:'books',      tc:'id'},
  {from:'book_categories', fc:'category_id',  to:'categories', tc:'id'},
  {from:'stock',           fc:'book_id',      to:'books',      tc:'id'},
  {from:'stock',           fc:'warehouse_id', to:'warehouses', tc:'id'},
  {from:'categories',      fc:'parent_id',    to:'categories', tc:'id'},
];

const RD_REL_TYPES = [
  { type:'1 : N', parent:'USERS',      child:'ORDERS',      card:'1 : 0..N', impl:'FK user_id',      rule:'RESTRICT'  },
  { type:'1 : N', parent:'USERS',      child:'USER_SESSIONS', card:'1 : 0..N', impl:'FK user_id',    rule:'CASCADE'   },
  { type:'1 : N', parent:'USERS',      child:'REVIEWS',     card:'1 : 0..N', impl:'FK user_id',      rule:'CASCADE'   },
  { type:'1 : N', parent:'ORDERS',     child:'ORDER_ITEMS', card:'1 : 1..N', impl:'FK order_id',     rule:'CASCADE'   },
  { type:'1 : N', parent:'BOOKS',      child:'ORDER_ITEMS', card:'1 : 0..N', impl:'FK book_id',      rule:'RESTRICT'  },
  { type:'1 : N', parent:'BOOKS',      child:'REVIEWS',     card:'1 : 0..N', impl:'FK book_id',      rule:'CASCADE'   },
  { type:'M : N', parent:'BOOKS',      child:'AUTHORS',     card:'M : N',    impl:'BOOK_AUTHORS',    rule:'CASCADE'   },
  { type:'M : N', parent:'BOOKS',      child:'CATEGORIES',  card:'M : N',    impl:'BOOK_CATEGORIES', rule:'CASCADE'   },
  { type:'M : N', parent:'BOOKS',      child:'WAREHOUSES',  card:'M : N',    impl:'STOCK',           rule:'CASCADE'   },
  { type:'Рекурс.', parent:'CATEGORIES', child:'CATEGORIES', card:'0..1 : 0..N', impl:'FK parent_id → id', rule:'SET NULL' },
];

const RD_CARDINALITY = [
  {
    parent: 'USERS', child: 'ORDERS', card: '1 : 0..N', required: true,
    insert_p: 'Без ограничений — пользователь может существовать без заказов',
    insert_c: 'Требуется существующий пользователь (NOT NULL FK)',
    update:   'Запрещено для обеих сторон',
    delete_p: 'Запрещено при наличии заказов (ON DELETE RESTRICT)',
    delete_c: 'Разрешено',
  },
  {
    parent: 'USERS', child: 'USER_SESSIONS', card: '1 : 0..N', required: true,
    insert_p: 'Без ограничений — пользователь может существовать без сессий',
    insert_c: 'Требуется существующий пользователь (NOT NULL FK)',
    update:   'Запрещено для обеих сторон',
    delete_p: 'Каскадное удаление всех сессий (ON DELETE CASCADE)',
    delete_c: 'Разрешено',
  },
  {
    parent: 'ORDERS', child: 'ORDER_ITEMS', card: '1 : 1..N', required: true,
    insert_p: 'Без ограничений',
    insert_c: 'Требуется существующий заказ (NOT NULL FK)',
    update:   'Запрещено для обеих сторон',
    delete_p: 'Каскадное удаление всех позиций (ON DELETE CASCADE)',
    delete_c: 'Разрешено',
  },
  {
    parent: 'BOOKS', child: 'ORDER_ITEMS', card: '1 : 0..N', required: true,
    insert_p: 'Без ограничений — книга может не входить ни в один заказ',
    insert_c: 'Требуется существующая книга (NOT NULL FK)',
    update:   'Запрещено для обеих сторон',
    delete_p: 'Запрещено при наличии позиций заказов (ON DELETE RESTRICT)',
    delete_c: 'Разрешено',
  },
  {
    parent: 'CATEGORIES', child: 'CATEGORIES', card: '0..1 : 0..N', required: false,
    insert_p: 'Без ограничений — корневая категория может не иметь родителя',
    insert_c: 'Родитель необязателен (parent_id — nullable FK)',
    update:   'Запрещено для обеих сторон',
    delete_p: 'Установить NULL у дочерних категорий — они становятся корневыми (ON DELETE SET NULL)',
    delete_c: 'Разрешено',
  },
  {
    parent: 'BOOKS', child: 'BOOK_AUTHORS', card: '1 : 1..N', required: true,
    insert_p: 'Без ограничений',
    insert_c: 'Требуется существующая книга (NOT NULL FK)',
    update:   'Запрещено для обеих сторон',
    delete_p: 'Каскадное удаление всех связей книга—автор (ON DELETE CASCADE)',
    delete_c: 'Разрешено',
  },
];

function buildRelMermaid() {
  const roleKey = r => {
    if (r === 'pk')   return 'PK';
    if (r === 'fk')   return 'FK';
    if (r === 'uk')   return 'UK';
    if (r === 'pkfk') return 'PK,FK';
    return '';
  };
  const tbl = id => RD_TABLES.find(t => t.id === id);

  let txt = '%%{init: {"er": {"layoutDirection": "LR", "minEntityWidth": 140, "minEntityHeight": 50, "entityPadding": 18, "useMaxWidth": false}}}%%\nerDiagram\n';
  for (const t of RD_TABLES) {
    txt += `  ${t.name} {\n`;
    for (const c of t.cols) {
      const key  = roleKey(c.r);
      const note = c.r === 'gen' ? ' "GENERATED"' : c.nu ? ' "NULL"' : '';
      txt += `    ${c.n} ${c.t}${key ? ' ' + key : ''}${note}\n`;
    }
    txt += `  }\n`;
  }
  for (const lk of RD_LINKS) {
    const fT = tbl(lk.from), toT = tbl(lk.to);
    if (!fT || !toT) continue;
    txt += `  ${fT.name} }o--|| ${toT.name} : " "\n`;
  }
  return txt;
}

async function drawRelDiagram() {
  const target = document.getElementById('rel-mermaid');
  if (!target || typeof mermaid === 'undefined') return;
  try {
    const { svg } = await mermaid.render('rel-mermaid-svg', buildRelMermaid());
    target.innerHTML = svg;
  } catch (err) {
    target.innerHTML = `<pre style="color:#f87171;padding:12px;white-space:pre-wrap">${err.message}</pre>`;
  }
}

function buildRelational() {
  const grid = document.getElementById('rel-grid');
  const keyLabel = role => {
    if (role === 'pk')   return 'Первичный';
    if (role === 'fk')   return 'Внешний';
    if (role === 'pkfk') return 'Первичный, внешний';
    if (role === 'uk')   return 'Альтернативный';
    if (role === 'gen')  return 'Вычисляемый';
    return '—';
  };
  const noteLabel = col => {
    if (col.role === 'pk'   && col.constraint.includes('BIGSERIAL')) return 'Суррогатный';
    if (col.role === 'pkfk') return 'Составной PK';
    if (col.role === 'uk')   return 'Уникальный';
    if (col.role === 'fk'   && col.fkref) return '→ ' + col.fkref;
    if (col.role === 'gen')  return 'Вычисляемый столбец';
    return '—';
  };
  const keyClass = role => {
    if (role === 'pk' || role === 'pkfk') return 'kl-pk';
    if (role === 'fk')   return 'kl-fk';
    if (role === 'uk')   return 'kl-uk';
    if (role === 'gen')  return 'kl-gen';
    return '';
  };

  for (const rel of RELATIONS) {
    const card = document.createElement('div');
    card.className = 'rel-table-card';

    const header = document.createElement('div');
    header.className = 'rel-table-header';
    header.innerHTML = `<span class="rel-table-name">${rel.name}</span><span class="rel-table-note">${rel.nf} · ${rel.note}</span>`;
    card.appendChild(header);

    const colWrap = document.createElement('div');
    colWrap.className = 'rel-cols';
    const table = document.createElement('table');
    table.className = 'rel';
    table.innerHTML = `<tr>
      <th>Название</th>
      <th>Тип</th>
      <th>Ключ</th>
      <th>NULL</th>
      <th>Примечание</th>
    </tr>`;

    for (const col of rel.cols) {
      const tr = document.createElement('tr');
      const kl = keyClass(col.role);
      const kText = keyLabel(col.role);
      const nText = noteLabel(col);
      const nullText = col.nullable === 'NULL' ? 'Null' : '—';
      tr.innerHTML = `
        <td class="attr-name">${col.name}</td>
        <td class="attr-type">${col.type}</td>
        <td class="${kl || 'attr-null'}">${kText}</td>
        <td class="${col.nullable === 'NULL' ? 'attr-null' : 'attr-nn'}">${nullText}</td>
        <td class="attr-note">${nText}</td>
      `;
      table.appendChild(tr);
    }
    colWrap.appendChild(table);
    card.appendChild(colWrap);

    const fds = document.createElement('div');
    fds.className = 'rel-fds';
    fds.innerHTML = `<strong>ФЗ:</strong> ${rel.fds}`;
    card.appendChild(fds);

    grid.appendChild(card);
  }
}

function buildRelationshipTypes() {
  const container = document.getElementById('rel-types');
  if (!container) return;

  const wrap = document.createElement('div');
  wrap.style.cssText = 'overflow-x:auto;margin-bottom:24px';
  const table = document.createElement('table');
  table.className = 'rel';
  table.innerHTML = `<tr>
    <th>Тип связи</th>
    <th>Родитель</th>
    <th>Дочерняя</th>
    <th>Кардинальность</th>
    <th>Реализация</th>
    <th>ON DELETE</th>
  </tr>`;

  const ruleClass = r => r === 'RESTRICT' ? 'bench-bad' : r === 'CASCADE' ? 'bench-med' : r === 'SET NULL' ? 'bench-good' : '';

  for (const r of RD_REL_TYPES) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight:600;color:var(--teal)">${r.type}</td>
      <td style="font-family:monospace;font-size:0.8rem">${r.parent}</td>
      <td style="font-family:monospace;font-size:0.8rem">${r.child}</td>
      <td style="color:var(--text2)">${r.card}</td>
      <td style="color:var(--text2);font-size:0.8rem">${r.impl}</td>
      <td class="${ruleClass(r.rule)}" style="font-family:monospace;font-size:0.8rem">${r.rule}</td>
    `;
    table.appendChild(tr);
  }
  wrap.appendChild(table);
  container.appendChild(wrap);
}

function buildCardinalityRules() {
  const container = document.getElementById('rel-cardinality');
  if (!container) return;

  for (const rel of RD_CARDINALITY) {
    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom:20px';

    const title = document.createElement('h4');
    title.style.cssText = 'color:var(--text2);font-size:0.82rem;margin-bottom:6px;font-weight:600';
    title.textContent = `${rel.parent} → ${rel.child} (${rel.card})`;
    section.appendChild(title);

    const wrap = document.createElement('div');
    wrap.style.cssText = 'overflow-x:auto';
    const table = document.createElement('table');
    table.className = 'rel';

    const parentLabel = rel.required
      ? `«${rel.parent}» — обязательный родитель`
      : `«${rel.parent}» — необязательный родитель`;

    table.innerHTML = `<tr>
      <th>${parentLabel}</th>
      <th>Действия для «${rel.parent}» (родитель)</th>
      <th>Действия для «${rel.child}» (дочерняя)</th>
    </tr>
    <tr>
      <td style="font-weight:600">Вставка</td>
      <td>${rel.insert_p}</td>
      <td>${rel.insert_c}</td>
    </tr>
    <tr>
      <td style="font-weight:600">Изменение ключа</td>
      <td colspan="2" style="color:var(--text2)">${rel.update}</td>
    </tr>
    <tr>
      <td style="font-weight:600">Удаление</td>
      <td>${rel.delete_p}</td>
      <td>${rel.delete_c}</td>
    </tr>`;
    wrap.appendChild(table);
    section.appendChild(wrap);
    container.appendChild(section);
  }
}
