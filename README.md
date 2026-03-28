<div align="center">

<!-- Animated Typing Header -->
<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=40&pause=1000&color=3B82F6&center=true&vCenter=true&width=800&lines=SecureExam;Online+Coding+Examination+Platform;Role-based+Access+%2B+Security;Real-time+Code+Execution" alt="Typing SVG" />

<p align="center">
  <strong>Modern, secure, and fully-featured online coding examination and proctoring platform.</strong>
</p>

<p align="center">
  <a href="#-stack"><img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" /></a>
  <a href="#-stack"><img src="https://img.shields.io/badge/Node.js-Express_5-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node" /></a>
  <a href="#-stack"><img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="#-stack"><img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" /></a>
  <a href="#-stack"><img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" /></a>
</p>

<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="100%" height="3px">

</div>

## ✨ Key Features

- 🔐 **Role-based Access Control (RBAC)** — Dedicated interfaces for Students, Instructors, and Administrators.
- ⚡ **Real-time Code Execution** — Instant compilation and execution using integrated Monaco Editor.
- 📝 **Exam Management** — Seamlessly create, schedule, evaluate, and grade coding assessments.
- 🛡️ **Tamper-proof & Secure** — Kiosk environment-ready, effectively blocking background shortcuts and screenshots (perfectly couples with Electron.js wrappers).
- 🐳 **Dockerized Infrastructure** — Instantly deployable and isolated instances ready for high-scale environments.

<br>

## 🛠️ Stack

The ecosystem is split into isolated client and server instances, both deeply utilizing TypeScript.

**Frontend 🎨**
> <img src="https://img.shields.io/badge/React_19-20232A?style=flat&logo=react&logoColor=61DAFB" /> <img src="https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white" /> <img src="https://img.shields.io/badge/Vite-B73BFE?style=flat&logo=vite&logoColor=FFD62E" /> <img src="https://img.shields.io/badge/Bootstrap-563D7C?style=flat&logo=bootstrap&logoColor=white" /> <img src="https://img.shields.io/badge/Monaco_Editor-2C2C32?style=flat&logo=visualstudiocode&logoColor=24A1F0" />

**Backend ⚙️**
> <img src="https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white" /> <img src="https://img.shields.io/badge/Express.js-000000?style=flat&logo=express&logoColor=white" /> <img src="https://img.shields.io/badge/PM2-2B037A?style=flat&logo=pm2&logoColor=white" /> 

**Database & Infra 🐳**
> <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=flat&logo=mongodb&logoColor=white" /> <img src="https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white" /> <img src="https://img.shields.io/badge/Nginx-009639?style=flat&logo=nginx&logoColor=white" /> <img src="https://img.shields.io/badge/Let's_Encrypt-003A70?style=flat&logo=Let'sEncrypt&logoColor=white" />

<br>

<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="100%" height="3px">

## 🚀 Development

### 📋 Prerequisites
Ensure you have the following installed on your local environment before proceeding:
- Node.js 18+
- MongoDB (running locally or via MongoDB Atlas)

### 💻 Setup

<details>
<summary><b>Server Configuration ⚙️</b> (Click to Expand)</summary>

Create a `.env.development` file in the `server` directory and fill in the required details:

```env
# server/.env.development
NODE_ENV=<development_or_production>
PORT=<your_port_number>

MONGO_URI=<your_mongodb_connection_string>
JWT_SECRET=<your_secure_jwt_secret>
JWT_EXPIRY=<jwt_expiry_time>

CORS_ORIGINS=<comma_separated_allowed_origins>
FRONTEND_URL=<your_frontend_url>
```

```bash
cd server
npm install
npm run dev
```
</details>

<details>
<summary><b>Client Configuration 🎨</b> (Click to Expand)</summary>

Create a `.env.development` file in the `client` directory and fill in the details like so:

```env
# client/.env.development
VITE_API_URL=<your_api_url>
```

```bash
cd client
npm install
npm run dev
```
</details>

> 💡 **Tip:** Active client runs on [`http://localhost:5173`](http://localhost:5173), and the backend API server sits on [`http://localhost:5000`](http://localhost:5000).

<br>

<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="100%" height="3px">

## 📦 Production Deployment

### 1️⃣ Configure Platform Secrets

Create the production environment files and fill in the required details:

**Server Environment (`server/.env.production`):**
```env
NODE_ENV=production
PORT=<your_production_port>
MONGO_URI=<your_production_mongodb_connection_string>
JWT_SECRET=<your_secure_jwt_secret>
JWT_EXPIRY=<jwt_expiry_time>
CORS_ORIGINS=<comma_separated_allowed_production_origins>
FRONTEND_URL=<your_production_frontend_url>
```

**Client Environment (`client/.env.production`):**
```env
VITE_API_URL=<your_production_api_url>
```

**MongoDB Credentials (`mongo.env`):**
```env
MONGO_INITDB_ROOT_USERNAME=<your_db_admin_username>
MONGO_INITDB_ROOT_PASSWORD=<your_db_admin_password>
```

> ⚠️ **SECURITY WARNING:** Never push `.env.production` or `mongo.env` with real credentials to source control targeting public or untrusted domains.

### 2️⃣ Secure SSL Certificate Automation
Generate a safe certificate through Let's Encrypt standalone service for your own domain. Validate port `80` configuration appropriately:
```bash
certbot certonly --standalone -d <your_domain.com> -d <www.your_domain.com>
```

### 3️⃣ Scale & Deploy via Docker Compose
Build architecture binaries and launch resilient containers in detached mode:
```bash
docker compose up -d --build
```

### 4️⃣ Confirm Health Status
Instantly verify the server availability and API readiness structure:
```bash
curl https://securexam.info/api/health
```

<br>

<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" width="100%" height="3px">



## 🗂️ Project Structure

Using Mermaid standard graphs, observe our full project overview separating logic models perfectly per target layer:

```mermaid
graph TD;
    Root((SecureExam Root))-->Client_App[client/];
    Root-->Server_App[server/];
    Root-->DockerConfig{docker-compose.yml};
    
    Client_App-->src_client[src/];
    Client_App-->clientDockerfile[Dockerfile];
    Client_App-->clientNginx[nginx.conf];
    
    src_client-->client_components[components/];
    src_client-->client_pages[pages/];
    src_client-->client_services[services/];
    
    Server_App-->src_server[src/];
    Server_App-->serverDockerfile[Dockerfile];
    Server_App-->pm2Config[ecosystem.config.js];

    src_server-->server_models[models/];
    src_server-->server_ctrl[controllers/];
    src_server-->server_routes[routes/];
```

<br>

<div align="center">
  <sub>Built with ❤️ by Bersinberz. © 2026</sub>
</div>
