SELECT setseed(0.42);
\encoding UTF8

\echo '>>> Inserting users (1 000 000)...'
\timing on

INSERT INTO users (email, full_name, registered_at, is_active)
SELECT
    'user_' || i || '@example.com',
    'User ' || i,
    timestamp '2020-01-01' + (random() * interval '4 years'),
    (random() > 0.05)
FROM generate_series(1, 1000000) i;

\timing off

\echo '>>> Inserting authors (10 000)...'
\timing on

INSERT INTO authors (full_name, biography, birth_date, country)
SELECT
    'Author ' || i || ' ' || substr(md5(i::text), 1, 6),
    CASE WHEN random() > 0.3 THEN
        'Biography text for author ' || i || '. ' ||
        repeat(substr(md5((i*7)::text), 1, 32) || ' ', 5)
    ELSE NULL END,
    date '1940-01-01' + (random() * interval '60 years'),
    (ARRAY['Russia','USA','UK','Germany','France','Japan',
           'China','Spain','Italy','Brazil'])[1 + (random()*9)::int]
FROM generate_series(1, 10000) i;

\timing off

\echo '>>> Inserting categories (200)...'
\timing on

INSERT INTO categories (id, parent_id, name)
SELECT i, NULL,
    (ARRAY['Fiction','Non-Fiction','Science','History','Biography',
           'Technology','Philosophy','Art','Cooking','Travel',
           'Children','Fantasy','Horror','Mystery','Romance',
           'Science Fiction','Self-Help','Business','Health','Sports'])[i]
FROM generate_series(1, 20) i;

SELECT setval('categories_id_seq', (SELECT max(id) FROM categories));

INSERT INTO categories (parent_id, name)
SELECT
    (random() * 19)::int + 1,
    'Subcategory ' || i || ' ' || substr(md5(i::text), 1, 4)
FROM generate_series(1, 180) i;

\timing off

\echo '>>> Inserting books (500 000)...'
\timing on

INSERT INTO books (isbn, title, description, publication_year, pages, price, tags, metadata)
SELECT
    lpad(i::text, 13, '978000000000'),
    (ARRAY['История','Тайна','Путь','Мир','Огонь','Вода','Небо','Земля','Время','Свет',
           'Тень','Голос','Сила','Память','Жизнь','Смерть','Любовь','Война','Мечта','Судьба']
    )[1 + (random()*19)::int]
    || ' '
    || (ARRAY['великого','тёмного','светлого','забытого','нового','старого','последнего',
              'первого','тихого','вечного'])[1 + (random()*9)::int]
    || ' '
    || (ARRAY['героя','мира','города','народа','времени','пути','сна','огня','слова','дня']
    )[1 + (random()*9)::int]
    || ' №' || i,
    CASE WHEN random() > 0.1 THEN
        'Описание книги ' || i || '. ' ||
        substr(md5(i::text), 1, 32) || ' ' || substr(md5((i+1)::text), 1, 32)
    ELSE NULL END,
    1950 + (random() * 74)::int,
    100 + (random() * 900)::int,
    round((50 + random() * 4950)::numeric, 2),
    ARRAY(
        SELECT DISTINCT t FROM (
            SELECT (ARRAY['fiction','sci-fi','history','romance','thriller',
                          'biography','science','philosophy','art','cooking',
                          'travel','children','fantasy','horror','mystery']
                   )[1 + (random()*14)::int] AS t
            FROM generate_series(1, 1 + (random()*3)::int)
        ) s
    ),
    jsonb_build_object(
        'publisher', 'Publisher ' || ((random()*49)::int + 1),
        'language',  (ARRAY['ru','en','de','fr','es','ja','zh'])[1 + (random()*6)::int],
        'edition',   (random()*5)::int + 1,
        'award',     CASE WHEN random() > 0.9 THEN true ELSE false END
    )
FROM generate_series(1, 500000) i;

\timing off

\echo '>>> Inserting book_authors...'
\timing on

INSERT INTO book_authors (book_id, author_id)
SELECT i, (random() * 9999)::bigint + 1
FROM generate_series(1, 500000) i;

INSERT INTO book_authors (book_id, author_id)
SELECT
    (random() * 499999)::bigint + 1,
    (random() * 9999)::bigint + 1
FROM generate_series(1, 200000)
ON CONFLICT DO NOTHING;

