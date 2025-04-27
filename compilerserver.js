const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

const app = express();
const CODE_DIR = path.join(__dirname, 'code_exec');

// Middleware
app.use(express.json());
app.use(cors());

// Ensure temporary directory exists
if (!fs.existsSync(CODE_DIR)) {
    fs.mkdirSync(CODE_DIR, { recursive: true });
}

// Cleanup function
const cleanup = () => {
    fs.rmSync(CODE_DIR, { recursive: true, force: true });
    fs.mkdirSync(CODE_DIR, { recursive: true });
};

// Function to run Python code
const runPython = (code) => {
    return new Promise((resolve) => {
        const filePath = path.join(CODE_DIR, "script.py");
        fs.writeFileSync(filePath, code);

        exec(`python3 "${filePath}"`, { timeout: 5000 }, (error, stdout, stderr) => {
            resolve(stdout.trim() || stderr.trim() || error?.message);
        });
    });
};


// Function to compile & run Java code
const runJava = (code) => {
    return new Promise((resolve) => {
        const filePath = path.join(CODE_DIR, 'Main.java');
        fs.writeFileSync(filePath, code);   

        exec(`javac ${filePath}`, { timeout: 10000 }, (error, stdout, stderr) => {
            if (stderr) return resolve(stderr);

            exec(`java -cp ${CODE_DIR} Main`, { timeout: 10000 }, (error, stdout, stderr) => {
                resolve(stdout || stderr || error?.message);
            });
        });
    });
};

// Function to compile & run C code
const runC = (code) => {
    return new Promise((resolve) => {
        const filePath = path.join(CODE_DIR, 'main.c');
        const outputPath = path.join(CODE_DIR, 'main');
        fs.writeFileSync(filePath, code);

        exec(`gcc -o ${outputPath} ${filePath}`, { timeout: 10000 }, (error, stdout, stderr) => {
            if (stderr) return resolve(stderr);

            exec(outputPath, { timeout: 10000 }, (error, stdout, s3tderr) => {
                resolve(stdout || stderr || error?.message);
            });
        });
    });
};

// Function to compile & run C++ code
const runCpp = (code) => {
    return new Promise((resolve) => {
        const filePath = path.join(CODE_DIR, 'main.cpp');
        const outputPath = path.join(CODE_DIR, 'main');
        fs.writeFileSync(filePath, code);

        exec(`g++ -o ${outputPath} ${filePath}`, { timeout: 10000 }, (error, stdout, stderr) => {
            if (stderr) return resolve(stderr);

            exec(outputPath, { timeout: 10000 }, (error, stdout, stderr) => {
                resolve(stdout || stderr || error?.message);
            });
        });
    });
};

// Function to run JavaScript code using Node.js
const runJavaScript = (code) => {
    return new Promise((resolve) => {
        const filePath = path.join(CODE_DIR, "script.js");
        fs.writeFileSync(filePath, code);

        exec(`node "${filePath}"`, { timeout: 10000 }, (error, stdout, stderr) => {
            resolve(stdout.trim() || stderr.trim() || error?.message);
        });
    });
};

// API Endpoint to run code
app.post('/run-code', async (req, res) => {
    const { language, code } = req.body;
    if (!language || !code) {
        return res.status(400).json({ output: 'Error: Language and code are required.' });
    }

    try {
        let output;
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

        return res.json({ output });
    } catch (error) {
        return res.status(500).json({ output: `Error: ${error.message}` });
    } finally {
        cleanup();
    }
});

// Function to get the device's IP address
const getDeviceIp = () => {
    const interfaces = os.networkInterfaces();
    for (const interfaceName of Object.keys(interfaces)) {
        for (const iface of interfaces[interfaceName]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '0.0.0.0';
};

// Start the server
const PORT = process.env.PORT || 3000;
const IP = getDeviceIp();
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://${IP}:${PORT}`);
});