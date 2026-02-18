# Deployment Guide

## Prerequisites

- [Vercel account](https://vercel.com) (free hobby tier)
- [Neon Postgres](https://neon.tech) database (free tier)
- [Pusher Channels](https://pusher.com) app (free tier)
- `.env` configured (see [ENV_SETUP.md](./ENV_SETUP.md))

---

## Step 1: Push to Git

```bash
git add .
git commit -m "Next.js refactor complete"
git push origin main
```

## Step 2: Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your Git repository
3. Vercel auto-detects Next.js — no config needed

## Step 3: Set Environment Variables

In Vercel → **Project Settings** → **Environment Variables**, add:

| Variable                     | Value                         |
| ---------------------------- | ----------------------------- |
| `DATABASE_URL`               | Your Neon connection string   |
| `NEXTAUTH_SECRET`            | Your generated secret         |
| `NEXTAUTH_URL`               | `https://your-app.vercel.app` |
| `PUSHER_APP_ID`              | From Pusher dashboard         |
| `PUSHER_KEY`                 | From Pusher dashboard         |
| `PUSHER_SECRET`              | From Pusher dashboard         |
| `PUSHER_CLUSTER`             | e.g. `ap2`                    |
| `NEXT_PUBLIC_PUSHER_KEY`     | Same as `PUSHER_KEY`          |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | Same as `PUSHER_CLUSTER`      |
| `BLOB_READ_WRITE_TOKEN`      | From Vercel Blob Store        |

## Step 4: Create Blob Store

1. Vercel → **Project** → **Storage** tab → **Create Store** → **Blob**
2. The `BLOB_READ_WRITE_TOKEN` is auto-linked, but verify it's in env vars

## Step 5: Push Database Schema

```bash
npx prisma db push
```

This creates all 6 tables in your Neon database.

## Step 6: Deploy

```bash
vercel deploy --prod
```

Or just push to `main` — Vercel auto-deploys on every push.

---

## Post-Deployment

- The **first user to register** becomes admin
- Enable **"Client events"** in Pusher dashboard (App Settings) for typing indicators
- All timestamps display in IST (Asia/Kolkata)