INSERT INTO book_authors (book_id, author_id)
SELECT
    (random() * 499999)::bigint + 1,
    (random() * 9999)::bigint + 1
FROM generate_series(1, 50000)
ON CONFLICT DO NOTHING;

\timing off

\echo '>>> Inserting book_categories...'
\timing on

INSERT INTO book_categories (book_id, category_id)
SELECT i, (random() * 199)::bigint + 1
FROM generate_series(1, 500000) i;

INSERT INTO book_categories (book_id, category_id)
SELECT
    (random() * 499999)::bigint + 1,
    (random() * 199)::bigint + 1
FROM generate_series(1, 200000)
ON CONFLICT DO NOTHING;

\timing off

\echo '>>> Inserting warehouses (20)...'

INSERT INTO warehouses (name, location, capacity)
VALUES
    ('Склад Москва-Центр',      point(55.7558, 37.6173),  50000),
    ('Склад Москва-Север',      point(55.8800, 37.6500),  35000),
    ('Склад Москва-Юг',         point(55.5800, 37.7500),  30000),
    ('Склад СПб-Центр',         point(59.9343, 30.3351),  40000),
    ('Склад СПб-Юг',            point(59.8600, 30.4500),  25000),
    ('Склад Новосибирск',       point(54.9833, 82.8964),  20000),
    ('Склад Екатеринбург',      point(56.8519, 60.6122),  18000),
    ('Склад Казань',            point(55.7887, 49.1221),  15000),
    ('Склад Нижний Новгород',   point(56.2965, 43.9361),  14000),
    ('Склад Самара',            point(53.2001, 50.1500),  12000),
    ('Склад Берлин',            point(52.5200, 13.4050),  22000),
    ('Склад Варшава',           point(52.2297, 21.0122),  16000),
    ('Склад Рига',              point(56.9460, 24.1059),  10000),
    ('Склад Минск',             point(53.9045, 27.5615),  12000),
    ('Склад Киев',              point(50.4501, 30.5234),  11000),
    ('Склад Прага',             point(50.0755, 14.4378),  13000),
    ('Склад Вена',              point(48.2082, 16.3738),  14000),
    ('Склад Амстердам',         point(52.3676,  4.9041),  18000),
    ('Склад Стокгольм',         point(59.3293, 18.0686),  15000),
    ('Склад Хельсинки',         point(60.1699, 24.9384),  11000);

\echo '>>> Inserting stock (200 000)...'
\timing on

INSERT INTO stock (book_id, warehouse_id, quantity)
SELECT DISTINCT ON (book_id, warehouse_id) book_id, warehouse_id, quantity
FROM (
    SELECT
        (random() * 499999)::bigint + 1 AS book_id,
        (random() * 19)::int + 1        AS warehouse_id,
        (random() * 500)::int           AS quantity
    FROM generate_series(1, 250000)
) s
ORDER BY book_id, warehouse_id
ON CONFLICT DO NOTHING;

\timing off

\echo '>>> Inserting orders (2 000 000)...'
\timing on

INSERT INTO orders (user_id, status, total_amount, created_at, updated_at)
SELECT
    (random() * 999999)::bigint + 1,
    CASE floor(random() * 100)::int
        WHEN 0  THEN 'new'
        WHEN 1  THEN 'new'
        WHEN 2  THEN 'new'
        WHEN 3  THEN 'new'
        WHEN 4  THEN 'new'
        WHEN 5  THEN 'paid'
        WHEN 6  THEN 'paid'
        WHEN 7  THEN 'paid'
        WHEN 8  THEN 'paid'
        WHEN 9  THEN 'paid'
        WHEN 10 THEN 'paid'
        WHEN 11 THEN 'paid'
        WHEN 12 THEN 'paid'
        WHEN 13 THEN 'paid'
        WHEN 14 THEN 'shipped'
        WHEN 15 THEN 'shipped'
        WHEN 16 THEN 'shipped'
        WHEN 17 THEN 'shipped'
        WHEN 18 THEN 'shipped'
        WHEN 19 THEN 'shipped'
        WHEN 20 THEN 'shipped'
        WHEN 21 THEN 'shipped'
        WHEN 22 THEN 'shipped'
        WHEN 23 THEN 'shipped'
        WHEN 24 THEN 'shipped'
        WHEN 25 THEN 'shipped'
        WHEN 26 THEN 'shipped'
        WHEN 27 THEN 'shipped'
        WHEN 28 THEN 'cancelled'
        WHEN 29 THEN 'cancelled'
        WHEN 30 THEN 'cancelled'
        WHEN 31 THEN 'cancelled'
        WHEN 32 THEN 'cancelled'
        ELSE 'completed'
    END,
    round((50 + random() * 9950)::numeric, 2),
    timestamp '2022-01-01' + (i - 1)::double precision / 2000000 * interval '3 years',
    timestamp '2022-01-01' + (i - 1)::double precision / 2000000 * interval '3 years'
                           + (random() * interval '7 days')
