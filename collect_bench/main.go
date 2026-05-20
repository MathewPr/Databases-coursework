// collect_bench — запускает EXPLAIN ANALYZE по каждому типу индекса и
// записывает результаты в frontend/data/results.json.
//
// Использование:
//   cd collect_bench
//   go mod tidy
//   go run main.go [-dsn "postgres://postgres:pass@localhost/bookstore?sslmode=disable"] [-runs 3]
//
// Переменная окружения DATABASE_URL используется, если флаг -dsn не задан.

package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"math"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

// reExecTime matches "Execution Time: 123.456 ms" in EXPLAIN ANALYZE output.
var reExecTime = regexp.MustCompile(`Execution Time:\s+([\d.]+)\s+ms`)

// ─── Output JSON types ────────────────────────────────────────────────────────

type MeasuredRow struct {
	Label string  `json:"label"`
	Ms    float64 `json:"ms"`   // median execution time; -1 if measurement failed
	Note  string  `json:"note"`
}

type ScenarioOut struct {
	ID      string        `json:"id"`
	Title   string        `json:"title"`
	Results []MeasuredRow `json:"results"`
}

type IndexSize struct {
	Name   string `json:"name"`
	Pretty string `json:"pretty"`
	Bytes  int64  `json:"bytes"`
}

type DMLRow struct {
	Op        string  `json:"op"`
	WithIdxMs float64 `json:"with_idx_ms"`
}

type Report struct {
	CollectedAt string        `json:"collected_at"`
	PgVersion   string        `json:"pg_version"`
	Runs        int           `json:"runs"`
	Scenarios   []ScenarioOut `json:"scenarios"`
	IndexSizes  []IndexSize   `json:"index_sizes"`
	DML         []DMLRow      `json:"dml"`
}

// ─── Scenario definitions ─────────────────────────────────────────────────────

type variant struct {
	label string
	setup []string // SET commands before EXPLAIN ANALYZE
	query string
	note  string
}

type scenario struct {
	id       string
	title    string
	variants []variant
}

