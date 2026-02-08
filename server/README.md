# Office Server

Generic LAN JSON file store for multiple apps. Install once on one PC, connect all your apps to it.

## Setup (one time)

```bash
cd server
npm install
npm run setup
```

Save the API key that gets printed — you'll need it to connect your apps.

## Run

```bash
npm run dev     # development (auto-restart on changes)
npm run build   # compile TypeScript
npm start       # production (after build)
```

The server runs on `http://0.0.0.0:3456` (HTTP) and `https://0.0.0.0:3457` (HTTPS).

## API

All endpoints except `/api/health` require the `x-api-key` header.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check (no auth) |
| GET | `/api/apps` | List all apps |
| GET | `/api/:app` | List collections for an app |
| GET | `/api/:app/:collection` | List all items in a collection |
| GET | `/api/:app/:collection/:id` | Get a single item |
| POST | `/api/:app/:collection` | Create an item (auto-generates ID) |
| PUT | `/api/:app/:collection/:id` | Create/update an item with specific ID |
| DELETE | `/api/:app/:collection/:id` | Delete an item |

Apps and collections are created automatically on first write. No setup needed.

## Data

All data is stored as JSON files in `data/`:

```
data/
├── schedule-buddy/
│   └── firms/
│       ├── firm-001.json
│       └── firm-002.json
├── inventory-app/
│   └── products/
│       ├── prod-001.json
│       └── prod-002.json
└── backups/
    ├── backup-hourly-2026-02-08T09-00-00-000Z/
    └── backup-daily-2026-02-08T00-00-00-000Z/
```

## Backups

Automatic backups run on a schedule:
- **Hourly**: keeps the last 24
- **Daily**: keeps the last 7
- A backup also runs on every server startup

Backups are full copies of the `data/` folder (excluding previous backups).

## Connecting an App

Copy the two files from `client-template/` into your app:

1. `persistence.ts` — change `APP_NAME` to your app's name
2. `ServerSettings.tsx` — drop-in UI component for connecting

Then use them:

```typescript
import { getAll, getOne, save, remove } from './persistence';

// Save
await save('products', 'prod-001', { name: 'Widget', price: 9.99 });

// Get one
const product = await getOne('products', 'prod-001');

// List all
const products = await getAll('products');

// Delete
await remove('products', 'prod-001');
```

## Environment Variables

Copy `.env.example` to `.env` to customize:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3456` | HTTP port |
| `HTTPS_PORT` | `3457` | HTTPS port |
| `DISABLE_HTTPS` | `false` | Set to `true` to disable HTTPS |
