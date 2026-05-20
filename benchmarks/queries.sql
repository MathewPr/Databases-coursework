-- ============================================================================
-- Курсовая работа: сравнительный анализ механизмов индексации в PostgreSQL
-- Файл: benchmarks/queries.sql — замеры производительности по типам индексов.
--
-- Порядок запуска:
--   1. schema.sql  → 2. seed.sql  → 3. indexes.sql  → 4. ЭТОТфайл
--
-- Методология:
--   • EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) — реальный план выполнения.
--   • SET enable_seqscan = off  — форсируем использование индекса для сравнения.
--   • pg_stat_reset() + несколько прогонов — сбрасываем кеш статистики.
--   • shared_buffers кешируются — первый прогон (cold) медленнее.
--   • Все замеры выполняются в одной сессии; для prod-замеров нужен pgbench.
--
-- Структура файла:
--   §1  Размеры таблиц и индексов (базовая статистика)
--   §2  B-tree: диапазонный поиск vs BRIN
--   §3  Hash: точечный поиск vs B-tree
--   §4  GiST: геопоиск, триграммы
--   §5  SP-GiST: inet-подсети vs GiST
--   §6  GIN: FTS, массивы, JSONB
--   §7  BRIN: временной ряд, размер vs B-tree
--   §8  Partial: горячее подмножество
--   §9  Functional: регистронезависимый поиск
--   §10 Covering (INCLUDE): Index-Only Scan
--   §11 Multicolumn: левый префикс
--   §12 Сводная таблица характеристик
--   §13 Накладные расходы на запись
-- ============================================================================

\timing on

-- ============================================================================
-- §0  Утилиты — вспомогательные запросы
-- ============================================================================

\echo ''
\echo '============================================================'
\echo ' §0  Утилиты: размеры таблиц и индексов'
\echo '============================================================'

-- 0.1 Размеры таблиц (heap) и их индексов
SELECT
    t.relname                                     AS table_name,
    pg_size_pretty(pg_relation_size(t.oid))       AS heap_size,
    pg_size_pretty(pg_indexes_size(t.oid))        AS indexes_size,
    pg_size_pretty(pg_total_relation_size(t.oid)) AS total_size,
    t.reltuples::bigint                           AS approx_rows
FROM
    pg_class t
WHERE
    t.relkind = 'r'
    AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY
    pg_total_relation_size(t.oid) DESC;

-- 0.2 Все индексы с типом и размером
SELECT
    i.indexname                          AS index_name,
    i.tablename                          AS table_name,
    am.amname                            AS index_type,
    pg_size_pretty(pg_relation_size(
        (i.schemaname || '.' || i.indexname)::regclass
    ))                                   AS index_size,
    ix.indisunique                       AS is_unique,
    ix.indisprimary                      AS is_primary
FROM
    pg_indexes     i
    JOIN pg_class  c  ON c.relname = i.indexname
    JOIN pg_am     am ON am.oid = c.relam
    JOIN pg_index  ix ON ix.indexrelid = c.oid
WHERE
    i.schemaname = 'public'
ORDER BY
    pg_relation_size(
        (i.schemaname || '.' || i.indexname)::regclass
    ) DESC;


-- ============================================================================
-- §1  B-TREE: диапазонный поиск по дате заказа
-- ============================================================================
\echo ''
\echo '============================================================'
\echo ' §1  B-TREE — диапазонный поиск по orders.created_at'
\echo '============================================================'

-- Сбрасываем статистику буферов для чистого замера
SELECT pg_stat_reset_shared('bgwriter');

-- 1.1 Без индекса (Sequential Scan)
SET enable_indexscan  = off;
SET enable_bitmapscan = off;
SET enable_seqscan    = on;

\echo '--- 1.1 Sequential Scan (без B-tree и BRIN)'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT order_id, user_id, status, total_amount, created_at
FROM orders
WHERE created_at BETWEEN '2023-01-01' AND '2023-03-31';

-- 1.2 B-tree индекс (idx_btree_orders_created_at)
SET enable_seqscan    = off;
SET enable_bitmapscan = off;
SET enable_indexscan  = on;

