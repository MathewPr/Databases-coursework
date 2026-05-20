\timing on

\echo ''
\echo '============================================================'
\echo ' §0  Размеры таблиц и индексов'
\echo '============================================================'

SELECT
    t.relname                                     AS table_name,
    pg_size_pretty(pg_relation_size(t.oid))       AS heap_size,
    pg_size_pretty(pg_indexes_size(t.oid))        AS indexes_size,
    pg_size_pretty(pg_total_relation_size(t.oid)) AS total_size,
    t.reltuples::bigint                           AS approx_rows
FROM pg_class t
WHERE t.relkind = 'r'
  AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY pg_total_relation_size(t.oid) DESC;

SELECT
    i.indexname                          AS index_name,
    i.tablename                          AS table_name,
    am.amname                            AS index_type,
    pg_size_pretty(pg_relation_size(
        (i.schemaname || '.' || i.indexname)::regclass
    ))                                   AS index_size,
    ix.indisunique                       AS is_unique,
    ix.indisprimary                      AS is_primary
FROM pg_indexes i
    JOIN pg_class c  ON c.relname = i.indexname
    JOIN pg_am    am ON am.oid = c.relam
    JOIN pg_index ix ON ix.indexrelid = c.oid
WHERE i.schemaname = 'public'
ORDER BY pg_relation_size(
    (i.schemaname || '.' || i.indexname)::regclass
) DESC;


\echo ''
\echo '============================================================'
\echo ' §1  B-TREE — диапазонный поиск по orders.created_at'
\echo '============================================================'

SELECT pg_stat_reset_shared('bgwriter');

SET enable_indexscan  = off;
SET enable_bitmapscan = off;
SET enable_seqscan    = on;

\echo '--- 1.1 Sequential Scan'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT order_id, user_id, status, total_amount, created_at
FROM orders
WHERE created_at BETWEEN '2023-01-01' AND '2023-03-31';

SET enable_seqscan    = off;
SET enable_bitmapscan = off;
SET enable_indexscan  = on;

\echo '--- 1.2 B-tree Index Scan'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT order_id, user_id, status, total_amount, created_at
FROM orders
WHERE created_at BETWEEN '2023-01-01' AND '2023-03-31';

\echo '--- 1.3 B-tree + ORDER BY'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT order_id, created_at, total_amount
FROM orders
WHERE created_at > '2024-06-01'
ORDER BY created_at DESC
LIMIT 100;

RESET enable_seqscan;
RESET enable_bitmapscan;
RESET enable_indexscan;


\echo ''
\echo '============================================================'
\echo ' §2  HASH vs B-TREE — точечный поиск orders.user_id'
\echo '============================================================'

\echo '--- 2.1 Hash Index Scan'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT order_id, status, created_at
FROM orders
WHERE user_id = 42000;

\echo '--- 2.2 B-tree Multicolumn'
SET enable_hashjoin = off;
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT order_id, status, created_at
FROM orders
WHERE user_id = 42000;
RESET enable_hashjoin;

\echo '--- 2.3 Hash + диапазон (планировщик отказывается от Hash)'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT order_id, status, created_at
FROM orders
WHERE user_id BETWEEN 42000 AND 42100;


\echo ''
\echo '============================================================'
\echo ' §3  GiST — геопространственный поиск на warehouses'
\echo '============================================================'

\echo '--- 3.1 GiST KNN'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT warehouse_id, name,
       location <-> point(37.62, 55.75) AS distance_degrees
FROM warehouses
ORDER BY location <-> point(37.62, 55.75)
LIMIT 5;

SET enable_indexscan  = off;
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

\echo '--- 3.3 GiST trigram: ILIKE нечёткий поиск'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT book_id, title, price
FROM books
WHERE title ILIKE '%война%'
LIMIT 20;


\echo ''
\echo '============================================================'
\echo ' §4  SP-GiST — поиск по IP-подсети (user_sessions.ip)'
\echo '============================================================'

\echo '--- 4.1 SP-GiST: WHERE ip << ''192.168.0.0/16'''
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT session_id, user_id, ip, started_at
FROM user_sessions
WHERE ip << '192.168.0.0/16'
LIMIT 100;

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

\echo '--- 4.3 SP-GiST: точечный поиск по IP'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT session_id, user_id, started_at
FROM user_sessions
WHERE ip = '10.0.1.100'::inet;


