let editor;
let currentTheme = "vs-dark";

// Configure Monaco Editor Loader
require.config({ paths: { vs: "https://unpkg.com/monaco-editor/min/vs" } });

// Load and Initialize Monaco Editor
require(["vs/editor/editor.main"], function () {
    editor = monaco.editor.create(document.getElementById("editor-container"), {
        value: "// Write your code here",
        language: "javascript",
        theme: currentTheme,
        automaticLayout: true,
    });
});

// Fetch exam and assigned question based on the student
document.addEventListener("DOMContentLoaded", async () => {
    const examNameElement = document.getElementById("exam-name");
    const timerElement = document.getElementById("timer");
    const assignedQuestionElement = document.getElementById("assigned-question");
    const userDetailsElement = document.getElementById("user-details");
    const submitButton = document.getElementById("quitButton");

    // Disable submit button initially
    submitButton.disabled = true;

    // Enable submit button after 5 minutes
    setTimeout(() => {
        submitButton.disabled = false;
    }, 300000);

    const urlParams = new URLSearchParams(window.location.search);
    const registerNumber = urlParams.get("registerNumber");

    if (!registerNumber) {
        alert("Register number not found. Please log in again.");
        return;
    }

    try {
        const response = await fetch(
            `http://13.49.46.147:5000/exam/get?registerNumber=${registerNumber}`
        );
        const data = await response.json();

        if (data.message === "Exams fetched successfully") {
            const exam = data.exams[0];
            examNameElement.textContent = exam.name;
            assignedQuestionElement.textContent =
                data.assignedQuestion || "No question assigned to you";
            userDetailsElement.textContent = `Register No: ${registerNumber} | Department: ${exam.department}`;

            const examDurationMinutes = parseInt(exam.time, 10);
            let remainingTime = examDurationMinutes * 60 - 1;

            const updateTimer = () => {
                const minutes = Math.floor(remainingTime / 60)
                    .toString()
                    .padStart(2, "0");
                const seconds = (remainingTime % 60).toString().padStart(2, "0");
                timerElement.textContent = `${minutes} : ${seconds}`;

                if (remainingTime > 0) {
                    remainingTime--;
                } else {
                    clearInterval(timerInterval);
                    showCountdownPopup();
                }
            };

            updateTimer();
            const timerInterval = setInterval(updateTimer, 1000);
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error("Error fetching exam details:", error);
        alert("Failed to fetch exam details");
    }
});

// Language Selector
const languageSelect = document.getElementById("language-select");
languageSelect.addEventListener("change", () => {
    const newLanguage = languageSelect.value;
    monaco.editor.setModelLanguage(editor.getModel(), newLanguage);
    editor.setValue(
        newLanguage === "python"
            ? "# Write your Python code here"
            : newLanguage === "java"
                ? "// Write your Java code here File name: Main.java"
                : newLanguage === "c"
                    ? "// Write your C code here"
                    : newLanguage === "cpp"
                        ? "// Write your C++ code here"
                        : "// Write your JavaScript code here"
    );
});

// Run Code Button
const runButton = document.getElementById("run-button");
const outputContent = document.getElementById("output-content");

runButton.addEventListener("click", async () => {
    const code = editor.getValue();
    const language = languageSelect.value;
    outputContent.textContent = "Running...";

    try {
        const response = await fetch("https://securexam.in/run-code", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ language, code }),
        });

        const result = await response.json();

        if (result && result.output) {
            outputContent.textContent = result.output.trim();
        } else {
            outputContent.textContent = "Execution finished with no output.";
        }
    } catch (error) {
        console.error("Fetch error:", error);
        outputContent.textContent = `Error: ${error.message}`;
    }
});


// Function to submit code
async function submitCode() {
    let registerNumber = new URLSearchParams(window.location.search).get(
        "registerNumber"
    );
    registerNumber = parseInt(registerNumber, 10);

    if (isNaN(registerNumber)) {
        alert("Invalid register number. Please log in again.");
        return;
    }

    const code = editor.getValue();
    const language = languageSelect.value;
    const assignedQuestion =
        document.getElementById("assigned-question").textContent;

    try {
        const response = await fetch("https://securexam.in/code/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                registerNumber,
                language,
                code,
                assignedQuestion,
            }),
        });

        const result = await response.json();

        if (result.message === "Code saved successfully") {
            showCountdownPopup();
        } else {
            alert("Failed to save code. Please try again.");
        }
    } catch (error) {
        console.error("Error submitting code:", error);
        alert("An error occurred while saving your code.");
    }
}

// Show confirmation popup when submitting the exam
function showConfirmationPopup() {
    const confirmationPopup = document.createElement("div");
    confirmationPopup.classList.add("popup-overlay");

    confirmationPopup.innerHTML = `
        <div class="popup-content">
            <p>Are you sure you want to finish and close the exam?</p>
            <button id="confirm-submit" class="popup-button">Yes, Submit</button>
            <button id="cancel-submit" class="popup-button">Cancel</button>
        </div>
    `;

    document.body.appendChild(confirmationPopup);

    document.getElementById("confirm-submit").addEventListener("click", () => {
        submitCode();
        confirmationPopup.remove();
    });

    document.getElementById("cancel-submit").addEventListener("click", () => {
        confirmationPopup.remove();
    });
}

