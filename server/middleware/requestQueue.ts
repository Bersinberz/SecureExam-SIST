import { Request, Response, NextFunction } from "express";

const MAX_CONCURRENT = 100;

const MAX_QUEUE_SIZE = 200;

const QUEUE_TIMEOUT = 15000;

let activeRequests = 0;
const queue: Array<{
  run: () => void;
  timeoutId: NodeJS.Timeout;
}> = [];

export const requestQueue = (req: Request, res: Response, next: NextFunction) => {
  const run = () => {
    activeRequests++;

    res.on("finish", () => {
      activeRequests--;

      if (queue.length > 0) {
        const next = queue.shift();
        if (next) {
          clearTimeout(next.timeoutId);
          next.run();
        }
      }
    });

    try {
      next();
    } catch (err) {
      activeRequests--;
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  if (activeRequests < MAX_CONCURRENT) {
    run();
  } else {
    if (queue.length >= MAX_QUEUE_SIZE) {
      return res.status(503).json({
        success: false,
        message: "Server busy, please try again later",
      });
    }

    const timeoutId = setTimeout(() => {
      const index = queue.findIndex(item => item.timeoutId === timeoutId);
      if (index !== -1) queue.splice(index, 1);
      res.status(503).json({
        success: false,
        message: "Server busy, request timed out while waiting in queue",
      });
    }, QUEUE_TIMEOUT);

    queue.push({ run, timeoutId });
  }
};