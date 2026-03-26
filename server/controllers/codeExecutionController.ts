import { Request, Response } from 'express';
import { Worker } from 'worker_threads';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import pLimit from 'p-limit';
import { AuthRequest } from '../middleware/jwtMiddleware';

const CODE_DIR = path.join(__dirname, '../temp_code_exec');

// Must match heavyQueue maxConcurrent in requestQueue.ts
const limit = pLimit(10);

// Per-student deduplication — prevents one student from queuing multiple runs
const activeStudents = new Set<string>();

const MAX_CODE_BYTES  = 50 * 1024;       // 50 KB input
const MAX_OUTPUT_BYTES = 64 * 1024;      // 64 KB output cap

const FILE_EXTS: Record<string, string> = {
  python: '.py', javascript: '.js', java: '.java', c: '.c', cpp: '.cpp',
};
const TIMEOUTS: Record<string, number> = {
  python: 10_000, javascript: 10_000, java: 15_000, c: 15_000, cpp: 15_000,
};

const uniqueFile = (ext: string) => `${Date.now()}-${uuidv4()}${ext}`;

// ---------------------------------------------------------------------------
// Worker script — runs inside a worker_thread, spawns the actual compiler/runtime
// ---------------------------------------------------------------------------
const WORKER_SCRIPT = /* js */ `
const { workerData, parentPort } = require('worker_threads');
const { spawn }  = require('child_process');
const fs         = require('fs').promises;
const path       = require('path');

const MAX_OUT = ${MAX_OUTPUT_BYTES};

const runProcess = (command, args, timeout) =>
  new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });

    let stdout = '', stderr = '', killed = false, truncated = false;

    const timer = setTimeout(() => {
      killed = true;
      child.kill('SIGKILL');
      resolve({ stdout, stderr, code: 124, killed: true });
    }, timeout);

    child.stdout.on('data', (d) => {
      stdout += d.toString();
      if (Buffer.byteLength(stdout) > MAX_OUT) {
        truncated = true;
        stdout = stdout.slice(0, MAX_OUT) + '\\n[output truncated]';
        child.kill('SIGKILL');
      }
    });
    child.stderr.on('data', (d) => { stderr += d.toString().slice(0, 4096); });

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ stdout: stdout.trim(), stderr: stderr.trim(), code: killed ? 124 : (code ?? 0), killed, truncated });
    });
  });

const cleanup = async (filePath, outputPath, language) => {
  await fs.unlink(filePath).catch(() => {});
  if (outputPath) await fs.unlink(outputPath).catch(() => {});
  if (language === 'java') await fs.unlink(filePath.replace('.java', '.class')).catch(() => {});
};

const execute = async ({ language, code, filePath, outputPath, timeout }) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, code);

  try {
    switch (language) {
      case 'python': {
        const r = await runProcess('python3', [filePath], timeout);
        await cleanup(filePath, outputPath, language);
        return { success: r.code === 0, output: r.stdout || r.stderr || 'No output', error: r.killed ? 'Time limit exceeded' : r.code !== 0 ? r.stderr : undefined };
      }
      case 'javascript': {
        const r = await runProcess('node', ['--max-old-space-size=128', filePath], timeout);
        await cleanup(filePath, outputPath, language);
        return { success: r.code === 0, output: r.stdout || r.stderr || 'No output', error: r.killed ? 'Time limit exceeded' : r.code !== 0 ? r.stderr : undefined };
      }
      case 'java': {
        const cls = path.basename(filePath, '.java');
        const compile = await runProcess('javac', [filePath], 10_000);
        if (compile.code !== 0) { await cleanup(filePath, outputPath, language); return { success: false, error: 'Compilation Error: ' + compile.stderr }; }
        const run = await runProcess('java', ['-Xmx128m', '-cp', path.dirname(filePath), cls], timeout);
        await cleanup(filePath, outputPath, language);
        return { success: run.code === 0, output: run.stdout || run.stderr || 'No output', error: run.killed ? 'Time limit exceeded' : run.code !== 0 ? run.stderr : undefined };
      }
      case 'c': {
        const compile = await runProcess('gcc', ['-o', outputPath, filePath, '-lm'], 10_000);
        if (compile.code !== 0) { await cleanup(filePath, outputPath, language); return { success: false, error: 'Compilation Error: ' + compile.stderr }; }
        const run = await runProcess(outputPath, [], timeout);
        await cleanup(filePath, outputPath, language);
        return { success: run.code === 0, output: run.stdout || run.stderr || 'No output', error: run.killed ? 'Time limit exceeded' : run.code !== 0 ? run.stderr : undefined };
      }
      case 'cpp': {
        const compile = await runProcess('g++', ['-o', outputPath, filePath], 10_000);
        if (compile.code !== 0) { await cleanup(filePath, outputPath, language); return { success: false, error: 'Compilation Error: ' + compile.stderr }; }
        const run = await runProcess(outputPath, [], timeout);
        await cleanup(filePath, outputPath, language);
        return { success: run.code === 0, output: run.stdout || run.stderr || 'No output', error: run.killed ? 'Time limit exceeded' : run.code !== 0 ? run.stderr : undefined };
      }
      default:
        await cleanup(filePath, outputPath, language);
        return { success: false, error: 'Unsupported language: ' + language };
    }
  } catch (err) {
    await cleanup(filePath, outputPath, language);
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
function runInWorker(language: string, code: string): Promise<string> {
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
    });

    // Hard outer timeout — worker itself has an inner one
    const guard = setTimeout(() => {
      worker.terminate();
      reject(new Error('Execution timed out'));
    }, timeout + 8_000);

    worker.on('message', (result: any) => {
      clearTimeout(guard);
      worker.terminate();
      resolve(result.success
        ? (result.output ?? 'Execution completed')
        : (result.error  ?? 'Unknown error'));
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
  res: Response,
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
    const output = await limit(() => runInWorker(language, code.trim()));
    res.json({ success: true, output, language });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message ?? 'Execution failed' });
  } finally {
    activeStudents.delete(studentId);
  }
};
