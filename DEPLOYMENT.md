# SecureExam — Production Deployment Guide

**Target:** 300+ concurrent users | Dual NVIDIA A5000 | 2TB SSD

---

## 1. Server Requirements

| Component | Recommended |
|-----------|-------------|
| OS | Ubuntu 22.04 LTS |
| CPU | 16+ cores (leave 4 for GPU workloads) |
| RAM | 32 GB minimum |
| Disk | 2TB SSD (NVMe preferred) |
| Network | 1 Gbps |

---

## 2. Pre-Deployment Checklist

### 2a. Generate a strong JWT secret
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Paste the output into `server/.env.production` as `JWT_SECRET`.

### 2b. Set a Redis password
```bash
openssl rand -base64 32
```
Set it as `REDIS_PASSWORD` in your shell environment **and** in `mongo.env`:
```
REDIS_PASSWORD=your_generated_password
```

### 2c. Update `server/.env.production`
```env
MONGO_URI=mongodb://mongouser:STRONG_PASSWORD@127.0.0.1:27017/SecureExam?authSource=admin
JWT_SECRET=<64-char hex from step 2a>
JWT_EXPIRY=8h
CORS_ORIGINS=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
REDIS_URL=redis://:REDIS_PASSWORD@redis:6379
CODE_EXEC_CONCURRENCY=20
CODE_EXEC_QUEUE=200
```

### 2d. Update Nginx domain
Replace `securexam.info` in `client/nginx.conf` with your actual domain.

---

## 3. OS-Level Tuning (run as root on the host)

```bash
# Increase file descriptor limits
echo "* soft nofile 65535" >> /etc/security/limits.conf
echo "* hard nofile 65535" >> /etc/security/limits.conf

# Kernel network tuning for high concurrency
cat >> /etc/sysctl.conf << 'EOF'
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15
net.core.netdev_max_backlog = 65535
vm.swappiness = 10
EOF
sysctl -p

# Create tmpfs for code execution temp files (fast I/O, auto-cleaned on reboot)
mkdir -p /tmp/code_exec
mount -t tmpfs -o size=2G,mode=1777 tmpfs /tmp/code_exec
# Make it persistent
echo "tmpfs /tmp/code_exec tmpfs size=2G,mode=1777 0 0" >> /etc/fstab
```

---

## 4. SSL Certificate (Let's Encrypt)

```bash
apt install certbot
certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
# Certificates go to /etc/letsencrypt/live/yourdomain.com/
```

Auto-renewal cron:
```bash
echo "0 3 * * * certbot renew --quiet && docker compose restart client" | crontab -
```

---

## 5. Deploy

```bash
# Clone / pull latest code
git pull origin main

# Build and start all services
docker compose up -d --build

# Watch logs
docker compose logs -f server
```

---

## 6. MongoDB Setup (inside container or Atlas)

If using the local MongoDB container, create the admin user first:
```bash
docker exec -it prod-mongo mongosh
```
```js
use admin
db.createUser({
  user: "mongouser",
  pwd: "STRONG_PASSWORD",
  roles: [{ role: "readWrite", db: "SecureExam" }]
})
```

Create indexes (run once after first deploy):
```bash
docker exec -it prod-mongo mongosh SecureExam
```
```js
// These are created automatically by Mongoose on startup,
// but you can verify them:
db.students.getIndexes()
db.exams.getIndexes()
db.submissions.getIndexes()
db.examsessions.getIndexes()
```

---

## 7. Architecture Overview

```
Internet
    │
    ▼
[Nginx :443]  ← SSL termination, rate limiting, static files
    │
    ▼
[Node.js API :5000]  ← 4 PM2 fork workers
    │         │
    ▼         ▼
[MongoDB]  [Redis]   ← token blocklist, rate limit state
```

**Concurrency capacity per worker:**
- General API: 150 concurrent requests, 500 queued
- Code execution: 20 concurrent runs, 200 queued
- 4 workers × 20 = **80 simultaneous code executions**

**For 300 students in a 60-minute exam:**
- Login burst: ~300 logins in ~5 minutes → ~1/s → well within limits
- Code runs: students run code every few minutes → ~30-50 concurrent at peak
- Submissions: ~300 in last 5 minutes → ~1/s → trivial

---

## 8. Monitoring

```bash
# PM2 status
docker exec prod-server pm2 status

# PM2 logs
docker exec prod-server pm2 logs

# MongoDB stats
docker exec prod-mongo mongosh --eval "db.serverStatus().connections"

# Redis info
docker exec prod-redis redis-cli -a YOUR_REDIS_PASSWORD info stats
```

---

## 9. Security Hardening (host level)

```bash
# UFW firewall — only expose 80, 443, and SSH
ufw default deny incoming
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# Fail2ban for SSH brute force
apt install fail2ban -y
systemctl enable fail2ban

# Disable root SSH login
sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart sshd
```

---

## 10. Backup Strategy

```bash
# Daily MongoDB backup to SSD
cat > /etc/cron.daily/mongo-backup << 'EOF'
#!/bin/bash
BACKUP_DIR="/data/backups/mongo/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"
docker exec prod-mongo mongodump --out /tmp/mongodump
docker cp prod-mongo:/tmp/mongodump "$BACKUP_DIR"
# Keep 30 days
find /data/backups/mongo -maxdepth 1 -mtime +30 -exec rm -rf {} \;
EOF
chmod +x /etc/cron.daily/mongo-backup
```
