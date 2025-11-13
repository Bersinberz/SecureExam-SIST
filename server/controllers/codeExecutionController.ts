import { Request, Response } from 'express';
import { Worker } from 'worker_threads';
import path from 'path';
import { v4 as uuidv4 } from "uuid";
import pLimit from "p-limit";
import fs from 'fs';

const CODE_DIR = path.join(__dirname, '../temp_code_exec');
const LOGS_DIR = path.join(__dirname, '../logs');
const LOG_FILE = path.join(LOGS_DIR, 'codeRun.log');
const limit = pLimit(6);

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

interface RunCodeRequest {
  language: string;
  code: string;
}

interface ApiResponse<T> {
  success: boolean;
  output?: string;
  error?: string;
  language?: string;
  message?: string;
}

// Logger function
const logger = {
  info: (message: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] INFO: ${message} ${meta ? JSON.stringify(meta) : ''}\n`;
    fs.appendFileSync(LOG_FILE, logMessage);
  },
  warn: (message: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] WARN: ${message} ${meta ? JSON.stringify(meta) : ''}\n`;
    fs.appendFileSync(LOG_FILE, logMessage);
  },
  error: (message: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ERROR: ${message} ${meta ? JSON.stringify(meta) : ''}\n`;
    fs.appendFileSync(LOG_FILE, logMessage);
  }
};

const uniqueFile = (ext: string) => `${Date.now()}-${uuidv4()}${ext}`;

// Optimized worker code
const workerCode = `
const { workerData, parentPort } = require('worker_threads');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const runProcess = (command, args, timeout) => {
  return new Promise((resolve) => {
    const child = spawn(command, args, { 
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false
    });
    
    let stdout = '';
    let stderr = '';
    let killed = false;

    const timer = setTimeout(() => {
      killed = true;
      child.kill('SIGTERM');
      resolve({ stdout, stderr, code: 124, killed: true });
    }, timeout);

    const onData = (data) => stdout += data.toString();
    const onError = (data) => stderr += data.toString();

    child.stdout.on('data', onData);
    child.stderr.on('data', onError);

    child.on('close', (code) => {
      clearTimeout(timer);
      child.stdout.off('data', onData);
      child.stderr.off('data', onError);
      resolve({ 
        stdout: stdout.trim(), 
        stderr: stderr.trim(), 
        code: killed ? 124 : (code || 0),
        killed 
      });
    });
  });
};

const executeCode = async (data) => {
  const { language, code, filePath, outputPath, timeout } = data;
  
  try {
    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, code);

    const cleanup = async () => {
      await fs.unlink(filePath).catch(() => {});
      if (outputPath) await fs.unlink(outputPath).catch(() => {});
      if (language === 'java') {
        await fs.unlink(filePath.replace('.java', '.class')).catch(() => {});
      }
    };

    let result;

    switch (language) {
      case 'python': {
        const { stdout, stderr, code, killed } = await runProcess('python3', [filePath], timeout);
        await cleanup();
        result = {
          success: code === 0,
          output: stdout || stderr || 'Execution completed with no output',
          error: killed ? 'Execution timeout' : (code !== 0 ? \`Error: \${stderr}\` : undefined)
        };
        break;
      }

      case 'javascript': {
        const { stdout, stderr, code, killed } = await runProcess('node', [filePath], timeout);
        await cleanup();
        result = {
          success: code === 0,
          output: stdout || stderr || 'Execution completed with no output',
          error: killed ? 'Execution timeout' : (code !== 0 ? \`Error: \${stderr}\` : undefined)
        };
        break;
      }

      case 'java': {
        const className = path.basename(filePath, '.java');
        const { stdout: compileStdout, stderr: compileStderr, code: compileCode } = 
          await runProcess('javac', [filePath], 10000);
        
        if (compileCode !== 0) {
          await cleanup();
          result = { success: false, error: \`Compilation Error: \${compileStderr}\` };
        } else {
          const { stdout: runStdout, stderr: runStderr, code: runCode, killed } = 
            await runProcess('java', ['-cp', path.dirname(filePath), className], timeout);
          await cleanup();
          result = {
            success: runCode === 0,
            output: runStdout || runStderr || 'Execution completed with no output',
            error: killed ? 'Execution timeout' : (runCode !== 0 ? \`Runtime Error: \${runStderr}\` : undefined)
          };
        }
        break;
      }

      case 'c': {
        if (!outputPath) {
          await cleanup();
          result = { success: false, error: 'Output path required for C compilation' };
          break;
        }

        const { stdout: compileStdout, stderr: compileStderr, code: compileCode } = 
          await runProcess('gcc', ['-o', outputPath, filePath], 10000);
        
        if (compileCode !== 0) {
          await cleanup();
          result = { success: false, error: \`Compilation Error: \${compileStderr}\` };
        } else {
          const { stdout: runStdout, stderr: runStderr, code: runCode, killed } = 
            await runProcess(outputPath, [], timeout);
          await cleanup();
          result = {
            success: runCode === 0,
            output: runStdout || runStderr || 'Execution completed with no output',
            error: killed ? 'Execution timeout' : (runCode !== 0 ? \`Runtime Error: \${runStderr}\` : undefined)
          };
        }
        break;
      }

      case 'cpp': {
        if (!outputPath) {
          await cleanup();
          result = { success: false, error: 'Output path required for C++ compilation' };
          break;
        }

        const { stdout: compileStdout, stderr: compileStderr, code: compileCode } = 
          await runProcess('g++', ['-o', outputPath, filePath], 10000);
        
        if (compileCode !== 0) {
          await cleanup();
          result = { success: false, error: \`Compilation Error: \${compileStderr}\` };
        } else {
          const { stdout: runStdout, stderr: runStderr, code: runCode, killed } = 
            await runProcess(outputPath, [], timeout);
          await cleanup();
          result = {
            success: runCode === 0,
            output: runStdout || runStderr || 'Execution completed with no output',
            error: killed ? 'Execution timeout' : (runCode !== 0 ? \`Runtime Error: \${runStderr}\` : undefined)
          };
        }
        break;
      }

      default:
        await cleanup();
        result = { success: false, error: \`Unsupported language: \${language}\` };
    }

    return result;
  } catch (error) {
    // Final cleanup attempt
    await fs.unlink(filePath).catch(() => {});
    if (outputPath) await fs.unlink(outputPath).catch(() => {});
    if (language === 'java') {
      await fs.unlink(filePath.replace('.java', '.class')).catch(() => {});
    }
    
    return { 
      success: false, 
      error: \`Worker error: \${error.message}\` 
    };
  }
};

// Execute and send result
executeCode(workerData)
  .then(result => parentPort.postMessage(result))
  .catch(error => parentPort.postMessage({ 
    success: false, 
    error: \`Worker execution failed: \${error.message}\` 
  }));
`;

const runInWorker = (language: string, code: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const fileExts = {
      python: '.py',
      javascript: '.js', 
      java: '.java',
      c: '.c',
      cpp: '.cpp'
    };

    const fileName = uniqueFile(fileExts[language as keyof typeof fileExts] || '.txt');
    const filePath = path.join(CODE_DIR, fileName);
    const outputPath = ['c', 'cpp'].includes(language) 
      ? path.join(CODE_DIR, fileName.replace(fileExts[language as keyof typeof fileExts], ''))
      : undefined;

    const timeouts = {
      python: 10000,
      javascript: 10000,
      java: 15000,
      c: 15000,
      cpp: 15000
    };

    const timeout = timeouts[language as keyof typeof timeouts] || 10000;

    logger.info('Starting code execution', { language, fileName, timeout });

    const worker = new Worker(workerCode, { 
      eval: true,
      workerData: {
        language,
        code,
        filePath,
        outputPath,
        timeout
      }
    });

    const workerTimeout = setTimeout(() => {
      logger.warn('Worker execution timeout', { language, fileName, timeout });
      worker.terminate();
      reject(new Error('Execution timeout'));
    }, timeout + 5000);

    worker.on('message', (result: any) => {
      clearTimeout(workerTimeout);
      worker.terminate();
      
      if (result.success) {
        logger.info('Code execution completed successfully', { 
          language, 
          fileName,
          outputLength: result.output?.length 
        });
      } else {
        logger.warn('Code execution failed', { 
          language, 
          fileName, 
          error: result.error 
        });
      }
      
      resolve(result.success ? (result.output || 'Execution completed') : (result.error || 'Unknown error'));
    });

    worker.on('error', (error) => {
      clearTimeout(workerTimeout);
      worker.terminate();
      logger.error('Worker thread error', { language, fileName, error: error.message });
      reject(error);
    });

    worker.on('exit', (code) => {
      clearTimeout(workerTimeout);
      if (code !== 0) {
        logger.warn('Worker exited with non-zero code', { language, fileName, exitCode: code });
      }
    });
  });
};

export const runCodeController = async (req: Request<{}, {}, RunCodeRequest>, res: Response<ApiResponse<any>>): Promise<void> => {
  const { language, code } = req.body;
  
  // Input validation
  if (!language || !code?.trim()) {
    logger.warn('Invalid request - missing language or code');
    res.status(400).json({ 
      success: false,
      error: 'Language and non-empty code are required'
    });
    return;
  }

  const supportedLanguages = ['python', 'java', 'c', 'cpp', 'javascript'];
  if (!supportedLanguages.includes(language)) {
    logger.warn('Unsupported language requested', { language, supportedLanguages });
    res.status(400).json({ 
      success: false,
      error: `Unsupported language. Supported: ${supportedLanguages.join(', ')}`
    });
    return;
  }

  try {
    logger.info('Processing code execution request', { language, codeLength: code.length });
    const output = await limit(() => runInWorker(language, code.trim()));
    
    logger.info('Request completed successfully', { language });
    res.json({ success: true, output, language });
    
  } catch (error: any) {
    logger.error('Code execution controller error', { 
      language, 
      error: error.message,
      stack: error.stack 
    });
    
    res.status(500).json({ 
      success: false,
      error: `Server error: ${error.message}`
    });
  }
};