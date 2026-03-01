# ספוטליינר – סקירת API וגרסה 2 (Next.js אחיד)

מסמך זה מסכם את הפרויקט [SpotLiner](https://github.com/yossi-cmd/SpotLiner), את ממשק ה-API, ואת גרסה 2 כמערכת **אחידה ב-Next.js** עם ממשק API מודרני (`/api/v1`) תוך שמירה על הפונקציונליות.

---

## 1. הפרויקט המקורי – תכונות (שמורות ב-v2)

| תחום | תכונות |
|------|--------|
| **אימות** | הרשמה, התחברות (JWT), תפקידים: `user`, `uploader`, `admin` |
| **שירים** | העלאה (admin/uploader), רשימה, חיפוש, סטרימינג + Range (seek), עדכון/מחיקה (יוצר/מנהל) |
| **אומנים** | CRUD, תמונות, אומנים מופיעים (featured) בשיר |
| **אלבומים** | CRUD, קישור לאומן, תמונות |
| **פלייליסטים** | יצירה, עריכה, הוספת/הסרת שירים, ציבורי/פרטי |
| **משתמש (me)** | אהובים, היסטוריית השמעה, Push (הרשמה, בדיקה, הודעות, resend) |
| **חיפוש** | חיפוש משולב (שירים, אומנים, אלבומים) |
| **YouTube** | ייבוא פלייליסט (Data API + YOUTUBE_API_KEY), העלאת תמונה מ-URL, הורדת שיר (yt-dlp) |
| **Admin** | רשימת מנויי Push, שליחת Push (סטאב – להשלים) |

---

## 2. גרסה 2 – מערכת אחידה ב-Next.js

### עקרונות
- **אפליקציה אחת** – Next.js (App Router) שמכילה גם את ה-API וגם את הממשק.
- **API תחת `/api/v1`** – כל ה-endpoints מוגדרים במפרט OpenAPI ומיושמים כ-Route Handlers.
- **אותה פונקציונליות** – לוגיקה וסכמת DB כמו במקור; רק הארכיטקטורה השתנתה.

### מבנה הפרויקט

```
spotliner_v2/
├── app/
│   ├── layout.jsx
│   ├── page.jsx
│   ├── globals.css
│   ├── api/v1/              # API – Route Handlers
│   │   ├── auth/
│   │   ├── config/
│   │   ├── upload/
│   │   ├── tracks/
│   │   ├── search/
│   │   ├── playlists/
│   │   ├── me/
│   │   ├── artists/
│   │   ├── albums/
│   │   ├── youtube/
│   │   └── admin/
│   └── uploads/[...path]/   # הגשת קבצי אודיו/תמונות
├── lib/
│   ├── db.js
│   ├── auth.js
│   ├── tracks.js
│   └── push.js
├── db/
│   └── schema.sql
├── scripts/
│   └── migrate.js
├── api/
│   └── openapi.yaml         # מפרט OpenAPI 3.0
├── docs/
├── next.config.js
├── package.json
└── .env.example
```

### מיפוי נתיבים
- מקור (Express): `/api/...`  
- v2 (Next.js): `/api/v1/...`  
- הגשת קבצים: `/uploads/*` → `app/uploads/[...path]/route.js`

### הרצה
```bash
cp .env.example .env
# ערוך .env (DATABASE_URL, JWT_SECRET וכו')
npm install
npm run db:migrate
npm run dev
```
- אפליקציה: http://localhost:3000  
- API: http://localhost:3000/api/v1/...

---

## 3. ממשק API (תמצית)

| מודול | Endpoints |
|-------|-----------|
| **auth** | `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/auth/me` |
| **config** | `GET /api/v1/config` |
| **upload** | `POST /api/v1/upload/image` |
| **tracks** | `GET/POST /api/v1/tracks`, `GET/PUT/DELETE /api/v1/tracks/:id`, `GET /api/v1/tracks/:id/stream` |
| **search** | `GET /api/v1/search?q=...` |
| **playlists** | `GET/POST /api/v1/playlists`, `GET/PUT/DELETE /api/v1/playlists/:id`, `POST /api/v1/playlists/:id/tracks`, `DELETE /api/v1/playlists/:id/tracks/:trackId` |
| **me** | favorites, history, push-subscription, push-test, notifications |
| **artists** | `GET/POST /api/v1/artists`, `GET/PUT/DELETE /api/v1/artists/:id` |
| **albums** | `GET/POST /api/v1/albums`, `GET/PUT/DELETE /api/v1/albums/:id` |
| **youtube** | playlist (YouTube Data API), upload-thumbnail, download-track (דורש yt-dlp בשרת) |
| **admin** | push-subscribers, send-push (סטאב) |

אימות: `Authorization: Bearer <token>`. סטרימינג: תמיכה ב-`Range` ו-`?token=...` ב-stream.

---

## 4. YouTube – ייבוא פלייליסט
- **מפתח API**: הגדר `YOUTUBE_API_KEY` ב-.env (ממשק YouTube Data API v3 ב-Google Cloud Console).
- **טעינת פלייליסט**: `GET /api/v1/youtube/playlist?url=...` או `?id=PLxxx` – מחזיר כותרת, תמונת ממוזערת ורשימת סרטונים.
- **העלאת תמונה**: `POST /api/v1/youtube/upload-thumbnail` עם `{ url }` – שומר תמונה מ-URL.
- **הורדת אודיו**: `POST /api/v1/youtube/download-track` – דורש **yt-dlp** מותקן על השרת. התקנה:
  - **macOS (Homebrew)**: `brew install yt-dlp`
  - **Linux**: `sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && sudo chmod +x /usr/local/bin/yt-dlp`
  - אם yt-dlp לא מותקן, ה-API מחזיר 503 עם הודעה להתקנה.

## 5. השלמות אופציונליות
- Admin send-push – השלמת לוגיקת web-push לפי משתמשים נבחרים.
- דף תיעוד API (Swagger UI) ב-`/api/docs` על בסיס `api/openapi.yaml`.
