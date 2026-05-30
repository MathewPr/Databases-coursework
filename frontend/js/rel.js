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
  {
    parent: 'BOOKS', child: 'BOOK_CATEGORIES', card: '1 : 1..N', required: true,
    insert_p: 'Без ограничений',
    insert_c: 'Требуется существующая книга (NOT NULL FK)',
    update:   'Запрещено для обеих сторон',
    delete_p: 'Каскадное удаление всех связей книга—категория (ON DELETE CASCADE)',
    delete_c: 'Разрешено',
  },
  {
    parent: 'USERS', child: 'REVIEWS', card: '1 : 0..N', required: true,
    insert_p: 'Без ограничений — пользователь может не оставлять отзывов',
    insert_c: 'Требуется существующий пользователь (NOT NULL FK)',
    update:   'Запрещено для обеих сторон',
    delete_p: 'Каскадное удаление всех отзывов (ON DELETE CASCADE)',
    delete_c: 'Разрешено',
  },
  {
    parent: 'BOOKS', child: 'REVIEWS', card: '1 : 0..N', required: true,
    insert_p: 'Без ограничений — книга может не иметь отзывов',
    insert_c: 'Требуется существующая книга (NOT NULL FK)',
    update:   'Запрещено для обеих сторон',
    delete_p: 'Каскадное удаление всех отзывов на книгу (ON DELETE CASCADE)',
    delete_c: 'Разрешено',
  },
  {
    parent: 'BOOKS', child: 'STOCK', card: '1 : 0..N', required: true,
    insert_p: 'Без ограничений — книга может отсутствовать на складах',
    insert_c: 'Требуется существующая книга (NOT NULL FK)',
    update:   'Запрещено для обеих сторон',
    delete_p: 'Каскадное удаление складских записей книги (ON DELETE CASCADE)',
    delete_c: 'Разрешено',
  },
  {
    parent: 'WAREHOUSES', child: 'STOCK', card: '1 : 0..N', required: true,
    insert_p: 'Без ограничений — склад может быть пустым',
    insert_c: 'Требуется существующий склад (NOT NULL FK)',
    update:   'Запрещено для обеих сторон',
    delete_p: 'Каскадное удаление складских записей (ON DELETE CASCADE)',
    delete_c: 'Разрешено',
  },
];

const REL_POS = {
  user_sessions:   { x:40,   y:40,  w:340, h:154 },
  users:           { x:40,   y:320, w:340, h:154 },
  orders:          { x:480,  y:320, w:340, h:176 },
  order_items:     { x:480,  y:600, w:340, h:154 },
  reviews:         { x:880,  y:40,  w:360, h:198 },
  books:           { x:880,  y:320, w:360, h:264 },
  book_authors:    { x:1320, y:70,  w:340, h:88  },
  book_categories: { x:1320, y:380, w:340, h:88  },
  stock:           { x:1320, y:620, w:340, h:110 },
  authors:         { x:1720, y:80,  w:340, h:154 },
  categories:      { x:1720, y:380, w:340, h:110 },
  warehouses:      { x:1720, y:600, w:340, h:132 },
};

const REL_PATHS = [
  { from:'orders',          to:'users',      d:'M 480 400 L 380 400', card:['zeroOrMany','one'] },
  { from:'user_sessions',   to:'users',      d:'M 210 194 L 210 320', card:['zeroOrMany','one'] },
  { from:'reviews',         to:'users',      d:'M 940 40 L 940 20 L 18 20 L 18 397 L 40 397', card:['zeroOrMany','one'] },
  { from:'order_items',     to:'orders',     d:'M 650 600 L 650 496', card:['oneOrMany','one'] },
  { from:'order_items',     to:'books',      d:'M 820 690 L 850 690 L 850 540 L 880 540', card:['zeroOrMany','one'] },
  { from:'reviews',         to:'books',      d:'M 1060 238 L 1060 320', card:['zeroOrMany','one'] },
  { from:'book_authors',    to:'books',      d:'M 1320 114 L 1280 114 L 1280 360 L 1240 360', card:['oneOrMany','one'] },
  { from:'book_authors',    to:'authors',    d:'M 1660 114 L 1720 114', card:['zeroOrMany','one'] },
  { from:'book_categories', to:'books',      d:'M 1320 424 L 1240 424', card:['oneOrMany','one'] },
  { from:'book_categories', to:'categories', d:'M 1660 424 L 1720 424', card:['zeroOrMany','one'] },
  { from:'stock',           to:'books',      d:'M 1320 675 L 1265 675 L 1265 520 L 1240 520', card:['zeroOrMany','one'] },
  { from:'stock',           to:'warehouses', d:'M 1660 675 L 1720 675', card:['zeroOrMany','one'] },
  { from:'categories',      to:'categories', d:'M 2060 410 L 2110 410 L 2110 460 L 2060 460', self:true, card:['zeroOrMany','zeroOrOne'] },
];

