# SecureExam

Online coding examination platform with role-based access, real-time code execution, and exam management.

## Stack

- **Frontend** — React 19 + TypeScript + Vite + Monaco Editor + Bootstrap
- **Backend** — Node.js + Express 5 + TypeScript + PM2
- **Database** — MongoDB (Mongoose)
- **Infra** — Docker, Nginx (SSL), Let's Encrypt

---

## Development

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### Setup

```bash
# Server
cd server
cp .env.development .env.development.local   # fill in your values
npm install
npm run dev

# Client (separate terminal)
cd client
npm install
npm run dev
```

Client runs at `http://localhost:5173`, server at `http://localhost:5000`.

---

## Production Deployment

### 1. Configure secrets

```bash
# Server env
cp server/.env.production server/.env.production.local
# Edit: MONGO_URI, JWT_SECRET, CORS_ORIGINS

# MongoDB credentials
cp mongo.env mongo.env.local
# Edit: MONGO_INITDB_ROOT_PASSWORD
```

> **Never commit `.env.production` or `mongo.env` with real values.**

### 2. SSL certificate

```bash
certbot certonly --standalone -d securexam.info -d www.securexam.info
```

### 3. Deploy

```bash
docker compose up -d --build
```

### 4. Verify

```bash
curl https://securexam.info/api/health
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | Min 64-char random string |
| `JWT_EXPIRY` | — | Token lifetime (default `8h`) |
| `CORS_ORIGINS` | — | Comma-separated allowed origins |
| `PORT` | — | Server port (default `5000`) |

---

## Project Structure

```
├── client/          React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   ├── Dockerfile
│   └── nginx.conf
├── server/          Express backend
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── Dockerfile
│   └── ecosystem.config.js
└── docker-compose.yml
```
