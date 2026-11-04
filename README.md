# Locara SSH

Browser-based SSH client (Termius-style) for personal + team use: host manager, encrypted credential vault, live terminal with multi-session tabs/split view, SFTP browser, team sharing, encrypted export/import.

## Stack
- `server/`: Fastify + TypeScript, Prisma/PostgreSQL, `ssh2` for the shell/SFTP bridge, WebSocket for the terminal.
- `web/`: React + TypeScript + Vite + Tailwind, xterm.js for the terminal.

## Local setup
```bash
npm install
docker compose up -d db          # Postgres on localhost:5432
cp server/.env.example server/.env   # fill in JWT_SECRET and VAULT_MASTER_KEY
cd server && npx prisma migrate dev --name init
npm run dev:server               # http://localhost:4000
npm run dev:web                  # http://localhost:5173
```

Generate secrets for `.env`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"  # VAULT_MASTER_KEY
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"  # JWT_SECRET
```

## Moving hosts between machines
Each instance (e.g. this machine and your home laptop) has its own database — there's no shared backend yet. Use **Export** on the Dashboard to download a passphrase-encrypted backup of your personal hosts + credentials, then **Import** it on the other instance with the same passphrase. Team-shared hosts aren't included (they belong to the team, not the export). The passphrase never leaves your request to the server and isn't stored anywhere — losing it means the backup file is unrecoverable.

## Security notes (read before any real commercial launch)
- Secrets (passwords/private keys) are encrypted at rest with AES-256-GCM using a single server-side master key (`VAULT_MASTER_KEY`). This is **not zero-knowledge** — anyone with the master key and DB access can decrypt all vaults. Before a paid/public launch, move to per-user or per-team key derivation so the server itself can't read secrets at rest.
- Sessions are revocable (DB-backed), cookies are httpOnly + `secure` in production.
- `npm audit` currently flags Vite's dev-server-only vulnerabilities (path traversal / Windows-specific issues in `vite dev`); not present in production builds, but worth revisiting via a Vite 8 upgrade before shipping broadly.