// Function to show the countdown timer popup
function showCountdownPopup() {
    const countdownPopup = document.createElement("div");
    countdownPopup.classList.add("popup-overlay");

    countdownPopup.innerHTML = `
        <div class="popup-content">
            <p>Exam is submitted. You can close the app in <span id="countdown-timer">10</span> seconds.</p>
        </div>
    `;

    document.body.appendChild(countdownPopup);

    let countdown = 10;
    const countdownElement = document.getElementById("countdown-timer");

    const interval = setInterval(() => {
        countdownElement.textContent = countdown;
        countdown--;

        if (countdown < 0) {
            clearInterval(interval);
            try {
                window.close();
            } catch (e) {
                console.error("Error closing the window:", e);
            }

            setTimeout(() => {
                alert("Please manually close the browser window.");
            }, 100);
        }
    }, 1000);
}

// Quit Button Functionality
document
    .getElementById("quitButton")
    .addEventListener("click", showConfirmationPopup);

// Terminal functionality
const terminalContainer = document.getElementById('terminal-container');
const terminalContent = document.getElementById('terminal-content');
const clearTerminalBtn = document.getElementById('clear-terminal');
const collapseTerminalBtn = document.getElementById('terminal-collapse');
const killTerminalBtn = document.getElementById('terminal-kill');

let commandHistory = [];
let historyIndex = 0;
let currentCommand = '';
let isProcessing = false;
let currentProcess = null;

// Initialize terminal
function initTerminal() {
    terminalContent.innerHTML = '';
    terminalContent.tabIndex = 0;
    printWelcomeMessage();
    createPrompt();
    terminalContent.focus();
}

function printWelcomeMessage() {
    const welcomeMsg = `SecureExam Terminal (VS Code style)\nType 'help' for available commands\n\n`;
    appendOutput(welcomeMsg, 'terminal-output');
}

function createPrompt() {
    if (isProcessing) return;
    
    const promptLine = document.createElement('div');
    promptLine.className = 'terminal-prompt';
    
    const promptSymbol = document.createElement('span');
    promptSymbol.textContent = '❯';
    
    const inputField = document.createElement('span');
    inputField.className = 'terminal-input';
    inputField.id = 'terminal-input';
    inputField.setAttribute('contenteditable', 'true');
    
    promptLine.appendChild(promptSymbol);
    promptLine.appendChild(inputField);
    terminalContent.appendChild(promptLine);
    
    inputField.focus();
    terminalContent.scrollTop = terminalContent.scrollHeight;
    
    inputField.addEventListener('keydown', handleTerminalInput);
}

function handleTerminalInput(e) {
    const inputField = e.target;
    
    if (e.key === 'Enter') {
        e.preventDefault();
        currentCommand = inputField.textContent.trim();
        
        if (currentCommand) {
            commandHistory.push(currentCommand);
            historyIndex = commandHistory.length;
            
            appendOutput(currentCommand, 'terminal-command');
            
            isProcessing = true;
            terminalContainer.classList.add('running');
            processCommand(currentCommand).then(() => {
                isProcessing = false;
                terminalContainer.classList.remove('running');
                createPrompt();
            });
            
            inputField.textContent = '';
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (commandHistory.length > 0 && historyIndex > 0) {
            historyIndex--;
            inputField.textContent = commandHistory[historyIndex];
            moveCursorToEnd(inputField);
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (commandHistory.length > 0 && historyIndex < commandHistory.length - 1) {
            historyIndex++;
            inputField.textContent = commandHistory[historyIndex];
        } else {
            historyIndex = commandHistory.length;
            inputField.textContent = '';
        }
        moveCursorToEnd(inputField);
    } else if (e.key === 'Tab') {
        e.preventDefault();
        // Tab completion could be implemented here
    }
}

function moveCursorToEnd(element) {
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
}

function appendOutput(text, className = 'terminal-output') {
    const line = document.createElement('div');
    line.className = `terminal-line ${className}`;
    line.textContent = text;
    terminalContent.appendChild(line);
    terminalContent.scrollTop = terminalContent.scrollHeight;
}

// Clear terminal
clearTerminalBtn.addEventListener('click', () => {
    terminalContent.innerHTML = '';
    printWelcomeMessage();
    createPrompt();
});

// Collapse/expand terminal
collapseTerminalBtn.addEventListener('click', () => {
    terminalContainer.classList.toggle('collapsed');
    const icon = collapseTerminalBtn.querySelector('i');
    icon.classList.toggle('fa-chevron-down');
    icon.classList.toggle('fa-chevron-up');
});

// Kill current process
killTerminalBtn.addEventListener('click', () => {
    if (currentProcess) {
        currentProcess.abort();
        appendOutput('Process terminated by user', 'terminal-error');
        isProcessing = false;
        terminalContainer.classList.remove('running');
        createPrompt();
    }
});

// Process commands
async function processCommand(command) {
    if (command === 'clear') {
        terminalContent.innerHTML = '';
        printWelcomeMessage();
        return;
    }
    
    if (command === 'help') {
        appendOutput(`Available commands:
- clear: Clear terminal
- help: Show this help
- run: Execute the current code in editor
- time: Show remaining time
- pip install <package>: Install Python package
- pip list: Show installed packages`, 'terminal-output');
        return;
    }
    
    if (command === 'time') {
        appendOutput(`Remaining time: ${document.getElementById('timer').textContent}`, 'terminal-output');
        return;
    }
    
    if (command === 'run') {
        await runCodeInTerminal();
        return;
    }
    
    if (command.startsWith('pip ')) {
        await handlePipCommand(command);
        return;
    }
    
    appendOutput(`Command not found: ${command}\nType 'help' for available commands`, 'terminal-error');
}

// Handle pip commands
async function handlePipCommand(command) {
    if (!command.startsWith('pip install ') && !command.startsWith('pip list')) {
        appendOutput('Only "pip install" and "pip list" commands are supported', 'terminal-error');
        return;
    }
    
    if (languageSelect.value !== 'python') {
        appendOutput('Pip commands are only available for Python', 'terminal-error');
        return;
    }
    
    try {
        const controller = new AbortController();
        currentProcess = controller;
        
        const response = await fetch("https://securexam.in/api/run-code", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                language: "python",
                code: `import os; os.system('${command.replace(/'/g, "\\'")}')`
            }),
            signal: controller.signal
        });

        const result = await response.json();
        
        if (result.output) {
            appendOutput(result.output.trim(), 'terminal-output');
        } else if (result.error) {
            appendOutput(result.error.trim(), 'terminal-error');
        } else {
            appendOutput("Package operation completed", 'terminal-output');
        }
    } catch (error) {
        if (error.name !== 'AbortError') {
            appendOutput(`Error: ${error.message}`, 'terminal-error');
        }
    } finally {
        currentProcess = null;
    }
}

