const IDX_TYPES = [
  {
    name: 'B-tree', icon: '🌲', color: '#1e40af', tagline: 'Сбалансированное дерево Lehman–Yao',
    structure: 'Многоуровневое дерево, листья — двусвязный список',
    ops: ['<', '<=', '=', '>=', '>', 'BETWEEN', 'IN', 'IS NULL', 'LIKE prefix%'],
    useIn: ['users(email)', 'books(price)', 'books(publication_year)', 'orders(user_id)', 'orders(created_at)'],
    limits: 'Не поддерживает LIKE "%...%", массивы, JSONB',
    extras: 'INCLUDE (покрывающий), DESC/NULLS, дедупликация v13+',
    eq: true, range: true, sort: true, multi: true, unique: true,
  },
  {
    name: 'Hash', icon: '#', color: '#065f46', tagline: 'Расширяемое хеширование',
    structure: 'Хеш-таблица; crash-safe с PostgreSQL 10+',
    ops: ['='],
    useIn: ['users(email) — бенчмарк vs B-tree'],
    limits: 'Только равенство; нет сортировки; нет составных; нет UNIQUE',
    extras: 'Иногда меньше B-tree по размеру на длинных ключах',
    eq: true, range: false, sort: false, multi: false, unique: false,
  },
  {
    name: 'GiST', icon: '🌐', color: '#7c3aed', tagline: 'Обобщённое поисковое дерево',
    structure: 'Фреймворк: тип определяет consistent/union/penalty/picksplit',
    ops: ['&&', '<@', '@>', '<->', 'ILIKE (pg_trgm)', '@@ (FTS)'],
    useIn: ['warehouses(location)', 'books(title) gist_trgm_ops'],
    limits: 'Медленнее B-tree на простых типах; дороже поддержание',
    extras: 'KNN-поиск (ORDER BY location <-> point), PostGIS, диапазоны',
    eq: false, range: true, sort: false, multi: true, unique: false,
  },
  {
    name: 'SP-GiST', icon: '🗺', color: '#be185d', tagline: 'Пространственно-разбитое дерево',
    structure: 'Несбалансированные деревья: quadtree, k-d tree, patricia-trie',
    ops: ['<<', '>>', '&&', '<@', '@>', '= (inet)', 'text prefix'],
    useIn: ['user_sessions(ip) inet_ops'],
    limits: 'Нет составных; несбалансированность → худший случай хуже B-tree',
    extras: 'Эффективен для иерархических/пространственных данных',
    eq: true, range: true, sort: false, multi: false, unique: false,
  },
  {
    name: 'GIN', icon: '📑', color: '#b45309', tagline: 'Обобщённый инвертированный индекс',
    structure: 'Ключ → список TID строк; fastupdate буферизует вставки',
    ops: ['@>', '<@', '&&', '@@ (tsvector)', '% (trgm)'],
    useIn: ['books(fts)', 'books(tags)', 'books(metadata)', 'reviews(text)'],
    limits: 'Медленная вставка/обновление; большой размер; нет диапазонов',
    extras: 'gin_clean_pending_list; jsonb_path_ops компактнее jsonb_ops',
    eq: true, range: false, sort: false, multi: false, unique: false,
  },
  {
    name: 'BRIN', icon: '📦', color: '#0e7490', tagline: 'Диапазонные блочные сводки',
    structure: 'Минимум/максимум для каждых N страниц (по умолч. 128)',
    ops: ['<', '<=', '=', '>=', '>'],
    useIn: ['orders(created_at) — временной ряд ≥10M строк'],
    limits: 'Эффективен только при физической корреляции; не точный',
    extras: 'Размер в десятки раз меньше B-tree; аналитические диапазоны',
    eq: false, range: true, sort: false, multi: false, unique: false,
  },
];


function buildIndexes() {
  const grid = document.getElementById('idx-grid');
  for (const idx of IDX_TYPES) {
    const card = document.createElement('div');
    card.className = 'idx-card';
    card.innerHTML = `
      <div class="idx-header">
        <div class="idx-icon" style="background:${idx.color}22;color:${idx.color};border:1px solid ${idx.color}44;">${idx.icon}</div>
        <div><div class="idx-name">${idx.name}</div><div class="idx-tagline">${idx.tagline}</div></div>
      </div>
      <div class="idx-body">
        <div class="idx-row"><div class="idx-label">Структура</div><div class="idx-value">${idx.structure}</div></div>
        <div class="idx-row"><div class="idx-label">Операторы</div><div class="idx-tags">${idx.ops.map(o=>`<span class="idx-tag">${o}</span>`).join('')}</div></div>
        <div class="idx-row"><div class="idx-label">Применение в схеме</div><div class="idx-value">${idx.useIn.map(u=>`<span style="font-family:monospace;font-size:0.8rem;color:#60a5fa">${u}</span>`).join('<br>')}</div></div>
        <div class="idx-row"><div class="idx-label">Ограничения</div><div class="idx-use">${idx.limits}</div></div>
        <div class="idx-row"><div class="idx-label">Особенности PG</div><div class="idx-use">${idx.extras}</div></div>
      </div>`;
    grid.appendChild(card);
  }
}