var scenarios = []scenario{
	{
		id:    "brin_vs_btree",
		title: "§1 B-tree vs BRIN: временной ряд",
		variants: []variant{
			{
				label: "Seq Scan",
				setup: []string{
					"SET enable_seqscan=on",
					"SET enable_indexscan=off",
					"SET enable_indexonlyscan=off",
					"SET enable_bitmapscan=off",
				},
				query: `SELECT count(*), avg(total_amount) FROM orders
WHERE created_at BETWEEN '2023-01-01' AND '2023-12-31'`,
				note: "Full table scan, 2M строк",
			},
			{
				label: "Индекс (B-tree или BRIN)",
				setup: []string{"SET enable_seqscan=off"},
				query: `SELECT count(*), avg(total_amount) FROM orders
WHERE created_at BETWEEN '2023-01-01' AND '2023-12-31'`,
				note: "Планировщик выбирает лучший индекс",
			},
		},
	},
	{
		id:    "hash_vs_btree",
		title: "§2 Hash vs B-tree: точечный поиск",
		variants: []variant{
			{
				label: "Seq Scan",
				setup: []string{
					"SET enable_seqscan=on",
					"SET enable_indexscan=off",
					"SET enable_indexonlyscan=off",
					"SET enable_bitmapscan=off",
				},
				query: `SELECT id, status, created_at FROM orders WHERE user_id = 42000`,
				note:  "Full table scan",
			},
			{
				label: "B-tree (user_id)",
				setup: []string{"SET enable_seqscan=off", "SET enable_bitmapscan=off"},
				query: `SELECT id, status, created_at FROM orders WHERE user_id = 42000`,
				note:  "Index Scan → Heap Fetch",
			},
			{
				label: "Hash (user_id)",
				setup: []string{
					"SET enable_seqscan=off",
					"SET enable_indexscan=off",
					"SET enable_indexonlyscan=off",
				},
				query: `SELECT id, status, created_at FROM orders WHERE user_id = 42000`,
				note:  "Hash Index Scan",
			},
		},
	},
	{
		id:    "gin_fts",
		title: "§3 GIN: полнотекстовый поиск",
		variants: []variant{
			{
				label: "Seq Scan",
				setup: []string{
					"SET enable_seqscan=on",
					"SET enable_bitmapscan=off",
					"SET enable_indexscan=off",
					"SET enable_indexonlyscan=off",
				},
				query: `SELECT id, title, ts_rank(fts, q) AS rank FROM books,
to_tsquery('simple', 'история') q WHERE fts @@ q ORDER BY rank DESC LIMIT 20`,
				note: "500K строк без GIN",
			},
			{
				label: "GIN (fts)",
				setup: []string{"SET enable_seqscan=off"},
				query: `SELECT id, title, ts_rank(fts, q) AS rank FROM books,
to_tsquery('simple', 'история') q WHERE fts @@ q ORDER BY rank DESC LIMIT 20`,
				note: "Bitmap Index Scan через GIN",
			},
		},
	},
	{
		id:    "gin_array",
		title: "§4 GIN: массивы (tags @>)",
		variants: []variant{
			{
				label: "Seq Scan",
				setup: []string{
					"SET enable_seqscan=on",
					"SET enable_bitmapscan=off",
					"SET enable_indexscan=off",
				},
				query: `SELECT id, title FROM books
WHERE tags @> ARRAY[(SELECT tags[1] FROM books WHERE array_length(tags,1)>0 LIMIT 1)]`,
				note: "Seq Scan, 500K строк",
			},
			{
				label: "GIN (tags @>)",
				setup: []string{"SET enable_seqscan=off"},
				query: `SELECT id, title FROM books
WHERE tags @> ARRAY[(SELECT tags[1] FROM books WHERE array_length(tags,1)>0 LIMIT 1)]`,
				note: "Bitmap Index Scan через GIN",
			},
		},
	},
	{
		id:    "spgist_inet",
		title: "§5 SP-GiST: IP-подсети (<<)",
		variants: []variant{
			{
				label: "Seq Scan",
				setup: []string{
					"SET enable_seqscan=on",
					"SET enable_bitmapscan=off",
					"SET enable_indexscan=off",
				},
				query: `SELECT id, user_id, ip FROM user_sessions
WHERE ip << '10.0.0.0/8' LIMIT 100`,
				note: "Full scan по inet",
			},
			{
				label: "SP-GiST (inet_ops)",
				setup: []string{"SET enable_seqscan=off"},
				query: `SELECT id, user_id, ip FROM user_sessions
WHERE ip << '10.0.0.0/8' LIMIT 100`,
				note: "prefix-tree SP-GiST",
			},
		},
	},
	{
		id:    "partial",
		title: "§7 Partial: горячее подмножество",
		variants: []variant{
			{
				label: "Seq Scan",
				setup: []string{
					"SET enable_seqscan=on",
					"SET enable_indexscan=off",
					"SET enable_indexonlyscan=off",
					"SET enable_bitmapscan=off",
				},
				query: `SELECT id, user_id, created_at FROM orders
WHERE status = 'new' AND created_at > now() - interval '90 days'`,
				note: "Full table scan",
			},
			{
				label: "Partial index (WHERE status='new')",
				setup: []string{"SET enable_seqscan=off"},
				query: `SELECT id, user_id, created_at FROM orders
WHERE status = 'new' AND created_at > now() - interval '90 days'`,
				note: "Partial B-tree, только 'new' заказы",
			},
		},
	},
	{
		id:    "covering",
		title: "§8 Covering (INCLUDE): Index-Only Scan",
		variants: []variant{
			{
				label: "B-tree + Heap Fetch",
				setup: []string{"SET enable_seqscan=off", "SET enable_indexonlyscan=off"},
				query: `SELECT user_id, status, created_at, total_amount FROM orders WHERE user_id = 100000`,
				note:  "Index Scan + обращение к heap",
			},
			{
				label: "INCLUDE → Index-Only Scan",
				setup: []string{"SET enable_seqscan=off", "SET enable_indexscan=off", "SET enable_indexonlyscan=on"},
				query: `SELECT user_id, status, created_at, total_amount FROM orders WHERE user_id = 100000`,
				note:  "heap не читается",
			},
		},
	},
	{
		id:    "functional",
		title: "§9 Functional: lower(email)",
		variants: []variant{
			{
				label: "Seq Scan",
				setup: []string{
					"SET enable_seqscan=on",
					"SET enable_indexscan=off",
					"SET enable_indexonlyscan=off",
				},
				query: `SELECT id, email, full_name FROM users
WHERE lower(email) = lower('user42000@bookstore.example')`,
				note: "lower() для каждой из 1M строк",
			},
			{
				label: "Functional index (lower(email))",
				setup: []string{"SET enable_seqscan=off"},
				query: `SELECT id, email, full_name FROM users
WHERE lower(email) = lower('user42000@bookstore.example')`,
				note: "Index Scan, O(log n)",
			},
		},
	},
}

