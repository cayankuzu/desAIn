İşin Mutfağı is a local-first 3D room planning editor built with Next.js.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) on a desktop browser to see the editor.

Mobile browsers show a locked guidance screen that asks users to continue on desktop.

## Authentication and project storage

This project now includes:

- email + username + password authentication
- session-based login
- "Projelerim" dashboard
- SQLite-backed project persistence
- a migration baseline stored in `src/server/db/migrations/0000_initial.sql`

### Database runtime

The database layer uses an adapter-oriented design so the repository / service / controller stack can move to Supabase or PostgreSQL later with minimal surface changes.

Environment variables:

```bash
DESAIN_RUNTIME_ENV=local
DESAIN_SESSION_COOKIE_NAME=desain_session
BLOB_READ_WRITE_TOKEN=...
DESAIN_DATABASE_BLOB_PATHNAME=databases/production/desain.production.sqlite
```

Current behavior:

- `local` runtime writes to `data/local/desain.local.sqlite`
- Vercel runtime writes its working SQLite copy to `/tmp/desain/...` because the deployment bundle is read-only
- production requires Vercel Blob for durable SQLite persistence through `BLOB_READ_WRITE_TOKEN` or `BLOB_STORE_ID` + `VERCEL_OIDC_TOKEN`
- without Vercel Blob, production requests fail fast instead of silently losing accounts and sessions on cold starts

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
