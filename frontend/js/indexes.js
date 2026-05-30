const IDX_CMP = [
  {
    name: 'B-tree', color: '#1e40af',
    structure: 'Дерево с автоматической балансировкой; листья связаны в список для быстрого обхода диапазонов',
    ops: ['=', '<', '<=', '>=', '>', 'BETWEEN', 'IN', 'IS NULL', 'LIKE prefix%'],
    eq: true, range: true, sort: true, multi: true, unique: true,
    size: 'средний', overhead: 'низкий',
    best: 'Точечные и диапазонные запросы на скалярных типах; покрывающие индексы (INCLUDE); сортировка',
    limits: 'Не поддерживает LIKE "%...%", массивы, JSONB, полнотекстовый поиск',
    schema: 'users(email), books(price), books(publication_year), orders(created_at)',
  },
  {
    name: 'Hash', color: '#065f46',
    structure: 'Хеш-таблица: значение → хеш → страница; не требует перестройки после сбоя (с PostgreSQL 10+)',
    ops: ['='],
    eq: true, range: false, sort: false, multi: false, unique: false,
    size: 'меньше B-tree на длинных ключах', overhead: 'низкий',
    best: 'Точечные запросы по равенству на длинных строках (email, UUID, хэши)',
    limits: 'Только «=»; нет сортировки, составных индексов, UNIQUE; хуже B-tree на коротких ключах',
    schema: 'users(email) — бенчмарк точечного поиска vs B-tree',
  },
  {
    name: 'GiST', color: '#6d28d9',
    structure: 'Гибкое дерево поиска: логику сравнения задаёт сам тип данных (точки, диапазоны, текст)',
    ops: ['&&', '<@', '@>', '<->', 'ILIKE (pg_trgm)', '@@ (FTS)', 'диапазоны'],
    eq: false, range: true, sort: true, multi: true, unique: false,
    size: 'большой', overhead: 'высокий',
    best: 'Геопространственные данные (PostGIS), KNN-поиск (<->), диапазонные типы, pg_trgm ILIKE',
    limits: 'Медленнее B-tree на скалярах; дорогое обслуживание; нет UNIQUE',
    schema: 'warehouses(location) KNN point, books(title) gist_trgm_ops',
  },
  {
    name: 'SP-GiST', color: '#be185d',
    structure: 'Дерево, делящее пространство на непересекающиеся части; компактнее B-tree при разреженных данных',
    ops: ['<<', '>>', '&&', '<@', '@>', '= (inet)', 'префикс текста'],
    eq: true, range: true, sort: false, multi: false, unique: false,
    size: 'компактный', overhead: 'средний',
    best: 'IP-сети (inet/cidr), иерархические и пространственные данные с низкой кардинальностью',
    limits: 'Нет составных индексов; несбалансированность — худший случай хуже B-tree',
    schema: 'user_sessions(ip) inet_ops',
  },
  {
    name: 'GIN', color: '#b45309',
    structure: 'Инвертированный индекс: каждый элемент (слово, тег) → список строк, где он встречается',
    ops: ['@>', '<@', '&&', '@@ (tsvector)', '% (trgm)', 'jsonb_path_ops'],
    eq: true, range: false, sort: false, multi: false, unique: false,
    size: 'очень большой', overhead: 'очень высокий',
    best: 'Полнотекстовый поиск (tsvector), массивы (text[]), JSONB, триграммный поиск (%)',
    limits: 'Медленные INSERT/UPDATE; нет диапазонов; требует gin_clean_pending_list при fastupdate',
    schema: 'books(fts), books(tags), books(metadata), reviews(text)',
  },
  {
    name: 'BRIN', color: '#0e7490',
    structure: 'Хранит минимум и максимум для каждых 128 страниц; почти не занимает место',
    ops: ['=', '<', '<=', '>=', '>'],
    eq: false, range: true, sort: false, multi: false, unique: false,
    size: 'крошечный (в 100× меньше B-tree)', overhead: 'минимальный',
    best: 'Аналитические диапазоны по монотонным столбцам (временны́е ряды ≥10M строк)',
    limits: 'Эффективен ТОЛЬКО при высокой физической корреляции данных; неточен — bitmap recheck',
    schema: 'orders(created_at) — временной ряд',
  },
];

function buildIndexes() {
  const root = document.getElementById('idx-cmp');
  if (!root) return;

  const yes  = '<span class="check">✓</span>';
  const no   = '<span class="cross">✗</span>';

  let html = `
    <h3 style="margin-bottom:12px;color:var(--text2);font-size:0.9rem;text-transform:uppercase;letter-spacing:0.05em">Характеристики</h3>
    <div class="bench-compare-wrap" style="margin-bottom:28px">
    <table class="bench-compare" style="min-width:900px">
      <tr>
        <th style="min-width:90px">Тип</th>
        <th>Структура данных</th>
        <th style="text-align:center" title="Поиск по равенству">=</th>
        <th style="text-align:center" title="Диапазонный поиск">Диапазон</th>
        <th style="text-align:center" title="Поддержка ORDER BY">Сортировка</th>
        <th style="text-align:center" title="Составной индекс">Составной</th>
        <th style="text-align:center" title="UNIQUE-ограничение">UNIQUE</th>
        <th>Размер индекса</th>
        <th>Накладные расходы DML</th>
      </tr>`;

  for (const r of IDX_CMP) {
    html += `<tr>
      <td style="font-weight:700;color:${r.color};font-family:monospace;white-space:nowrap">${r.name}</td>
      <td style="font-size:0.78rem;color:var(--text2)">${r.structure}</td>
      <td style="text-align:center">${r.eq    ? yes : no}</td>
      <td style="text-align:center">${r.range ? yes : no}</td>
      <td style="text-align:center">${r.sort  ? yes : no}</td>
      <td style="text-align:center">${r.multi ? yes : no}</td>
      <td style="text-align:center">${r.unique? yes : no}</td>
      <td style="font-size:0.78rem;color:var(--text2)">${r.size}</td>
      <td style="font-size:0.78rem;color:var(--text2)">${r.overhead}</td>
    </tr>`;
  }
  html += `</table></div>`;

  html += `
    <h3 style="margin-bottom:12px;color:var(--text2);font-size:0.9rem;text-transform:uppercase;letter-spacing:0.05em">Операторы, применение и ограничения</h3>
    <div class="bench-compare-wrap" style="margin-bottom:28px">
    <table class="bench-compare" style="min-width:1000px">
      <tr>
        <th style="min-width:90px">Тип</th>
        <th>Поддерживаемые операторы</th>
        <th>Когда применять</th>
        <th>Ограничения</th>
        <th>В схеме проекта</th>
      </tr>`;

  for (const r of IDX_CMP) {
    html += `<tr>
      <td style="font-weight:700;color:${r.color};font-family:monospace;white-space:nowrap">${r.name}</td>
      <td style="font-size:0.78rem;font-family:monospace;color:var(--blue-light);max-width:180px">${r.ops.join(', ')}</td>
      <td style="font-size:0.78rem;color:var(--text)">${r.best}</td>
      <td style="font-size:0.78rem;color:var(--text2)">${r.limits}</td>
      <td style="font-size:0.78rem;font-family:monospace;color:var(--teal)">${r.schema}</td>
    </tr>`;
  }
  html += `</table></div>`;

  root.innerHTML = html;
}