FROM generate_series(1, 2000000) i;

\timing off

\echo '>>> Inserting order_items (3 000 000)...'
\timing on

INSERT INTO order_items (order_id, book_id, quantity, unit_price)
SELECT
    i,
    (random() * 499999)::bigint + 1,
    (random() * 4)::int + 1,
    round((50 + random() * 4950)::numeric, 2)
FROM generate_series(1, 2000000) i
UNION ALL
SELECT
    (random() * 1999999)::bigint + 1,
    (random() * 499999)::bigint + 1,
    (random() * 4)::int + 1,
    round((50 + random() * 4950)::numeric, 2)
FROM generate_series(1, 800000)
UNION ALL
SELECT
    (random() * 1999999)::bigint + 1,
    (random() * 499999)::bigint + 1,
    (random() * 4)::int + 1,
    round((50 + random() * 4950)::numeric, 2)
FROM generate_series(1, 200000);

\timing off

\echo '>>> Inserting reviews (500 000)...'
\timing on

INSERT INTO reviews (user_id, book_id, rating, text, is_published, created_at)
SELECT
    (random() * 999999)::bigint + 1,
    (random() * 499999)::bigint + 1,
    (random() * 4)::int + 1,
    CASE WHEN random() > 0.2 THEN
        'Отзыв на книгу. ' ||
        (ARRAY['Отличная книга.','Рекомендую всем.','Не понравилось.',
               'Шедевр литературы.','Интересный сюжет.','Слабая работа.',
               'Прочитал за один день.','Перечитаю ещё раз.'])[1+(random()*7)::int]
        || ' ' || substr(md5(i::text), 1, 64)
    ELSE NULL END,
    (random() > 0.15),
    timestamp '2022-01-01' + (random() * interval '3 years')
FROM generate_series(1, 500000) i;

\timing off

\echo '>>> Inserting user_sessions (2 000 000)...'
\timing on

INSERT INTO user_sessions (user_id, ip, started_at, user_agent)
SELECT
    (random() * 999999)::bigint + 1,
    CASE floor(random() * 10)::int
        WHEN 0 THEN ('91.108.'  || floor(random()*256)::text || '.' || floor(random()*256)::text)::inet
        ELSE
            CASE floor(random() * 3)::int
                WHEN 0 THEN ('192.168.' || floor(random()*256)::text || '.' || floor(random()*256)::text)::inet
                WHEN 1 THEN ('10.'      || floor(random()*256)::text || '.' || floor(random()*256)::text || '.' || floor(random()*256)::text)::inet
                ELSE        ('172.16.'  || floor(random()*16)::text  || '.' || floor(random()*256)::text)::inet
            END
    END,
    timestamp '2022-01-01' + (random() * interval '3 years'),
    (ARRAY['Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
           'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
           'Mozilla/5.0 (X11; Linux x86_64)',
           'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0)',
           'Mozilla/5.0 (Android 12; Mobile)'])[1 + (random()*4)::int]
FROM generate_series(1, 2000000) i;

\timing off

\echo '>>> Running VACUUM ANALYZE...'
VACUUM ANALYZE users;
VACUUM ANALYZE authors;
VACUUM ANALYZE categories;
VACUUM ANALYZE books;
VACUUM ANALYZE book_authors;
VACUUM ANALYZE book_categories;
VACUUM ANALYZE warehouses;
VACUUM ANALYZE stock;
VACUUM ANALYZE orders;
VACUUM ANALYZE order_items;
VACUUM ANALYZE reviews;
VACUUM ANALYZE user_sessions;

\echo '>>> Seed complete.'
SELECT schemaname, relname, n_live_tup AS rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;