// ─── Measurement helpers ──────────────────────────────────────────────────────

func median(s []float64) float64 {
	if len(s) == 0 {
		return 0
	}
	c := make([]float64, len(s))
	copy(c, s)
	sort.Float64s(c)
	n := len(c)
	if n%2 == 0 {
		return math.Round((c[n/2-1]+c[n/2])/2*100) / 100
	}
	return math.Round(c[n/2]*100) / 100
}

// explainMs runs EXPLAIN (ANALYZE, BUFFERS) `runs` times and returns median
// execution time parsed from the "Execution Time: X ms" line.
func explainMs(ctx context.Context, conn *pgx.Conn, setup []string, query string, runs int) (float64, error) {
	var times []float64
	for i := 0; i < runs; i++ {
		for _, s := range setup {
			if _, err := conn.Exec(ctx, s); err != nil {
				return -1, fmt.Errorf("setup %q: %w", s, err)
			}
		}
		rows, err := conn.Query(ctx, "EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) "+query)
		if err != nil {
			return -1, fmt.Errorf("explain: %w", err)
		}
		var sb strings.Builder
		for rows.Next() {
			var line string
			if scanErr := rows.Scan(&line); scanErr != nil {
				rows.Close()
				return -1, scanErr
			}
			sb.WriteString(line)
			sb.WriteByte('\n')
		}
		rows.Close()
		if rows.Err() != nil {
			return -1, rows.Err()
		}
		m := reExecTime.FindStringSubmatch(sb.String())
		if m == nil {
			return -1, fmt.Errorf("execution time not found in EXPLAIN output")
		}
		ms, _ := strconv.ParseFloat(m[1], 64)
		times = append(times, ms)
	}
	return median(times), nil
}

func resetPlanner(ctx context.Context, conn *pgx.Conn) {
	for _, s := range []string{
		"RESET enable_seqscan",
		"RESET enable_indexscan",
		"RESET enable_indexonlyscan",
		"RESET enable_bitmapscan",
	} {
		conn.Exec(ctx, s) //nolint:errcheck
	}
}

// ─── Index sizes ──────────────────────────────────────────────────────────────

var customIndexes = []string{
	"idx_btree_orders_created_at",
	"idx_btree_orders_status",
	"idx_btree_books_price",
	"idx_hash_orders_user_id",
	"idx_gist_warehouses_location",
	"idx_gist_books_title_trgm",
	"idx_spgist_sessions_ip",
	"idx_gin_books_fts",
	"idx_gin_books_tags",
	"idx_gin_books_metadata",
	"idx_gin_reviews_fts",
	"idx_brin_orders_created_at",
	"idx_partial_orders_new",
	"idx_partial_reviews_published",
	"idx_func_users_email_lower",
	"idx_covering_orders_user",
	"idx_multi_reviews_book_rating",
	"idx_multi_orders_user_status",
}

func collectSizes(ctx context.Context, conn *pgx.Conn) []IndexSize {
	var out []IndexSize
	for _, name := range customIndexes {
		var pretty string
		var bytes int64
		// Query by name to avoid error if index doesn't exist.
		err := conn.QueryRow(ctx, `
			SELECT pg_size_pretty(pg_relation_size(c.oid)),
			       pg_relation_size(c.oid)
			FROM pg_class c
			JOIN pg_namespace n ON n.oid = c.relnamespace
			WHERE c.relname = $1 AND c.relkind = 'i'
			  AND n.nspname = current_schema()
		`, name).Scan(&pretty, &bytes)
		if err != nil {
			continue
		}
		out = append(out, IndexSize{Name: name, Pretty: pretty, Bytes: bytes})
	}
	return out
}

// ─── DML overhead ─────────────────────────────────────────────────────────────

