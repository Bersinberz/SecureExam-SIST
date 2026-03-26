import { Request, Response, NextFunction } from "express";

/**
 * Lightweight concurrency limiter.
 *
 * Separates "heavy" routes (code execution) from "light" routes (auth, DB reads)
 * so a flood of run-code requests cannot starve logins or submissions.
 *
 * Usage:
 *   app.use("/api/execute", heavyQueue, ...)   ← tight limit
 *   app.use("/api/auth",    lightQueue, ...)   ← generous limit
 *   app.use("/api/...",     requestQueue, ...) ← default
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
      res.on("finish", () => {
        active--;
        next();
      });
      res.on("close", () => {
        // client disconnected before finish
        active--;
        next();
      });
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
// 50 concurrent, queue up to 200, 15 s wait
export const requestQueue = makeQueue(50, 200, 15_000);

// Code execution — CPU/memory heavy, keep tight
// 10 concurrent (matches pLimit in codeExecutionController), queue up to 100, 30 s wait
export const heavyQueue = makeQueue(10, 100, 30_000);

// Light routes — health, status
// Effectively unlimited
export const lightQueue = makeQueue(500, 0, 5_000);
