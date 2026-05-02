/**
 * PM2 Ecosystem Config — Production
 *
 * Hardware: Dual NVIDIA A5000 GPU, 2TB SSD
 * Target:   300+ concurrent users
 *
 * Architecture decision:
 *   Fork mode (not cluster) because the code execution controller uses
 *   worker_threads internally. PM2 cluster mode + worker_threads can cause
 *   issues with shared state (activeStudents Set, pLimit).
 *
 *   Instead we run 4 independent fork-mode instances behind Nginx upstream
 *   load balancing across ports 5000-5003. Each instance handles ~75 users
 *   concurrently with 20 code execution slots = 80 simultaneous runs total.
 *
 *   If you only want a single port, set instances: 1 and let the requestQueue
 *   handle concurrency — it will still handle 300 users, just with more queuing.
 */
module.exports = {
  apps: [
    {
      name:      'secure-exam-api',
      script:    './dist/server.js',
      instances: 4,          // 4 workers — tune to CPU core count
      exec_mode: 'fork',     // NOT cluster — worker_threads compatibility
      env: {
        NODE_ENV: 'production',
        PORT:     5000,       // PM2 will auto-increment: 5000, 5001, 5002, 5003
      },

      // ── Logging ──────────────────────────────────────────────────────────
      log_file:        './logs/combined.log',
      out_file:        './logs/out.log',
      error_file:      './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs:      true,

      // ── Restart policy ───────────────────────────────────────────────────
      autorestart:        true,
      max_restarts:       10,
      min_uptime:         '10s',
      restart_delay:      4000,
      max_memory_restart: '1G',   // restart if a worker leaks past 1 GB

      // ── Graceful shutdown ────────────────────────────────────────────────
      listen_timeout: 8000,
      kill_timeout:   15000,

      // ── Misc ─────────────────────────────────────────────────────────────
      watch:                    false,
      source_map_support:       false,
      PM2_DISABLE_INTERACTION:  true,
    },
  ],
};
