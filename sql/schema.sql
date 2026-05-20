CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;
CREATE EXTENSION IF NOT EXISTS btree_gist;

DROP TABLE IF EXISTS user_sessions    CASCADE;
DROP TABLE IF EXISTS reviews          CASCADE;
DROP TABLE IF EXISTS order_items      CASCADE;
DROP TABLE IF EXISTS orders           CASCADE;
DROP TABLE IF EXISTS stock            CASCADE;
DROP TABLE IF EXISTS warehouses       CASCADE;
DROP TABLE IF EXISTS book_categories  CASCADE;
DROP TABLE IF EXISTS book_authors     CASCADE;
DROP TABLE IF EXISTS books            CASCADE;
DROP TABLE IF EXISTS categories       CASCADE;
DROP TABLE IF EXISTS authors          CASCADE;
DROP TABLE IF EXISTS users            CASCADE;

CREATE TABLE users (
    id             BIGSERIAL PRIMARY KEY,
    email          TEXT          NOT NULL UNIQUE,
    full_name      TEXT          NOT NULL,
    registered_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    is_active      BOOLEAN       NOT NULL DEFAULT TRUE
);

CREATE TABLE authors (
    id          BIGSERIAL PRIMARY KEY,
    full_name   TEXT NOT NULL,
    biography   TEXT,
    birth_date  DATE,
    country     TEXT
);

CREATE TABLE categories (
    id         BIGSERIAL PRIMARY KEY,
    parent_id  BIGINT REFERENCES categories(id) ON DELETE SET NULL,
    name       TEXT NOT NULL
);

CREATE TABLE books (
    id               BIGSERIAL PRIMARY KEY,
    isbn             TEXT          NOT NULL UNIQUE,
    title            TEXT          NOT NULL,
    description      TEXT,
    publication_year SMALLINT,
    pages            INT,
    price            NUMERIC(10,2) NOT NULL,
    tags             TEXT[]        NOT NULL DEFAULT '{}',
    metadata         JSONB         NOT NULL DEFAULT '{}'::jsonb,
    fts              tsvector      GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(description, '')), 'B')
    ) STORED
);

CREATE TABLE book_authors (
    book_id    BIGINT NOT NULL REFERENCES books(id)   ON DELETE CASCADE,
    author_id  BIGINT NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
    PRIMARY KEY (book_id, author_id)
);

CREATE TABLE book_categories (
    book_id      BIGINT NOT NULL REFERENCES books(id)      ON DELETE CASCADE,
    category_id  BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (book_id, category_id)
);

CREATE TABLE warehouses (
    id        BIGSERIAL PRIMARY KEY,
    name      TEXT NOT NULL,
    location  POINT NOT NULL,
    capacity  INT   NOT NULL
);

CREATE TABLE stock (
    book_id       BIGINT NOT NULL REFERENCES books(id)      ON DELETE CASCADE,
    warehouse_id  BIGINT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    quantity      INT    NOT NULL CHECK (quantity >= 0),
    PRIMARY KEY (book_id, warehouse_id)
);

CREATE TABLE orders (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status        TEXT          NOT NULL
                   CHECK (status IN ('new','paid','shipped','completed','cancelled')),
    total_amount  NUMERIC(12,2) NOT NULL,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
    id          BIGSERIAL PRIMARY KEY,
    order_id    BIGINT        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    book_id     BIGINT        NOT NULL REFERENCES books(id)  ON DELETE RESTRICT,
    quantity    INT           NOT NULL CHECK (quantity > 0),
    unit_price  NUMERIC(10,2) NOT NULL
);

CREATE TABLE reviews (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id       BIGINT   NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    rating        SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    text          TEXT,
    is_published  BOOLEAN  NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_sessions (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip          INET   NOT NULL,
    started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_agent  TEXT
);

ANALYZE;