\echo '--- 1.2 B-tree Index Scan (idx_btree_orders_created_at)'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT order_id, user_id, status, total_amount, created_at
FROM orders
WHERE created_at BETWEEN '2023-01-01' AND '2023-03-31';

-- 1.3 B-tree: ORDER BY без Seq Scan (Sort избегается)
\echo '--- 1.3 B-tree + ORDER BY (должен Index Scan без Sort)'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT order_id, created_at, total_amount
FROM orders
WHERE created_at > '2024-06-01'
ORDER BY created_at DESC
LIMIT 100;

-- Сбрасываем настройки планировщика
RESET enable_seqscan;
RESET enable_bitmapscan;
RESET enable_indexscan;


-- ============================================================================
-- §2  HASH vs B-TREE: точечный поиск по user_id
-- ============================================================================
\echo ''
\echo '============================================================'
\echo ' §2  HASH vs B-TREE — точечный поиск orders.user_id'
\echo '============================================================'

-- 2.1 Hash индекс (idx_hash_orders_user_id)
\echo '--- 2.1 Hash Index Scan (idx_hash_orders_user_id)'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT order_id, status, created_at
FROM orders
WHERE user_id = 42000;

-- 2.2 Принудительно B-tree через multicolumn (idx_multi_orders_user_status)
\echo '--- 2.2 B-tree Multicolumn (idx_multi_orders_user_status) — тот же user_id'
SET enable_hashjoin = off;
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT order_id, status, created_at
FROM orders
WHERE user_id = 42000;
RESET enable_hashjoin;

-- 2.3 Hash: диапазонный запрос (NOT SUPPORTED — демонстрация деградации)
\echo '--- 2.3 Hash + диапазон (планировщик должен отказаться от Hash)'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT order_id, status, created_at
FROM orders
WHERE user_id BETWEEN 42000 AND 42100;


-- ============================================================================
-- §3  GiST: геопространственный поиск (warehouses.location)
-- ============================================================================
\echo ''
\echo '============================================================'
\echo ' §3  GiST — геопространственный поиск на warehouses'
\echo '============================================================'

-- 3.1 KNN: 5 ближайших складов к точке (Москва ~55.75, 37.62)
\echo '--- 3.1 GiST KNN (k ближайших складов к точке)'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT warehouse_id, name,
       location <-> point(37.62, 55.75) AS distance_degrees
FROM warehouses
ORDER BY location <-> point(37.62, 55.75)
LIMIT 5;

-- 3.2 Без GiST — Sequential KNN
SET enable_indexscan = off;
SET enable_bitmapscan = off;
\echo '--- 3.2 Sequential KNN (без GiST)'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT warehouse_id, name,
       location <-> point(37.62, 55.75) AS distance_degrees
FROM warehouses
ORDER BY location <-> point(37.62, 55.75)
LIMIT 5;
RESET enable_indexscan;
RESET enable_bitmapscan;

-- 3.3 GiST vs GIN: триграммный поиск по названию книги
\echo '--- 3.3 GiST trigram: LIKE нечёткий поиск по books.title'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT book_id, title, price
FROM books
WHERE title ILIKE '%война%'
LIMIT 20;


-- ============================================================================
-- §4  SP-GiST: поиск по IP-подсети
-- ============================================================================
\echo ''
\echo '============================================================'
\echo ' §4  SP-GiST — поиск по IP-подсети (user_sessions.ip)'
\echo '============================================================'

-- 4.1 SP-GiST: сессии из подсети 192.168.x.x
\echo '--- 4.1 SP-GiST: WHERE ip << ''192.168.0.0/16'''
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT session_id, user_id, ip, started_at
FROM user_sessions
WHERE ip << '192.168.0.0/16'
LIMIT 100;

-- 4.2 SP-GiST vs Sequential (без индекса)
SET enable_indexscan  = off;
SET enable_bitmapscan = off;
\echo '--- 4.2 Sequential Scan: WHERE ip << ''192.168.0.0/16'''
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT session_id, user_id, ip, started_at
FROM user_sessions
WHERE ip << '192.168.0.0/16'
LIMIT 100;
RESET enable_indexscan;
RESET enable_bitmapscan;

