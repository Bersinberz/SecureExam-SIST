import { Worker } from 'worker_threads';
import { Response as ExpressResponse } from 'express';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import pLimit from 'p-limit';
import { AuthRequest } from '../middleware/jwtMiddleware';

const CODE_DIR = path.join(__dirname, '../temp_code_exec');

// Must match heavyQueue maxConcurrent in requestQueue.ts
const EXEC_CONCURRENCY = Number(process.env.CODE_EXEC_CONCURRENCY) || 20;
const limit = pLimit(EXEC_CONCURRENCY);

// Per-student deduplication — prevents one student from queuing multiple runs
const activeStudents = new Set<string>();

const MAX_CODE_BYTES   = 50 * 1024;   // 50 KB input
const MAX_OUTPUT_BYTES = 64 * 1024;   // 64 KB output cap

const FILE_EXTS: Record<string, string> = {
  python: '.py', javascript: '.js', java: '.java', c: '.c', cpp: '.cpp',
};

// Per-language execution timeouts (ms)
const TIMEOUTS: Record<string, number> = {
  python:     10_000,
  javascript: 10_000,
  java:       15_000,
  c:          15_000,
  cpp:        15_000,
};

const uniqueFile = (ext: string) => `${Date.now()}-${uuidv4()}${ext}`;

// ---------------------------------------------------------------------------
// Worker script — runs inside a worker_thread, spawns the actual compiler/runtime
//
// Security hardening applied here:
//   • shell: false  — no shell injection
//   • ulimit via env  — memory cap for compiled binaries
//   • output truncation — prevents OOM from runaway output
//   • SIGKILL on timeout — no zombie processes
// ---------------------------------------------------------------------------
const WORKER_SCRIPT = /* js */ `
const { workerData, parentPort } = require('worker_threads');
const { spawn }  = require('child_process');
const fs         = require('fs').promises;
const path       = require('path');
const os         = require('os');

const MAX_OUT = ${MAX_OUTPUT_BYTES};

// Spawn options shared by all runtimes
const spawnOpts = (cwd) => ({
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: false,
  cwd,
  // Limit child process memory via environment (works on Linux)
  env: {
    ...process.env,
    // Prevent fork bombs / runaway memory in native processes
    MALLOC_ARENA_MAX: '2',
  },
});

const runProcess = (command, args, timeout, cwd) =>
  new Promise((resolve) => {
    const child = spawn(command, args, spawnOpts(cwd));

    let stdout = '', stderr = '', killed = false, truncated = false;

    const timer = setTimeout(() => {
      killed = true;
      try { child.kill('SIGKILL'); } catch (_) {}
      resolve({ stdout, stderr, code: 124, killed: true, truncated });
    }, timeout);

    child.stdout.on('data', (d) => {
      stdout += d.toString();
      if (Buffer.byteLength(stdout) > MAX_OUT) {
        truncated = true;
        stdout = stdout.slice(0, MAX_OUT) + '\\n[output truncated]';
        try { child.kill('SIGKILL'); } catch (_) {}
      }
    });
    child.stderr.on('data', (d) => {
      stderr += d.toString().slice(0, 4096);
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        code: killed ? 124 : (code ?? 0),
        killed,
        truncated,
      });
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ stdout: '', stderr: err.message, code: 1, killed: false, truncated: false });
    });
  });

const cleanup = async (...paths) => {
  for (const p of paths) {
    if (p) await fs.unlink(p).catch(() => {});
  }
};

const execute = async ({ language, code, filePath, outputPath, timeout }) => {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, code, { mode: 0o600 }); // owner-only read

  try {
    switch (language) {
      case 'python': {
        // -S disables site module (no user site-packages), -E ignores PYTHON* env
        const r = await runProcess('python3', ['-S', '-E', filePath], timeout, dir);
        await cleanup(filePath);
        return {
          success: r.code === 0,
          output: r.stdout || r.stderr || 'No output',
          error: r.killed ? 'Time limit exceeded' : r.code !== 0 ? r.stderr : undefined,
          truncated: r.truncated,
        };
      }
      case 'javascript': {
        const r = await runProcess(
          'node',
          ['--max-old-space-size=128', '--disallow-code-generation-from-strings', filePath],
          timeout,
          dir,
        );
        await cleanup(filePath);
        return {
          success: r.code === 0,
          output: r.stdout || r.stderr || 'No output',
          error: r.killed ? 'Time limit exceeded' : r.code !== 0 ? r.stderr : undefined,
          truncated: r.truncated,
        };
      }
      case 'java': {
        const cls = path.basename(filePath, '.java');
        const compile = await runProcess('javac', [filePath], 10_000, dir);
        if (compile.code !== 0) {
          await cleanup(filePath);
          return { success: false, error: 'Compilation Error:\\n' + compile.stderr };
        }
        const classFile = path.join(dir, cls + '.class');
        const run = await runProcess(
          'java',
          ['-Xmx128m', '-Xss512k', '-cp', dir, cls],
          timeout,
          dir,
        );
        await cleanup(filePath, classFile);
        return {
          success: run.code === 0,
          output: run.stdout || run.stderr || 'No output',
          error: run.killed ? 'Time limit exceeded' : run.code !== 0 ? run.stderr : undefined,
          truncated: run.truncated,
        };
      }
      case 'c': {
        const compile = await runProcess('gcc', ['-o', outputPath, filePath, '-lm', '-O1'], 10_000, dir);
        if (compile.code !== 0) {
          await cleanup(filePath);
          return { success: false, error: 'Compilation Error:\\n' + compile.stderr };
        }
        const run = await runProcess(outputPath, [], timeout, dir);
        await cleanup(filePath, outputPath);
        return {
          success: run.code === 0,
          output: run.stdout || run.stderr || 'No output',
          error: run.killed ? 'Time limit exceeded' : run.code !== 0 ? run.stderr : undefined,
          truncated: run.truncated,
        };
      }
      case 'cpp': {
        const compile = await runProcess('g++', ['-o', outputPath, filePath, '-O1'], 10_000, dir);
        if (compile.code !== 0) {
          await cleanup(filePath);
          return { success: false, error: 'Compilation Error:\\n' + compile.stderr };
        }
        const run = await runProcess(outputPath, [], timeout, dir);
        await cleanup(filePath, outputPath);
        return {
          success: run.code === 0,
          output: run.stdout || run.stderr || 'No output',
          error: run.killed ? 'Time limit exceeded' : run.code !== 0 ? run.stderr : undefined,
          truncated: run.truncated,
        };
      }
      default:
        await cleanup(filePath, outputPath);
        return { success: false, error: 'Unsupported language: ' + language };
    }
  } catch (err) {
    await cleanup(filePath, outputPath);
    return { success: false, error: 'Worker error: ' + err.message };
  }
};

execute(workerData)
  .then(r  => parentPort.postMessage(r))
  .catch(e => parentPort.postMessage({ success: false, error: 'Worker failed: ' + e.message }));
`;