const REL_TYPE = {
  bigserial:'bigserial', bigint:'bigint', text:'text', timestamptz:'timestamptz',
  boolean:'boolean', numeric_12_2:'numeric(12,2)', numeric_10_2:'numeric(10,2)',
  smallint:'smallint', integer:'integer', inet:'inet', text_array:'text[]',
  jsonb:'jsonb', tsvector:'tsvector', date:'date', point:'point',
};

function relKeyTag(r) {
  switch (r) {
    case 'pk':   return { text:'PK',    fill:'#b45309' };
    case 'pkfk': return { text:'PK,FK', fill:'#b45309' };
    case 'fk':   return { text:'FK',    fill:'#4f46e5' };
    case 'uk':   return { text:'UK',    fill:'#047857' };
    case 'gen':  return { text:'GEN',   fill:'#64748b' };
    default:     return { text:'',      fill:'#94a3b8' };
  }
}

function relNameStyle(r) {
  switch (r) {
    case 'pk':   return { fill:'#0f172a', deco:'underline', style:'normal', weight:'700' };
    case 'pkfk': return { fill:'#0f172a', deco:'underline', style:'italic', weight:'700' };
    case 'fk':   return { fill:'#3730a3', deco:'none',      style:'italic', weight:'500' };
    case 'uk':   return { fill:'#0f172a', deco:'underline', style:'normal', weight:'500' };
    case 'gen':  return { fill:'#64748b', deco:'none',      style:'italic', weight:'500' };
    default:     return { fill:'#0f172a', deco:'none',      style:'normal', weight:'500' };
  }
}

function generatePureSvgRel() {
  let svg = `<svg viewBox="0 0 2160 800" width="100%" height="auto" preserveAspectRatio="xMinYMin meet" style="background:#f8fafc; font-family: system-ui, sans-serif;">
    <defs>
      <filter id="rel-shadow" x="-5%" y="-5%" width="110%" height="110%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.06"/>
      </filter>
    </defs>
    <g id="rel-connections">`;

  for (const p of REL_PATHS) {
    const dash = p.self ? '6,4' : '0';
    svg += `<path d="${p.d}" fill="none" stroke="#334155" stroke-width="2" stroke-dasharray="${dash}" />`;
  }

  svg += `</g>\n<g id="rel-card-layer">`;
  for (const p of REL_PATHS) {
    const pts = pathPoints(p.d);
    if (pts.length < 2) continue;
    const card = p.card || ['zeroOrMany', 'one'];
    const s = pts[0], s2 = pts[1];
    const [sux, suy] = unitTowards(s, s2);
    svg += cardSymbol(s[0], s[1], sux, suy, card[0]);
    const e = pts[pts.length - 1], e2 = pts[pts.length - 2];
    const [eux, euy] = unitTowards(e, e2);
    svg += cardSymbol(e[0], e[1], eux, euy, card[1]);
  }

  svg += `</g>\n<g id="rel-entities">`;

  for (const t of RD_TABLES) {
    const pos = REL_POS[t.id];
    if (!pos) continue;
    const xType = 150, xNull = 250;
    svg += `
    <g transform="translate(${pos.x}, ${pos.y})" filter="url(#rel-shadow)">
      <rect width="${pos.w}" height="${pos.h}" rx="8" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5"/>
      <path d="M 0 8 A 8 8 0 0 1 8 0 L ${pos.w - 8} 0 A 8 8 0 0 1 ${pos.w} 8 L ${pos.w} 30 L 0 30 Z" fill="#065f46"/>
      <text x="${pos.w / 2}" y="20" fill="#ffffff" font-size="12.5" font-weight="bold" text-anchor="middle" letter-spacing="0.4">${t.name}</text>`;

    let cy = 50;
    for (const c of t.cols) {
      const ns = relNameStyle(c.r);
      const kt = relKeyTag(c.r);
      const typeLabel = REL_TYPE[c.t] || c.t;
      const nullText = c.nu ? 'NULL' : 'NOT NULL';
      const nullFill = c.nu ? '#b45309' : '#64748b';
      svg += `<text x="14" y="${cy}" font-size="12" font-family="monospace" fill="${ns.fill}" font-weight="${ns.weight}" font-style="${ns.style}" text-decoration="${ns.deco}">${c.n}</text>`;
      svg += `<text x="${xType}" y="${cy}" font-size="10.5" font-family="monospace" fill="#64748b">${typeLabel}</text>`;
      svg += `<text x="${xNull}" y="${cy}" font-size="9" font-family="monospace" fill="${nullFill}">${nullText}</text>`;
      if (kt.text) svg += `<text x="${pos.w - 12}" y="${cy}" font-size="9.5" font-family="monospace" font-weight="700" fill="${kt.fill}" text-anchor="end">${kt.text}</text>`;
      cy += 22;
    }
    svg += `</g>`;
  }

  svg += `</g></svg>`;
  return svg;
}

function drawRelDiagram() {
  const target = document.getElementById('rel-mermaid');
  if (!target) return;
  target.innerHTML = generatePureSvgRel();
  if (typeof makeZoomable === 'function') makeZoomable('rel-svg-wrap', 'rel');
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