-- 4.3 SP-GiST: точечный поиск по конкретному IP
\echo '--- 4.3 SP-GiST: точечный поиск WHERE ip = ''10.0.1.100'''
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT session_id, user_id, started_at
FROM user_sessions
WHERE ip = '10.0.1.100'::inet;


-- ============================================================================
-- §5  GIN: полнотекстовый поиск, массивы, JSONB
-- ============================================================================
\echo ''
\echo '============================================================'
\echo ' §5  GIN — FTS / массивы / JSONB'
\echo '============================================================'

-- 5.1 FTS: поиск по tsvector (idx_gin_books_fts)
\echo '--- 5.1 GIN FTS: books.fts @@ to_tsquery(''программирование'')'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT book_id, title, price
FROM books
WHERE fts @@ to_tsquery('simple', 'программирование')
ORDER BY ts_rank(fts, to_tsquery('simple', 'программирование')) DESC
LIMIT 20;

-- 5.2 FTS: ранжированный поиск (weight A > B)
\echo '--- 5.2 GIN FTS с ранжированием по весу'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT book_id, title,
       ts_rank_cd(fts, q) AS rank
FROM books,
     to_tsquery('simple', 'база & данных') q
WHERE fts @@ q
ORDER BY rank DESC
LIMIT 10;

-- 5.3 GIN array: поиск книг по тегу
\echo '--- 5.3 GIN array: WHERE tags @> ARRAY[''python'']'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT book_id, title, tags
FROM books
WHERE tags @> ARRAY['python']
LIMIT 20;

-- 5.4 GIN array vs Sequential (без индекса)
SET enable_indexscan  = off;
SET enable_bitmapscan = off;
\echo '--- 5.4 Sequential Scan: WHERE tags @> ARRAY[''python''] (без GIN)'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT book_id, title, tags
FROM books
WHERE tags @> ARRAY['python']
LIMIT 20;
RESET enable_indexscan;
RESET enable_bitmapscan;

-- 5.5 GIN JSONB: поиск по metadata
\echo '--- 5.5 GIN JSONB: WHERE metadata @> ''{\"edition\": 2}'''
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT book_id, title, metadata->>'edition' AS edition
FROM books
WHERE metadata @> '{"edition": 2}'::jsonb
LIMIT 20;

-- 5.6 GIN JSONB: поиск по вложенному ключу
\echo '--- 5.6 GIN JSONB: WHERE metadata ? ''publisher'''
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT book_id, title, metadata->>'publisher' AS publisher
FROM books
WHERE metadata ? 'publisher'
LIMIT 20;


-- ============================================================================
-- §6  BRIN vs B-TREE: временной ряд
-- ============================================================================
\echo ''
\echo '============================================================'
\echo ' §6  BRIN vs B-TREE — временной ряд orders.created_at'
\echo '============================================================'

-- 6.1 BRIN: Bitmap Index Scan
\echo '--- 6.1 BRIN Bitmap Scan (idx_brin_orders_created_at)'
SET enable_seqscan   = off;
SET enable_indexscan = off;  -- отключаем Index Scan чтобы увидеть Bitmap
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT count(*), min(total_amount), max(total_amount)
FROM orders
WHERE created_at BETWEEN '2023-01-01' AND '2023-12-31';
RESET enable_seqscan;
RESET enable_indexscan;

-- 6.2 B-tree: тот же запрос для сравнения
\echo '--- 6.2 B-tree Index Scan (idx_btree_orders_created_at)'
SET enable_seqscan = off;
-- Форсируем именно B-tree (отключаем bitmapscan чтобы не взял BRIN)
SET enable_bitmapscan = off;
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT count(*), min(total_amount), max(total_amount)
FROM orders
WHERE created_at BETWEEN '2023-01-01' AND '2023-12-31';
RESET enable_seqscan;
RESET enable_bitmapscan;

-- 6.3 Сравнение размеров BRIN vs B-tree
\echo '--- 6.3 Размер BRIN vs B-tree на orders.created_at'
SELECT
    indexname,
    pg_size_pretty(pg_relation_size(
        ('public.' || indexname)::regclass
    )) AS size,
    pg_relation_size(
        ('public.' || indexname)::regclass
    ) AS size_bytes
