# Курсовая работа по базам данных

**Тема:** Сравнительный анализ механизмов индексации в PostgreSQL  
**Предметная область:** Онлайн-магазин книг (12 таблиц, 6 типов индексов)

Подробное описание модели и программных решений — в [description.md](description.md).

---

## Требования

| Инструмент | Версия | Где скачать |
|---|---|---|
| PostgreSQL | 17 или 18 | [postgresql.org/download](https://www.postgresql.org/download/) |
| Go | 1.22+ | [go.dev/dl](https://go.dev/dl/) |
| Python | любая | нужен только для локального сервера (обычно уже установлен) |

---

## Структура проекта

```
database_coursework/
├── description.md         — описание модели данных и программных решений
├── sql/
│   ├── schema.sql         — создание 12 таблиц
│   ├── seed.sql           — тестовые данные: 1M users, 500K books, 2M orders
│   └── indexes.sql        — создание всех индексов (B-tree, Hash, GiST, SP-GiST, GIN, BRIN)
├── benchmarks/
│   └── queries.sql        — EXPLAIN ANALYZE запросы для ручного запуска
├── collect_bench/
│   └── main.go            — Go-программа: запускает бенчмарки → results.json
└── frontend/
    └── index.html         — веб-интерфейс (ER, SOM, реляционная модель, индексы, бенчмарки)
```

---

## Запуск

### Шаг 0 — Открыть командную строку

Откройте **командную строку** (cmd) в папке проекта. Все команды ниже выполняются в ней.

---

### Шаг 1 — Создать базу данных

```cmd
psql -U postgres -c "CREATE DATABASE bookstore;"
```

Проверка (в списке должна появиться `bookstore`):
```cmd
psql -U postgres -l
```

---

### Шаг 2 — Создать схему таблиц

Перейдите в папку проекта, затем:

```cmd
psql -U postgres -d bookstore -f sql/schema.sql
```

Создаст 12 таблиц и нужные расширения. Занимает несколько секунд.

---

### Шаг 3 — Загрузить тестовые данные

```cmd
psql -U postgres -d bookstore -f sql/seed.sql
```

Загружает около 8 миллионов строк суммарно.

После завершения можно проверить, что данные на месте:
```cmd
psql -U postgres -d bookstore -c "SELECT relname, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC LIMIT 6;"
```

---

### Шаг 4 — Создать индексы

```cmd
psql -U postgres -d bookstore -f sql/indexes.sql
```

Строит 18 индексов всех типов.

---

### Шаг 5 — Запустить бенчмарки (Go-программа)

```cmd
cd collect_bench
go mod tidy
go run main.go -dsn "postgres://postgres:ВАШ_ПАРОЛЬ@localhost/bookstore?sslmode=disable"
cd ..
```

Замените `ВАШ_ПАРОЛЬ` на пароль, указанный при установке PostgreSQL.

```cmd
set DATABASE_URL=postgres://postgres:ВАШ_ПАРОЛЬ@localhost/bookstore?sslmode=disable
cd collect_bench
go run main.go
cd ..
```

Программа запустится, выведет прогресс в консоль и сохранит результаты в `frontend/data/results.json`.

Дополнительные параметры:

| Параметр | По умолчанию | Что делает |
|---|---|---|
| `-runs 5` | 3 | Увеличить число прогонов для точнее медианы |
| `-out путь` | `../frontend/data/results.json` | Куда сохранить результаты |

---

### Шаг 6 — Открыть веб-интерфейс


**Через Python:**
```cmd
cd frontend
python -m http.server 8080
```
Затем откройте в браузере: **http://localhost:8080**

**Через VS Code:** установите расширение **Live Server** → правой кнопкой по `frontend/index.html` → **Open with Live Server**.

На вкладке **«Бенчмарки»** реальные результаты подтянутся автоматически из `results.json`.

---

## Быстрый старт (все шаги одной вставкой)

**Windows (cmd):**
```cmd
set PGPASSWORD=ВАШ_ПАРОЛЬ
```

```cmd
psql -U postgres -c "CREATE DATABASE bookstore;"
psql -U postgres -d bookstore -f sql/schema.sql
psql -U postgres -d bookstore -f sql/seed.sql
psql -U postgres -d bookstore -f sql/indexes.sql

cd collect_bench
go mod tidy
go run main.go -dsn "postgres://postgres:ПАРОЛЬ@localhost/bookstore?sslmode=disable"
cd ..

cd frontend
python -m http.server 8080
```