\echo ''
\echo '============================================================'
\echo ' §5  GIN — FTS / массивы / JSONB'
\echo '============================================================'

\echo '--- 5.1 GIN FTS: books.fts @@ to_tsquery'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT book_id, title, price
FROM books
WHERE fts @@ to_tsquery('simple', 'программирование')
ORDER BY ts_rank(fts, to_tsquery('simple', 'программирование')) DESC
LIMIT 20;

\echo '--- 5.2 GIN FTS с ранжированием по весу'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT book_id, title,
       ts_rank_cd(fts, q) AS rank
FROM books,
     to_tsquery('simple', 'база & данных') q
WHERE fts @@ q
ORDER BY rank DESC
LIMIT 10;

\echo '--- 5.3 GIN array: WHERE tags @> ARRAY[''python'']'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT book_id, title, tags
FROM books
WHERE tags @> ARRAY['python']
LIMIT 20;

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

\echo '--- 5.5 GIN JSONB: WHERE metadata @> ''{\"edition\": 2}'''
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT book_id, title, metadata->>'edition' AS edition
FROM books
WHERE metadata @> '{"edition": 2}'::jsonb
LIMIT 20;

\echo '--- 5.6 GIN JSONB: WHERE metadata ? ''publisher'''
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT book_id, title, metadata->>'publisher' AS publisher
FROM books
WHERE metadata ? 'publisher'
LIMIT 20;


\echo ''
\echo '============================================================'
\echo ' §6  BRIN vs B-TREE — временной ряд orders.created_at'
\echo '============================================================'

\echo '--- 6.1 BRIN Bitmap Scan'
SET enable_seqscan   = off;
SET enable_indexscan = off;
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT count(*), min(total_amount), max(total_amount)
FROM orders
WHERE created_at BETWEEN '2023-01-01' AND '2023-12-31';
RESET enable_seqscan;
RESET enable_indexscan;

\echo '--- 6.2 B-tree Index Scan'
SET enable_seqscan    = off;
SET enable_bitmapscan = off;
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT count(*), min(total_amount), max(total_amount)
FROM orders
WHERE created_at BETWEEN '2023-01-01' AND '2023-12-31';
RESET enable_seqscan;
RESET enable_bitmapscan;

\echo '--- 6.3 Размер BRIN vs B-tree'
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

\echo '--- 6.4 BRIN на некоррелированных данных (деградация)'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_brin_orders_amount_demo
    ON orders USING brin (total_amount);

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT count(*) FROM orders WHERE total_amount BETWEEN 100 AND 200;

DROP INDEX IF EXISTS idx_brin_orders_amount_demo;


\echo ''
\echo '============================================================'
\echo ' §7  PARTIAL INDEXES — горячие подмножества'
\echo '============================================================'

\echo '--- 7.1 Partial B-tree: WHERE status = ''new'''
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT order_id, user_id, created_at, total_amount
FROM orders
WHERE status = 'new'
  AND created_at > now() - interval '90 days';

SET enable_indexscan = off;
\echo '--- 7.2 Полный B-tree(status): тот же запрос'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT order_id, user_id, created_at, total_amount
FROM orders
WHERE status = 'new'
  AND created_at > now() - interval '90 days';
RESET enable_indexscan;

\echo '--- 7.3 Размеры: partial vs полный индекс'
SELECT
    indexname,
    pg_size_pretty(pg_relation_size(
        ('public.' || indexname)::regclass
    )) AS size
FROM pg_indexes
WHERE tablename = 'orders'
  AND indexname IN ('idx_partial_orders_new', 'idx_btree_orders_status');

\echo '--- 7.4 Partial: опубликованные отзывы'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT review_id, rating, created_at
FROM reviews
WHERE is_published = TRUE
  AND book_id = 12345
ORDER BY rating DESC
LIMIT 10;


\echo ''
\echo '============================================================'
\echo ' §8  FUNCTIONAL INDEX — lower(email)'
\echo '============================================================'

\echo '--- 8.1 Functional Index: WHERE lower(email) = lower(''...'')'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT user_id, email, full_name
FROM users
WHERE lower(email) = lower('User42000@bookstore.example');

\echo '--- 8.2 UNIQUE B-tree: WHERE email = ''...'' (case-sensitive)'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT user_id, email, full_name
FROM users
WHERE email = 'user42000@bookstore.example';

