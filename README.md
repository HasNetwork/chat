# HaS Chat — Next.js Real-Time Chat

A real-time, multi-user, multi-room chat application built with **Next.js 14**, **Pusher**, **Neon Postgres**, and **Vercel Blob**.

## Features

- **Authentication** — Login/register with NextAuth.js (JWT sessions)
- **Chat Rooms** — Create, join, and switch between rooms
- **Real-time Messaging** — Pusher-powered instant delivery
- **Message Actions** — Edit, delete, reply, emoji reactions
- **File Uploads** — Vercel Blob storage with in-chat previews
- **Read Receipts** — See who's read your messages
- **Admin Panel** — Manage users and rooms
- **Premium Dark UI** — Glassmorphism, Framer Motion animations

## Tech Stack

| Layer      | Technology                      |
| ---------- | ------------------------------- |
| Framework  | Next.js 14 (App Router)         |
| Database   | Neon Postgres + Prisma ORM      |
| Real-time  | Pusher Channels                 |
| Auth       | NextAuth.js (Credentials + JWT) |
| Storage    | Vercel Blob                     |
| Styling    | Tailwind CSS                    |
| Animations | Framer Motion                   |

## Quick Start

1. **Install:** `npm install`
2. **Set up `.env`** — see [docs/ENV_SETUP.md](docs/ENV_SETUP.md)
3. **Push schema:** `npx prisma db push`
4. **Run:** `npm run dev`

The first user to register automatically becomes **admin**.

## Docs

- [Environment Setup](docs/ENV_SETUP.md) — How to get all API keys & credentials
- [Deployment Guide](docs/DEPLOYMENT.md) — Step-by-step Vercel deployment
