# Environment Variables Setup

You need **3 free services** to run this app. Here's how to get each value:

---

## 1. Neon Postgres → `DATABASE_URL`

1. Go to [neon.tech](https://neon.tech) → Sign up → **Create Project**
2. After creation, copy the connection string:
   ```
   postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
3. Paste it as `DATABASE_URL` in `.env`

---

## 2. Pusher → Pusher Keys

1. Go to [pusher.com](https://pusher.com) → Sign up → **Channels** → **Create App**
2. Choose cluster **ap2** (Mumbai)
3. Go to **App Keys** tab and copy:

| `.env` Variable              | Pusher Dashboard  |
| ---------------------------- | ----------------- |
| `PUSHER_APP_ID`              | `app_id`          |
| `PUSHER_KEY`                 | `key`             |
| `PUSHER_SECRET`              | `secret`          |
| `PUSHER_CLUSTER`             | `cluster`         |
| `NEXT_PUBLIC_PUSHER_KEY`     | Same as `key`     |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | Same as `cluster` |

> **Important:** Go to **App Settings** → Enable **"Enable client events"** (needed for typing indicators).

---

## 3. NextAuth Secret → `NEXTAUTH_SECRET`

Run this to generate a random secret:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

- `NEXTAUTH_URL` = `http://localhost:3000` for local dev (Vercel sets it automatically in production)

---

## 4. Vercel Blob → `BLOB_READ_WRITE_TOKEN`

Only needed for **file uploads**. Set up when deploying:

- Vercel Dashboard → **Project Settings** → **Storage** → **Create Blob Store** → copy token

---

## After Setup

```bash
npx prisma db push    # Creates all tables in Neon
npm run dev            # Start dev server
```

The first user to register automatically becomes **admin**.
