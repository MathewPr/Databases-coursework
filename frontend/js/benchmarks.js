const BENCH_MATRIX = [
  { type:'B-tree',    eq:'fast', range:'fast', sort:'fast', size:'medium',
    useCase:'Универсальный — ключи, даты, числа, строки с prefix-поиском' },
  { type:'Hash',      eq:'fast', range:'—',    sort:'—',    size:'small',
    useCase:'Точечные JOIN по равенству при высокой кардинальности' },
  { type:'GiST',      eq:'ok',   range:'fast', sort:'fast', size:'large',
    useCase:'Геометрия, KNN, диапазоны, триграммы (GIN предпочтителен для FTS)' },
  { type:'SP-GiST',   eq:'fast', range:'ok',   sort:'—',    size:'small',
    useCase:'IP-подсети (<<), иерархические ключи, несбалансированные пространства' },
  { type:'GIN',       eq:'fast', range:'—',    sort:'—',    size:'large',
    useCase:'FTS (tsvector), массивы (@>), JSONB (@>/?) — незаменим' },
  { type:'BRIN',      eq:'slow', range:'ok',   sort:'—',    size:'tiny',
    useCase:'Монотонные временные ряды (INSERT-порядок = данные)' },
];


function benchClass(v) {
  if (v === 'fast' || v === 'low' || v === 'tiny' || v === 'small') return 'bench-good';
  if (v === 'ok'   || v === 'medium' || v === 'medium+')            return 'bench-med';
  if (v === 'slow' || v === 'high'   || v === 'large')              return 'bench-bad';
  return 'bench-na';
}

function benchLabel(v) {
  const map = {
    fast:'быстро', ok:'умеренно', slow:'медленно', '—':'—',
    low:'низкие', medium:'средние', high:'высокие',
    tiny:'крошечный', small:'малый', 'medium+':'средний+', large:'большой',
  };
  return map[v] || v;
}