FROM pg_indexes
WHERE tablename = 'orders'
  AND indexname IN (
    'idx_brin_orders_created_at',
    'idx_btree_orders_created_at'
  )
ORDER BY size_bytes;

-- 6.4 BRIN на некоррелированных данных (демонстрация деградации)
\echo '--- 6.4 BRIN на total_amount (случайные данные — нет корреляции)'
-- Создаём временный BRIN для демонстрации
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_brin_orders_amount_demo
    ON orders USING brin (total_amount);

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT count(*) FROM orders WHERE total_amount BETWEEN 100 AND 200;

DROP INDEX IF EXISTS idx_brin_orders_amount_demo;


-- ============================================================================
-- §7  PARTIAL: горячее подмножество vs полный индекс
-- ============================================================================
\echo ''
\echo '============================================================'
\echo ' §7  PARTIAL INDEXES — горячие подмножества'
\echo '============================================================'

-- 7.1 Partial: новые заказы (только ~5% строк)
\echo '--- 7.1 Partial B-tree: WHERE status = ''new'' AND created_at > ...'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT order_id, user_id, created_at, total_amount
FROM orders
WHERE status = 'new'
  AND created_at > now() - interval '90 days';

-- 7.2 Тот же запрос через полный B-tree (idx_btree_orders_status)
\echo '--- 7.2 Полный B-tree(status): тот же запрос'
SET enable_indexscan = off;  -- отключаем partial, заставляем взять полный
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT order_id, user_id, created_at, total_amount
FROM orders
WHERE status = 'new'
  AND created_at > now() - interval '90 days';
RESET enable_indexscan;

-- 7.3 Размеры: partial vs полный индекс
\echo '--- 7.3 Размеры: partial(new) vs btree(status)'
SELECT
    indexname,
    pg_size_pretty(pg_relation_size(
        ('public.' || indexname)::regclass
    )) AS size
FROM pg_indexes
WHERE tablename = 'orders'
  AND indexname IN (
    'idx_partial_orders_new',
    'idx_btree_orders_status'
  );

-- 7.4 Partial: опубликованные отзывы
\echo '--- 7.4 Partial (is_published=TRUE): отзывы на книгу с рейтингом'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT review_id, rating, created_at
FROM reviews
WHERE is_published = TRUE
  AND book_id = 12345
ORDER BY rating DESC
LIMIT 10;


-- ============================================================================
-- §8  FUNCTIONAL: регистронезависимый поиск
-- ============================================================================
\echo ''
\echo '============================================================'
\echo ' §8  FUNCTIONAL INDEX — lower(email)'
\echo '============================================================'

-- 8.1 Поиск по lower(email) — использует функциональный индекс
\echo '--- 8.1 Functional Index: WHERE lower(email) = lower(''...'') '
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT user_id, email, full_name
FROM users
WHERE lower(email) = lower('User42000@bookstore.example');

-- 8.2 Тот же поиск по email без lower() — использует обычный UNIQUE
\echo '--- 8.2 UNIQUE B-tree (email_key): WHERE email = ''...'' (case-sensitive)'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT user_id, email, full_name
FROM users
WHERE email = 'user42000@bookstore.example';

-- 8.3 Без функционального индекса — планировщик делает Seq Scan
SET enable_indexscan  = off;
SET enable_bitmapscan = off;
\echo '--- 8.3 Seq Scan: WHERE lower(email) = ... (без функц. индекса)'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT user_id, email, full_name
FROM users
WHERE lower(email) = 'user42000@bookstore.example';
RESET enable_indexscan;
RESET enable_bitmapscan;


-- ============================================================================
-- §9  COVERING (INCLUDE): Index-Only Scan
-- ============================================================================
\echo ''
\echo '============================================================'
\echo ' §9  COVERING INDEX — Index-Only Scan vs Heap Fetch'
\echo '============================================================'

-- 9.1 Covering index — Index-Only Scan (не читает heap)
\echo '--- 9.1 Covering (INCLUDE): Index-Only Scan на orders WHERE user_id = X'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT user_id, status, created_at, total_amount
FROM orders
WHERE user_id = 100000;

