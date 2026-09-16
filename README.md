# DC Project Backend

Backend API for Wedding RSVP management.

## Tech Stack
- Node.js & Express
- MongoDB (Mongoose)
- Nodemailer

## Getting Started
1. Clone the repository
2. Install dependencies: `npm install`
3. Configure environment variables in `.env` (refer to `.env.example`)
4. Start the server: `npm start` or `npm run dev`

## Deploy to Coolify

The app is stateless (uploads are parsed in memory, data lives in MongoDB Atlas),
so a single container is enough.

1. In Coolify create a new **Application** from this Git repository.
2. **Build Pack**: `Dockerfile` (uses the `Dockerfile` in the repo root).
3. **Ports Exposes**: `5000`.
4. **Environment variables** (mark secrets as such):
   `PORT=5000`, `FRONTEND_URL`, `MONGODB_URI`, `ADMIN_PASSWORD`, `JWT_SECRET`,
   `ALLOW_OPEN_RSVP`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`
   (or `BREVO_API_KEY` instead of `SMTP_*` to send via Brevo's HTTP API).
   `FRONTEND_URL` must be the real frontend origin (e.g. `https://wedding.example.com`)
   or CORS will reject browser requests.
5. **Domains**: `https://api.example.com`. Coolify's Traefik proxy terminates TLS and
   issues a Let's Encrypt certificate automatically — the container only speaks HTTP.
   Requirements: a DNS A record for the domain pointing to the Coolify server and
   ports 80/443 open on that server.
6. Deploy. Check `https://api.example.com/api/health` returns `{"ok":true,"database":"mongodb",...}`.
7. Whitelist the Coolify server's public IP in MongoDB Atlas → Network Access
   (`GET /api/ip` on the deployed app prints it).

### Build & run locally

```bash
docker build -t dc-backend .
docker run --rm -p 5000:5000 --env-file .env dc-backend
curl http://localhost:5000/api/health
```