function buildBenchmarks() {
  const root = document.getElementById('bench-content');

  const meth = document.createElement('div');
  meth.className = 'bench-section';
  meth.innerHTML = `<h3 style="color:var(--teal)">Методология замеров</h3>
    <div class="bench-method-card">
      <h4>Как запустить</h4>
      <ol>
        <li>Создать схему: <code>\\i sql/schema.sql</code></li>
        <li>Загрузить данные: <code>\\i sql/seed.sql</code> — 1M users, 500K books, 2M orders (≈15 мин)</li>
        <li>Создать индексы: <code>\\i sql/indexes.sql</code> — все 6 типов + варианты</li>
        <li>Замерить: <code>\\i benchmarks/queries.sql</code> — <code>EXPLAIN (ANALYZE, BUFFERS)</code></li>
      </ol>
    </div>
    `;
  root.appendChild(meth);

  const matrixSec = document.createElement('div');
  matrixSec.className = 'bench-section';
  matrixSec.innerHTML = `<h3 style="color:var(--teal)">Сводная матрица производительности</h3>`;
  const wrap = document.createElement('div');
  wrap.className = 'bench-compare-wrap';
  const tbl = document.createElement('table');
  tbl.className = 'bench-compare';
  tbl.innerHTML = `<tr>
    <th>Тип индекса</th>
    <th>Равенство (=)</th>
    <th>Диапазон</th>
    <th>Сортировка</th>
    <th>Размер</th>
    <th>Сценарий применения</th>
  </tr>`;
  for (const r of BENCH_MATRIX) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="bench-idx-name">${r.type}</td>
      <td class="${benchClass(r.eq)}">${benchLabel(r.eq)}</td>
      <td class="${benchClass(r.range)}">${benchLabel(r.range)}</td>
      <td class="${benchClass(r.sort)}">${benchLabel(r.sort)}</td>
      <td class="${benchClass(r.size)}">${benchLabel(r.size)}</td>
      <td style="color:var(--text2);font-size:0.8rem">${r.useCase}</td>
    `;
    tbl.appendChild(tr);
  }
  wrap.appendChild(tbl);
  matrixSec.appendChild(wrap);
  root.appendChild(matrixSec);

  const realSec = document.createElement('div');
  realSec.className = 'bench-section';
  realSec.innerHTML = `<h3 style="color:var(--teal)">Реальные результаты измерений</h3>
    <div id="bench-real-content">
      <div class="bench-method-card" style="color:var(--text2)">
        Данные ещё не загружены. Запустите:
        <code style="display:block;margin-top:6px;background:var(--bg3);padding:6px 10px;border-radius:4px">
          cd collect_bench &amp;&amp; go mod tidy &amp;&amp; go run main.go
        </code>
        <span style="font-size:0.78rem;opacity:0.7">
          Откройте index.html через HTTP-сервер (не file://), чтобы fetch() сработал.
        </span>
      </div>
    </div>`;
  root.appendChild(realSec);

  fetch('data/results.json')
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(data => renderRealResults(data))
    .catch(() => { /* results.json not yet generated — placeholder stays */ });
}

function renderRealResults(data) {
  const container = document.getElementById('bench-real-content');
  if (!container || !data) return;

  const fmtMs = ms => ms < 0 ? '<span class="bench-na">ошибка</span>'
    : ms < 1    ? `<span class="bench-good">${ms.toFixed(2)} ms</span>`
    : ms < 50   ? `<span class="bench-good">${ms.toFixed(1)} ms</span>`
    : ms < 500  ? `<span class="bench-med">${ms.toFixed(0)} ms</span>`
    :              `<span class="bench-bad">${ms.toFixed(0)} ms</span>`;

  let html = `
    <div style="font-size:0.8rem;color:var(--text2);margin-bottom:12px">
      <span style="color:var(--green);font-weight:600">✓ Реальные данные загружены</span>
      &nbsp;·&nbsp; ${data.pg_version}
      &nbsp;·&nbsp; ${data.runs} прогона (медиана)
      &nbsp;·&nbsp; собрано ${new Date(data.collected_at).toLocaleString('ru')}
    </div>`;


  html += `<div class="bench-compare-wrap" style="margin-bottom:20px">
    <table class="bench-compare">
      <tr>
        <th>Сценарий</th>
        <th>Вариант</th>
        <th>Время (медиана)</th>
        <th>Примечание</th>
      </tr>`;

  for (const sc of data.scenarios) {
    const rowspan = sc.results.length;
    sc.results.forEach((r, i) => {
      html += `<tr>`;
      if (i === 0) html += `<td rowspan="${rowspan}" style="font-weight:600;color:var(--teal);vertical-align:top;padding-top:10px">${sc.title}</td>`;
      html += `<td style="font-family:monospace;font-size:0.8rem">${r.label}</td>
               <td>${fmtMs(r.ms)}</td>
               <td style="color:var(--text2);font-size:0.78rem">${r.note}</td>
             </tr>`;
    });
  }
  html += `</table></div>`;


  if (data.index_sizes && data.index_sizes.length > 0) {
    html += `<h4 style="margin-bottom:8px;color:var(--text2);font-size:0.85rem;text-transform:uppercase;letter-spacing:0.04em">Размеры индексов</h4>
      <div class="bench-compare-wrap" style="margin-bottom:20px">
        <table class="bench-compare">
          <tr><th>Индекс</th><th>Размер</th></tr>`;
    for (const s of data.index_sizes) {
      html += `<tr>
        <td style="font-family:monospace;font-size:0.8rem;color:var(--text)">${s.name}</td>
        <td style="font-weight:600;color:var(--blue-light)">${s.pretty}</td>
      </tr>`;
    }
    html += `</table></div>`;
  }


  if (data.dml && data.dml.length > 0) {
    html += `<h4 style="margin-bottom:8px;color:var(--text2);font-size:0.85rem;text-transform:uppercase;letter-spacing:0.04em">DML overhead</h4>
      <div class="bench-compare-wrap">
        <table class="bench-compare">
          <tr><th>Операция</th><th>Со всеми индексами</th></tr>`;
    for (const d of data.dml) {
      html += `<tr>
        <td style="font-weight:600">${d.op}</td>
        <td>${fmtMs(d.with_idx_ms)}</td>
      </tr>`;
    }
    html += `</table></div>`;
  }

  container.innerHTML = html;
}