-- 9.2 Без INCLUDE-колонок — Index Scan + Heap Fetch
\echo '--- 9.2 Без covering: B-tree(user_id) + Heap Fetch для status,created_at'
-- Временно создаём обычный индекс без INCLUDE для сравнения
CREATE INDEX IF NOT EXISTS idx_plain_orders_user_id_demo
    ON orders (user_id);

SET enable_indexonlyscan = off;  -- запрещаем Index-Only
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT user_id, status, created_at, total_amount
FROM orders
WHERE user_id = 100000;
RESET enable_indexonlyscan;

DROP INDEX IF EXISTS idx_plain_orders_user_id_demo;

-- 9.3 Видимость (visibility map) — ключевой фактор Index-Only Scan
\echo '--- 9.3 Состояние visibility map для orders'
SELECT
    relname,
    n_live_tup,
    n_dead_tup,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables
WHERE relname = 'orders';


-- ============================================================================
-- §10  MULTICOLUMN: правило левого префикса
-- ============================================================================
\echo ''
\echo '============================================================'
\echo ' §10  MULTICOLUMN — правило левого префикса'
\echo '============================================================'

-- 10.1 Полный ключ (user_id, status) — оба используются
\echo '--- 10.1 Multicolumn (user_id, status): WHERE user_id = X AND status = Y'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT order_id, created_at, total_amount
FROM orders
WHERE user_id = 55000
  AND status = 'paid';

-- 10.2 Левый префикс (только user_id) — индекс используется
\echo '--- 10.2 Multicolumn: левый префикс WHERE user_id = X (используется)'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT order_id, status, created_at
FROM orders
WHERE user_id = 55000;

-- 10.3 Правый ключ без левого (только status) — индекс НЕ используется
\echo '--- 10.3 Multicolumn: только RIGHT key WHERE status = Y (нет левого — Index Scan на btree_status)'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT order_id, user_id, created_at
FROM orders
WHERE status = 'shipped';

-- 10.4 Отзывы: (book_id, rating DESC) — сортировка без дополнительного Sort
\echo '--- 10.4 Multicolumn (book_id, rating DESC): ORDER BY без Sort узла'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT review_id, rating, text
FROM reviews
WHERE book_id = 1000
ORDER BY rating DESC
LIMIT 20;


-- ============================================================================
-- §11  НАКЛАДНЫЕ РАСХОДЫ НА ЗАПИСЬ (DML overhead)
-- ============================================================================
\echo ''
\echo '============================================================'
\echo ' §11  DML OVERHEAD — стоимость поддержания индексов'
\echo '============================================================'

-- 11.1 INSERT с отключёнными индексами (только heap write)
\echo '--- 11.1 Время INSERT одной строки (с текущими индексами)'
\timing on
INSERT INTO orders (user_id, status, total_amount, created_at, updated_at)
SELECT
    (random() * 999999 + 1)::bigint,
    'new',
    (random() * 5000)::numeric(12,2),
    now(),
    now();
\timing off

-- 11.2 Статистика по индексам: сколько обновлений прошло через каждый
\echo '--- 11.2 pg_stat_user_indexes: активность индексов orders'
SELECT
    indexrelname          AS index_name,
    idx_scan              AS scans,
    idx_tup_read          AS tuples_read,
    idx_tup_fetch         AS tuples_fetched
FROM pg_stat_user_indexes
WHERE relname = 'orders'
ORDER BY idx_scan DESC;

-- 11.3 pg_stat_user_indexes: books (GIN-тяжёлые индексы)
\echo '--- 11.3 pg_stat_user_indexes: активность индексов books'
SELECT
    indexrelname          AS index_name,
    idx_scan              AS scans,
    idx_tup_read          AS tuples_read,
    idx_tup_fetch         AS tuples_fetched
FROM pg_stat_user_indexes
WHERE relname = 'books'
ORDER BY idx_scan DESC;

-- 11.4 GIN pending list — незаписанные изменения GIN
\echo '--- 11.4 GIN pending list (незаписанные данные)'
SELECT
    relname           AS table_name,
    indexrelname      AS index_name,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE relname IN ('books', 'reviews')
ORDER BY pg_relation_size(indexrelid) DESC;


