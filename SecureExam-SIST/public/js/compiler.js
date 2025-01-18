let editor;
let currentTheme = 'vs-dark';

// Configure Monaco Editor Loader
require.config({ paths: { vs: 'https://unpkg.com/monaco-editor/min/vs' } });

// Load and Initialize Monaco Editor
require(['vs/editor/editor.main'], function () {
    editor = monaco.editor.create(document.getElementById('editor-container'), {
        value: `// Write your code here\nconsole.log('Hello, world!');`,
        language: 'javascript',
        theme: currentTheme,
        automaticLayout: true,
    });
});

// Fetch Exam Details on Page Load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Fetch exam details from the backend
        const response = await fetch('http://127.0.0.1:5000/exam-details'); // Update URL as needed
        const examDetails = await response.json();

        // Update the header with exam name
        const header = document.querySelector('.header span');
        header.textContent = examDetails.name || 'Unknown Exam';

        // Start the timer
        const timerElement = document.getElementById('timer');
        const examTimeInMinutes = examDetails.time || 60; // Default to 60 if time is missing
        startTimer(examTimeInMinutes * 60, timerElement); // Convert minutes to seconds
    } catch (error) {
        console.error('Error fetching exam details:', error);
    }
});

// Timer Function
function startTimer(duration, display) {
    let timer = duration, minutes, seconds;
    const interval = setInterval(() => {
        minutes = parseInt(timer / 60, 10);
        seconds = parseInt(timer % 60, 10);

        minutes = minutes < 10 ? `0${minutes}` : minutes;
        seconds = seconds < 10 ? `0${seconds}` : seconds;

        display.textContent = `Time Left: ${minutes}:${seconds}`;

        if (--timer < 0) {
            clearInterval(interval);
            alert('Time is up!');
        }
    }, 1000);
}

// Language Selector
const languageSelect = document.getElementById('language-select');
languageSelect.addEventListener('change', () => {
    const newLanguage = languageSelect.value;
    monaco.editor.setModelLanguage(editor.getModel(), newLanguage);
    editor.setValue(
        newLanguage === 'python'
            ? `# Write your Python code here\nprint("Hello, Python!")`
            : newLanguage === 'java'
            ? `// Write your Java code here\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, Java!");\n    }\n}`
            : newLanguage === 'c'
            ? `// Write your C code here\n#include <stdio.h>\nint main() {\n    printf("Hello, C!\\n");\n    return 0;\n}`
            : newLanguage === 'cpp'
            ? `// Write your C++ code here\n#include <iostream>\nusing namespace std;\nint main() {\n    cout << "Hello, C++!" << endl;\n    return 0;\n}`
            : `// Write your ${newLanguage} code here\nconsole.log('Hello, world!');`
    );
});

// Run Code Button
const runButton = document.getElementById('run-button');
const outputContent = document.getElementById('output-content');

runButton.addEventListener('click', async () => {
    const code = editor.getValue();
    const language = languageSelect.value;
    outputContent.textContent = 'Running...';

    try {
        const response = await fetch('http://127.0.0.1:5000/run-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ language, code }),
        });
        const result = await response.json();
        outputContent.textContent = result.output || 'Execution finished with no output.';
    } catch (error) {
        outputContent.textContent = `Error: ${error.message}`;
    }
});

// Quit Button Functionality
const quitButton = document.getElementById('quitButton');
quitButton.addEventListener('click', function () {
    const confirmation = confirm('Are you sure you want to submit and exit?');
    if (confirmation) {
        window.close(); // Attempt to close the window/tab
    }
});
