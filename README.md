# ספוטליינר (SpotLiner) v2

אפליקציית מוזיקה שיתופית בסגנון Spotify – **מערכת אחידה ב-Next.js** עם ממשק API מודרני (`/api/v1`).

## דרישות
- Node.js 18+
- PostgreSQL (למשל [Neon.tech](https://neon.tech))

## התקנה

```bash
npm install
cp .env.example .env
# ערוך .env: DATABASE_URL, JWT_SECRET, אופציונלי VAPID_* ל-Push
npm run db:migrate
npm run dev
```

- אפליקציה: http://localhost:3000  
- API: http://localhost:3000/api/v1 (למשל `/api/v1/health`, `/api/v1/tracks`)

## סקריפטים
| פקודה | תיאור |
|--------|--------|
| `npm run dev` | שרת פיתוח |
| `npm run build` | בנייה ל-production |
| `npm run start` | הרצת build |
| `npm run db:migrate` | הרצת סכמת DB (פעם אחת) |

## מבנה
- **app/** – דפים ו-API (Route Handlers תחת `app/api/v1/`)
- **lib/** – DB, אימות, עזרים
- **db/schema.sql** – סכמת PostgreSQL
- **api/openapi.yaml** – מפרט OpenAPI 3.0

## משתמש מנהל
אחרי הרשמה ראשונה, עדכן ב-SQL:
```sql
UPDATE users SET role = 'admin' WHERE email = 'האימייל@example.com';
```

## תיעוד
- [סקירת API ותוכנית v2](docs/API_OVERVIEW_AND_V2_PLAN.md)
- מפרט מלא: `api/openapi.yaml`