-- ============================================================================
-- §12  СВОДНАЯ ТАБЛИЦА ХАРАКТЕРИСТИК ТИПОВ ИНДЕКСОВ
-- ============================================================================
\echo ''
\echo '============================================================'
\echo ' §12  Сводная таблица: характеристики типов индексов'
\echo '============================================================'

-- Итоговая аналитическая сводка
SELECT * FROM (VALUES
    ('B-tree',
     'Равенство, диапазон, LIKE prefix%, NULL, сортировка',
     'Общий случай: числа, строки, даты',
     'Нечёткий поиск, массивы, геометрия, FTS',
     'Balanced tree O(log n)'),
    ('Hash',
     'Только равенство (=)',
     'Большие JOIN по = при высокой кардинальности',
     'Диапазоны, сортировка, NULL, UNIQUE',
     'Hash table O(1) eq'),
    ('GiST',
     'Геометрия, диапазоны, inet, тригр., FTS',
     'Геопоиск, KNN, перекрытие диапазонов',
     'Обычные скалярные типы; lossy (recheck)',
     'Balanced tree, operator class'),
    ('SP-GiST',
     'Inet prefix, point kd-tree, text radix',
     'IP-подсети, несбалансированные пространства',
     'Не multicolumn; ограниченные типы',
     'Space-partitioned, unbalanced'),
    ('GIN',
     'FTS (@@ tsquery), массивы (@>), JSONB (@>/?)',
     'Инвертированные структуры: FTS, теги, JSON',
     'Slow INSERT (pending list); нет сортировки/KNN',
     'Inverted index, posting list'),
    ('BRIN',
     'Диапазоны при физической корреляции',
     'Огромные монотонные таблицы (time series)',
     'Только коррелированные данные; Bitmap+recheck',
     'Block range min/max, tiny'),
    ('Partial',
     'Любой поддерживаемый метод доступа',
     'Горячее подмножество (<10-20% строк)',
     'Запрос должен содержать точное WHERE-условие',
     'WHERE predicate, smaller'),
    ('Functional',
     'Любой метод доступа на выражении',
     'lower(col), date_trunc, вычисляемые поля',
     'Выражение должно быть IMMUTABLE',
     'Expression B-tree / GIN'),
    ('INCLUDE',
     'B-tree поиск + Index-Only Scan для payload',
     'SELECT col1, col2 WHERE indexed_col = X',
     'Нет multicolumn; только B-tree/GiST',
     'Covering, leaf payload'),
    ('Multicolumn',
     'Левый префикс ключа; все колонки одновременно',
     'Составные фильтры WHERE a=X AND b=Y',
     'Без левого ключа индекс не используется',
     'B-tree composite key')
) AS t(
    index_type,
    supported_operations,
    best_scenario,
    limitations,
    internal_structure
);


-- ============================================================================
-- §13  ИТОГОВЫЕ РАЗМЕРЫ ПОСЛЕ ВСЕХ ЗАМЕРОВ
-- ============================================================================
\echo ''
\echo '============================================================'
\echo ' §13  Итог: размеры всех индексов (финальная сводка)'
\echo '============================================================'

SELECT
    i.indexname                          AS index_name,
    i.tablename                          AS table_name,
    am.amname                            AS type,
    pg_size_pretty(pg_relation_size(
        (i.schemaname || '.' || i.indexname)::regclass
    ))                                   AS size,
    CASE WHEN ix.indisunique   THEN 'UNIQUE'   ELSE '' END ||
    CASE WHEN ix.indisprimary  THEN '+PK'      ELSE '' END ||
    CASE WHEN ix.indpred IS NOT NULL THEN '+PARTIAL' ELSE '' END
                                         AS flags
FROM
    pg_indexes     i
    JOIN pg_class  c  ON c.relname = i.indexname
    JOIN pg_am     am ON am.oid = c.relam
    JOIN pg_index  ix ON ix.indexrelid = c.oid
WHERE
    i.schemaname = 'public'
ORDER BY
    i.tablename,
    pg_relation_size(
        (i.schemaname || '.' || i.indexname)::regclass
    ) DESC;

\timing off
\echo ''
\echo '=== benchmarks/queries.sql выполнен ==='