SET enable_indexscan  = off;
SET enable_bitmapscan = off;
\echo '--- 8.3 Seq Scan: WHERE lower(email) = ... (без функц. индекса)'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT user_id, email, full_name
FROM users
WHERE lower(email) = 'user42000@bookstore.example';
RESET enable_indexscan;
RESET enable_bitmapscan;


\echo ''
\echo '============================================================'
\echo ' §9  COVERING INDEX — Index-Only Scan vs Heap Fetch'
\echo '============================================================'

\echo '--- 9.1 Covering (INCLUDE): Index-Only Scan'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT user_id, status, created_at, total_amount
FROM orders
WHERE user_id = 100000;

CREATE INDEX IF NOT EXISTS idx_plain_orders_user_id_demo ON orders (user_id);

SET enable_indexonlyscan = off;
\echo '--- 9.2 B-tree без INCLUDE: Index Scan + Heap Fetch'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT user_id, status, created_at, total_amount
FROM orders
WHERE user_id = 100000;
RESET enable_indexonlyscan;

DROP INDEX IF EXISTS idx_plain_orders_user_id_demo;

\echo '--- 9.3 Visibility map для orders'
SELECT relname, n_live_tup, n_dead_tup, last_vacuum, last_autovacuum
FROM pg_stat_user_tables
WHERE relname = 'orders';


\echo ''
\echo '============================================================'
\echo ' §10  MULTICOLUMN — правило левого префикса'
\echo '============================================================'

\echo '--- 10.1 Полный ключ (user_id, status)'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT order_id, created_at, total_amount
FROM orders
WHERE user_id = 55000
  AND status = 'paid';

\echo '--- 10.2 Левый префикс (только user_id)'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT order_id, status, created_at
FROM orders
WHERE user_id = 55000;

\echo '--- 10.3 Только правый ключ (только status) — индекс не используется'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT order_id, user_id, created_at
FROM orders
WHERE status = 'shipped';

\echo '--- 10.4 (book_id, rating DESC): ORDER BY без узла Sort'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT review_id, rating, text
FROM reviews
WHERE book_id = 1000
ORDER BY rating DESC
LIMIT 20;


\echo ''
\echo '============================================================'
\echo ' §11  DML OVERHEAD — стоимость поддержания индексов'
\echo '============================================================'

\echo '--- 11.1 INSERT одной строки (с текущими индексами)'
\timing on
INSERT INTO orders (user_id, status, total_amount, created_at, updated_at)
SELECT
    (random() * 999999 + 1)::bigint,
    'new',
    (random() * 5000)::numeric(12,2),
    now(),
    now();
\timing off

\echo '--- 11.2 Активность индексов orders'
SELECT
    indexrelname AS index_name,
    idx_scan     AS scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE relname = 'orders'
ORDER BY idx_scan DESC;

\echo '--- 11.3 Активность индексов books'
SELECT
    indexrelname  AS index_name,
    idx_scan      AS scans,
    idx_tup_read  AS tuples_read,
    idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE relname = 'books'
ORDER BY idx_scan DESC;

\echo '--- 11.4 Размеры GIN-индексов'
SELECT
    relname      AS table_name,
    indexrelname AS index_name,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE relname IN ('books', 'reviews')
ORDER BY pg_relation_size(indexrelid) DESC;


\echo ''
\echo '============================================================'
\echo ' §12  Итог: размеры всех индексов'
\echo '============================================================'

SELECT
    i.indexname                          AS index_name,
    i.tablename                          AS table_name,
    am.amname                            AS type,
    pg_size_pretty(pg_relation_size(
        (i.schemaname || '.' || i.indexname)::regclass
    ))                                   AS size,
    CASE WHEN ix.indisunique  THEN 'UNIQUE'   ELSE '' END ||
    CASE WHEN ix.indisprimary THEN '+PK'      ELSE '' END ||
    CASE WHEN ix.indpred IS NOT NULL THEN '+PARTIAL' ELSE '' END AS flags
FROM pg_indexes i
    JOIN pg_class c  ON c.relname = i.indexname
    JOIN pg_am    am ON am.oid = c.relam
    JOIN pg_index ix ON ix.indexrelid = c.oid
WHERE i.schemaname = 'public'
ORDER BY i.tablename,
         pg_relation_size((i.schemaname || '.' || i.indexname)::regclass) DESC;

\timing off
\echo ''
\echo '=== benchmarks/queries.sql выполнен ==='