// Enhanced code execution with input handling
async function runCodeInTerminal() {
    const code = editor.getValue();
    const language = languageSelect.value;
    
    appendOutput(`Running ${language} code...`, 'terminal-output');
    
    try {
        const controller = new AbortController();
        currentProcess = controller;
        
        // First execution to detect if input is needed
        const response = await fetch("https://securexam.in/api/run-code", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ language, code }),
            signal: controller.signal
        });

        const result = await response.json();
        
        if (result.error) {
            appendOutput(result.error.trim(), 'terminal-error');
            return;
        }

        if (result.output) {
            // Check if the program is waiting for input
            if (result.output.includes("input()") || 
                result.output.toLowerCase().includes("enter input") ||
                result.output.includes("stdin")) {
                
                appendOutput("Program is waiting for input...", 'terminal-warning');
                appendOutput(result.output.trim(), 'terminal-output');
                
                // Get user input
                const userInput = await getUserInput();
                if (userInput === null) return; // User cancelled
                
                // Send input to server
                const inputResponse = await fetch("https://securexam.in/api/run-code", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        language, 
                        code,
                        input: userInput 
                    }),
                    signal: controller.signal
                });
                
                const inputResult = await inputResponse.json();
                if (inputResult.error) {
                    appendOutput(inputResult.error.trim(), 'terminal-error');
                } else if (inputResult.output) {
                    appendOutput(inputResult.output.trim(), 'terminal-output');
                }
            } else {
                appendOutput(result.output.trim(), 'terminal-output');
            }
        } else {
            appendOutput("Execution finished with no output.", 'terminal-output');
        }
    } catch (error) {
        if (error.name !== 'AbortError') {
            appendOutput(`Error: ${error.message}`, 'terminal-error');
        }
    } finally {
        currentProcess = null;
    }
}

// Helper function to get user input
function getUserInput() {
    return new Promise((resolve) => {
        const inputPrompt = document.createElement('div');
        inputPrompt.className = 'terminal-prompt';
        
        const inputSymbol = document.createElement('span');
        inputSymbol.textContent = '>';
        
        const inputField = document.createElement('span');
        inputField.className = 'terminal-input';
        inputField.setAttribute('contenteditable', 'true');
        
        inputPrompt.appendChild(inputSymbol);
        inputPrompt.appendChild(inputField);
        terminalContent.appendChild(inputPrompt);
        inputField.focus();
        terminalContent.scrollTop = terminalContent.scrollHeight;
        
        function handleInput(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const input = inputField.textContent.trim();
                terminalContent.removeChild(inputPrompt);
                inputField.removeEventListener('keydown', handleInput);
                resolve(input);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                terminalContent.removeChild(inputPrompt);
                inputField.removeEventListener('keydown', handleInput);
                resolve(null);
            }
        }
        
        inputField.addEventListener('keydown', handleInput);
    });
}

// Initialize terminal when page loads
document.addEventListener("DOMContentLoaded", initTerminal);

// Update the run button to use terminal
runButton.addEventListener("click", () => {
    terminalContent.focus();
    runCodeInTerminal();
});