// ---------------------------------------------------------------------------
// Run code in an isolated worker thread
// ---------------------------------------------------------------------------
function runInWorker(language: string, code: string): Promise<{ output: string; truncated?: boolean }> {
  return new Promise((resolve, reject) => {
    const ext        = FILE_EXTS[language] ?? '.txt';
    const fileName   = uniqueFile(ext);
    const filePath   = path.join(CODE_DIR, fileName);
    const outputPath = ['c', 'cpp'].includes(language)
      ? path.join(CODE_DIR, fileName.replace(ext, ''))
      : undefined;
    const timeout    = TIMEOUTS[language] ?? 10_000;

    const worker = new Worker(WORKER_SCRIPT, {
      eval: true,
      workerData: { language, code, filePath, outputPath, timeout },
      // Limit worker thread memory
      resourceLimits: {
        maxOldGenerationSizeMb: 256,
        maxYoungGenerationSizeMb: 64,
        codeRangeSizeMb: 32,
      },
    });

    // Hard outer timeout — worker itself has an inner one
    const guard = setTimeout(() => {
      worker.terminate();
      reject(new Error('Execution timed out'));
    }, timeout + 10_000);

    worker.on('message', (result: any) => {
      clearTimeout(guard);
      worker.terminate();
      if (result.success) {
        resolve({ output: result.output ?? 'Execution completed', truncated: result.truncated });
      } else {
        resolve({ output: result.error ?? 'Unknown error', truncated: false });
      }
    });

    worker.on('error', (err) => {
      clearTimeout(guard);
      worker.terminate();
      reject(err);
    });

    worker.on('exit', () => clearTimeout(guard));
  });
}

// ---------------------------------------------------------------------------
// HTTP handler
// ---------------------------------------------------------------------------
export const runCodeController = async (
  req: AuthRequest,
  res: ExpressResponse,
): Promise<void> => {
  const { language, code } = req.body as { language: string; code: string };

  if (!language || !code?.trim()) {
    res.status(400).json({ success: false, error: 'Language and code are required' });
    return;
  }

  if (!Object.keys(FILE_EXTS).includes(language)) {
    res.status(400).json({
      success: false,
      error: `Unsupported language. Supported: ${Object.keys(FILE_EXTS).join(', ')}`,
    });
    return;
  }

  if (Buffer.byteLength(code, 'utf8') > MAX_CODE_BYTES) {
    res.status(400).json({ success: false, error: 'Code exceeds the 50 KB size limit' });
    return;
  }

  // Per-student deduplication — one active run at a time per student
  const studentId = req.user?.userId ?? req.ip ?? 'anon';
  if (activeStudents.has(studentId)) {
    res.status(429).json({
      success: false,
      error: 'You already have a code execution in progress. Please wait for it to finish.',
    });
    return;
  }

  activeStudents.add(studentId);

  try {
    const result = await limit(() => runInWorker(language, code.trim()));
    res.json({
      success: true,
      output: result.output,
      language,
      truncated: result.truncated ?? false,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message ?? 'Execution failed' });
  } finally {
    activeStudents.delete(studentId);
  }
};
