import { Request, Response, NextFunction } from "express";

/**
 * Lightweight concurrency limiter.
 *
 * Separates "heavy" routes (code execution) from "light" routes (auth, DB reads)
 * so a flood of run-code requests cannot starve logins or submissions.
 *
 * Sizing for 300+ concurrent users:
 *   - requestQueue: 150 concurrent handles burst traffic across all API routes
 *   - heavyQueue:   20 concurrent for code execution (CPU-bound, each takes 5-15s)
 *     With 4 PM2 workers that's 80 simultaneous code runs — enough for 300 students
 *     where not everyone runs code at the exact same millisecond.
 *
 * Usage:
 *   app.use("/api/execute", heavyQueue, ...)   ← tight limit
 *   app.use("/api/auth",    requestQueue, ...) ← generous limit
 */

interface QueueEntry {
  run: () => void;
  timeoutId: NodeJS.Timeout;
}

function makeQueue(maxConcurrent: number, maxQueued: number, timeoutMs: number) {
  let active = 0;
  const waiting: QueueEntry[] = [];

  const next = () => {
    if (waiting.length === 0 || active >= maxConcurrent) return;
    const entry = waiting.shift()!;
    clearTimeout(entry.timeoutId);
    entry.run();
  };

  return (req: Request, res: Response, nextFn: NextFunction) => {
    const run = () => {
      active++;
      res.on("finish", () => { active--; next(); });
      res.on("close",  () => { active--; next(); }); // client disconnected
      nextFn();
    };

    if (active < maxConcurrent) {
      run();
      return;
    }

    if (waiting.length >= maxQueued) {
      return res.status(503).json({
        success: false,
        message: "Server is busy. Please try again in a moment.",
      });
    }

    const timeoutId = setTimeout(() => {
      const idx = waiting.findIndex(e => e.timeoutId === timeoutId);
      if (idx !== -1) waiting.splice(idx, 1);
      res.status(503).json({
        success: false,
        message: "Request timed out waiting in queue. Please try again.",
      });
    }, timeoutMs);

    waiting.push({ run, timeoutId });
  };
}

// General API routes — auth, exam management, table reads
// 150 concurrent, queue up to 500, 20s wait
export const requestQueue = makeQueue(150, 500, 20_000);

// Code execution — CPU/memory heavy, keep tight per worker
// 20 concurrent (matches pLimit in codeExecutionController), queue up to 200, 45s wait
// With 4 PM2 workers = 80 simultaneous executions across the cluster
export const heavyQueue = makeQueue(20, 200, 45_000);

// Light routes — health, status (effectively unlimited)
export const lightQueue = makeQueue(1000, 0, 5_000);
