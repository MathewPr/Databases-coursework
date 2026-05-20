\timing on

DROP INDEX IF EXISTS idx_btree_orders_created_at;
DROP INDEX IF EXISTS idx_btree_orders_status;
DROP INDEX IF EXISTS idx_btree_books_price;
DROP INDEX IF EXISTS idx_btree_reviews_rating;
DROP INDEX IF EXISTS idx_btree_users_registered_at;

DROP INDEX IF EXISTS idx_hash_orders_user_id;
DROP INDEX IF EXISTS idx_hash_order_items_book_id;

DROP INDEX IF EXISTS idx_gist_warehouses_location;
DROP INDEX IF EXISTS idx_gist_books_title_trgm;
DROP INDEX IF EXISTS idx_gist_reviews_text_trgm;

DROP INDEX IF EXISTS idx_spgist_sessions_ip;
DROP INDEX IF EXISTS idx_spgist_warehouses_location;

DROP INDEX IF EXISTS idx_gin_books_fts;
DROP INDEX IF EXISTS idx_gin_books_tags;
DROP INDEX IF EXISTS idx_gin_books_metadata;
DROP INDEX IF EXISTS idx_gin_reviews_fts;

DROP INDEX IF EXISTS idx_brin_orders_created_at;
DROP INDEX IF EXISTS idx_brin_sessions_started_at;

\echo '=== [1] B-TREE ==='

CREATE INDEX idx_btree_orders_created_at
    ON orders (created_at DESC);

CREATE INDEX idx_btree_orders_status
    ON orders (status);

CREATE INDEX idx_btree_books_price
    ON books (price);

CREATE INDEX idx_btree_reviews_rating
    ON reviews (rating);

CREATE INDEX idx_btree_users_registered_at
    ON users (registered_at);

\echo '=== [2] HASH ==='

CREATE INDEX idx_hash_orders_user_id
    ON orders USING hash (user_id);

CREATE INDEX idx_hash_order_items_book_id
    ON order_items USING hash (book_id);

\echo '=== [3] GiST ==='

CREATE INDEX idx_gist_warehouses_location
    ON warehouses USING gist (location);

CREATE INDEX idx_gist_books_title_trgm
    ON books USING gist (title gist_trgm_ops);

CREATE INDEX idx_gist_reviews_text_trgm
    ON reviews USING gist (text gist_trgm_ops);

\echo '=== [4] SP-GiST ==='

CREATE INDEX idx_spgist_sessions_ip
    ON user_sessions USING spgist (ip);

CREATE INDEX idx_spgist_warehouses_location
    ON warehouses USING spgist (location);

\echo '=== [5] GIN ==='

CREATE INDEX idx_gin_books_fts
    ON books USING gin (fts);

CREATE INDEX idx_gin_books_tags
    ON books USING gin (tags);

CREATE INDEX idx_gin_books_metadata
    ON books USING gin (metadata);

CREATE INDEX idx_gin_reviews_fts
    ON reviews USING gin (
        to_tsvector('simple', coalesce(text, ''))
    );

\echo '=== [6] BRIN ==='

CREATE INDEX idx_brin_orders_created_at
    ON orders USING brin (created_at)
    WITH (pages_per_range = 128);

CREATE INDEX idx_brin_sessions_started_at
    ON user_sessions USING brin (started_at)
    WITH (pages_per_range = 64);

\echo '=== Размеры индексов ==='

SELECT
    i.indexname                          AS index_name,
    i.tablename                          AS table_name,
    am.amname                            AS index_type,
    pg_size_pretty(pg_relation_size(
        (i.schemaname || '.' || i.indexname)::regclass
    ))                                   AS index_size,
    pg_relation_size(
        (i.schemaname || '.' || i.indexname)::regclass
    )                                    AS size_bytes
FROM
    pg_indexes i
    JOIN pg_class c  ON c.relname = i.indexname
    JOIN pg_am    am ON am.oid = c.relam
WHERE
    i.schemaname = 'public'
    AND i.indexname NOT IN (
        'users_pkey', 'users_email_key',
        'authors_pkey',
        'categories_pkey',
        'books_pkey', 'books_isbn_key',
        'book_authors_pkey',
        'book_categories_pkey',
        'warehouses_pkey',
        'stock_pkey',
        'orders_pkey',
        'order_items_pkey',
        'reviews_pkey',
        'user_sessions_pkey'
    )
ORDER BY size_bytes DESC;

SELECT
    am.amname                            AS index_type,
    count(*)                             AS count,
    pg_size_pretty(sum(pg_relation_size(
        (i.schemaname || '.' || i.indexname)::regclass
    )))                                  AS total_size
FROM
    pg_indexes i
    JOIN pg_class c  ON c.relname = i.indexname
    JOIN pg_am    am ON am.oid = c.relam
WHERE
    i.schemaname = 'public'
    AND i.indexname LIKE 'idx_%'
GROUP BY am.amname
ORDER BY sum(pg_relation_size(
    (i.schemaname || '.' || i.indexname)::regclass
)) DESC;

\timing off