func measureInsert(ctx context.Context, conn *pgx.Conn, runs int) float64 {
	q := `INSERT INTO orders (user_id, status, total_amount, created_at, updated_at)
SELECT (random()*999999+1)::bigint, 'new', random()*200+1, now(), now()
FROM generate_series(1,1000)`

	var times []float64
	for i := 0; i < runs; i++ {
		start := time.Now()
		conn.Exec(ctx, q) //nolint:errcheck
		times = append(times, float64(time.Since(start).Milliseconds()))
	}
	return median(times)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

func main() {
	dsn := flag.String("dsn", "",
		"PostgreSQL DSN (default: $DATABASE_URL или postgres://postgres@localhost/bookstore?sslmode=disable)")
	outPath := flag.String("out",
		filepath.Join("..", "frontend", "data", "results.json"),
		"Путь для записи results.json")
	runs := flag.Int("runs", 3, "Число прогонов на вариант (берётся медиана)")
	flag.Parse()

	if *dsn == "" {
		*dsn = os.Getenv("DATABASE_URL")
	}
	if *dsn == "" {
		*dsn = "postgres://postgres@localhost/bookstore?sslmode=disable"
	}

	ctx := context.Background()
	conn, err := pgx.Connect(ctx, *dsn)
	if err != nil {
		log.Fatalf("connect: %v\n\nПодсказка: укажите строку подключения через -dsn или переменную DATABASE_URL", err)
	}
	defer conn.Close(ctx)

	// Quick sanity check
	var tableCount int
	conn.QueryRow(ctx, "SELECT count(*) FROM orders").Scan(&tableCount) //nolint:errcheck
	if tableCount == 0 {
		log.Fatal("таблица orders пуста — сначала выполните sql/seed.sql")
	}
	log.Printf("orders: %d строк", tableCount)

	var pgVer string
	conn.QueryRow(ctx, "SELECT 'PostgreSQL ' || current_setting('server_version')").Scan(&pgVer) //nolint:errcheck
	log.Printf("Подключено: %s", pgVer)

	// ── Run scenarios ──────────────────────────────────────────────────────────
	var scenOuts []ScenarioOut
	for _, sc := range scenarios {
		log.Printf("[bench] %s", sc.title)
		out2 := ScenarioOut{ID: sc.id, Title: sc.title}
		for _, v := range sc.variants {
			log.Printf("  → %s", v.label)
			ms, runErr := explainMs(ctx, conn, v.setup, v.query, *runs)
			resetPlanner(ctx, conn)
			if runErr != nil {
				log.Printf("  ОШИБКА: %v", runErr)
				ms = -1
			} else {
				log.Printf("  %.2f ms (медиана %d прогонов)", ms, *runs)
			}
			out2.Results = append(out2.Results, MeasuredRow{
				Label: v.label,
				Ms:    ms,
				Note:  v.note,
			})
		}
		scenOuts = append(scenOuts, out2)
	}

	// ── Index sizes ────────────────────────────────────────────────────────────
	log.Println("[sizes] сбор размеров индексов...")
	idxSizes := collectSizes(ctx, conn)
	for _, s := range idxSizes {
		log.Printf("  %-40s %s", s.Name, s.Pretty)
	}

	// ── DML ───────────────────────────────────────────────────────────────────
	log.Println("[dml] INSERT 1000 строк со всеми индексами...")
	insertMs := measureInsert(ctx, conn, *runs)
	log.Printf("  %.0f ms (медиана)", insertMs)

	report := Report{
		CollectedAt: time.Now().UTC().Format(time.RFC3339),
		PgVersion:   pgVer,
		Runs:        *runs,
		Scenarios:   scenOuts,
		IndexSizes:  idxSizes,
		DML:         []DMLRow{{Op: "INSERT 1000 строк (все индексы активны)", WithIdxMs: insertMs}},
	}

	// ── Write output ───────────────────────────────────────────────────────────
	if err := os.MkdirAll(filepath.Dir(*outPath), 0o755); err != nil {
		log.Fatalf("mkdir: %v", err)
	}
	f, err := os.Create(*outPath)
	if err != nil {
		log.Fatalf("create %s: %v", *outPath, err)
	}
	enc := json.NewEncoder(f)
	enc.SetIndent("", "  ")
	if encErr := enc.Encode(report); encErr != nil {
		log.Fatalf("encode: %v", encErr)
	}
	f.Close()

	log.Printf("Готово → %s", *outPath)
}
