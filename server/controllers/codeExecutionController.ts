import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

// Use __dirname directly since we're in CommonJS
const CODE_DIR = path.join(__dirname, '../temp_code_exec');

// Types
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
  timestamp?: string;
  supportedLanguages?: string[];
}

// Ensure temporary directory exists
const ensureCodeDir = (): void => {
  if (!fs.existsSync(CODE_DIR)) {
    fs.mkdirSync(CODE_DIR, { recursive: true });
  }
};

// Cleanup function
const cleanup = (): void => {
  try {
    if (fs.existsSync(CODE_DIR)) {
      const files = fs.readdirSync(CODE_DIR);
      files.forEach(file => {
        const filePath = path.join(CODE_DIR, file);
        try {
          fs.unlinkSync(filePath);
        } catch (error) {
          console.error(`Error deleting file ${filePath}:`, error);
        }
      });
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
};

// Function to run Python code
const runPython = (code: string): Promise<string> => {
  return new Promise((resolve) => {
    ensureCodeDir();
    const filePath = path.join(CODE_DIR, "script.py");
    fs.writeFileSync(filePath, code);

    exec(`python3 "${filePath}"`, { timeout: 5000 }, (error, stdout, stderr) => {
      if (error) {
        resolve(`Error: ${error.message}`);
      } else {
        resolve(stdout.trim() || stderr.trim() || 'Execution completed with no output');
      }
    });
  });
};

// Function to compile & run Java code
const runJava = (code: string): Promise<string> => {
  return new Promise((resolve) => {
    ensureCodeDir();
    const filePath = path.join(CODE_DIR, 'Main.java');
    fs.writeFileSync(filePath, code);   

    exec(`javac "${filePath}"`, { timeout: 10000 }, (compileError, compileStdout, compileStderr) => {
      if (compileStderr) {
        resolve(`Compilation Error: ${compileStderr}`);
        return;
      }

      exec(`java -cp "${CODE_DIR}" Main`, { timeout: 10000 }, (runError, runStdout, runStderr) => {
        if (runError) {
          resolve(`Runtime Error: ${runError.message}`);
        } else {
          resolve(runStdout || runStderr || 'Execution completed with no output');
        }
      });
    });
  });
};

// Function to compile & run C code
const runC = (code: string): Promise<string> => {
  return new Promise((resolve) => {
    ensureCodeDir();
    const filePath = path.join(CODE_DIR, 'main.c');
    const outputPath = path.join(CODE_DIR, 'main');
    fs.writeFileSync(filePath, code);

    exec(`gcc -o "${outputPath}" "${filePath}"`, { timeout: 10000 }, (compileError, compileStdout, compileStderr) => {
      if (compileStderr) {
        resolve(`Compilation Error: ${compileStderr}`);
        return;
      }

      exec(`"${outputPath}"`, { timeout: 10000 }, (runError, runStdout, runStderr) => {
        if (runError) {
          resolve(`Runtime Error: ${runError.message}`);
        } else {
          resolve(runStdout || runStderr || 'Execution completed with no output');
        }
      });
    });
  });
};

// Function to compile & run C++ code
const runCpp = (code: string): Promise<string> => {
  return new Promise((resolve) => {
    ensureCodeDir();
    const filePath = path.join(CODE_DIR, 'main.cpp');
    const outputPath = path.join(CODE_DIR, 'main');
    fs.writeFileSync(filePath, code);

    exec(`g++ -o "${outputPath}" "${filePath}"`, { timeout: 10000 }, (compileError, compileStdout, compileStderr) => {
      if (compileStderr) {
        resolve(`Compilation Error: ${compileStderr}`);
        return;
      }

      exec(`"${outputPath}"`, { timeout: 10000 }, (runError, runStdout, runStderr) => {
        if (runError) {
          resolve(`Runtime Error: ${runError.message}`);
        } else {
          resolve(runStdout || runStderr || 'Execution completed with no output');
        }
      });
    });
  });
};

// Function to run JavaScript code using Node.js
const runJavaScript = (code: string): Promise<string> => {
  return new Promise((resolve) => {
    ensureCodeDir();
    const filePath = path.join(CODE_DIR, "script.js");
    fs.writeFileSync(filePath, code);

    exec(`node "${filePath}"`, { timeout: 10000 }, (error, stdout, stderr) => {
      if (error) {
        resolve(`Error: ${error.message}`);
      } else {
        resolve(stdout.trim() || stderr.trim() || 'Execution completed with no output');
      }
    });
  });
};

// Main controller function
export const runCodeController = async (req: Request<{}, {}, RunCodeRequest>, res: Response<ApiResponse<any>>): Promise<void> => {
  const { language, code } = req.body;
  
  // Validation
  if (!language || !code) {
    res.status(400).json({ 
      success: false,
      error: 'Language and code are required.',
      output: 'Error: Language and code are required.'
    });
    return;
  }

  if (typeof code !== 'string' || code.trim().length === 0) {
    res.status(400).json({ 
      success: false,
      error: 'Code cannot be empty.',
      output: 'Error: Code cannot be empty.'
    });
    return;
  }

  const supportedLanguages = ['python', 'java', 'c', 'cpp', 'javascript'];
  if (!supportedLanguages.includes(language)) {
    res.status(400).json({ 
      success: false,
      error: 'Unsupported language.',
      output: 'Error: Unsupported language. Supported languages: python, java, c, cpp, javascript'
    });
    return;
  }

  try {
    console.log(`Executing ${language} code...`);
    
    let output: string;
    switch (language) {
      case 'python':
        output = await runPython(code);
        break;
      case 'java':
        output = await runJava(code);
        break;
      case 'c':
        output = await runC(code);
        break;
      case 'cpp':
        output = await runCpp(code);
        break;
      case 'javascript':
        output = await runJavaScript(code);
        break;
      default:
        output = 'Error: Unsupported language.';
    }

    
    res.json({ 
      success: true,
      output: output,
      language: language
    });
    
  } catch (error) {
    console.error('Code execution error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ 
      success: false,
      error: `Server error: ${errorMessage}`,
      output: `Error: ${errorMessage}`
    });
  } finally {
    setTimeout(cleanup, 1000);
  }
};