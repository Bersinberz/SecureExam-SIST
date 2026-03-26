module.exports = {
  apps: [{
    name: 'secure-exam-api',
    script: './dist/server.js',
    // Use fork mode — cluster mode conflicts with worker_threads used in code execution
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    // Logging
    log_file:   './logs/combined.log',
    out_file:   './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    // Restart policy
    autorestart:      true,
    max_restarts:     10,
    min_uptime:       '10s',
    restart_delay:    4000,
    max_memory_restart: '512M',
    // Graceful shutdown
    listen_timeout: 5000,
    kill_timeout:   5000,
    // Disable watch in production
    watch: false
  }]
};
