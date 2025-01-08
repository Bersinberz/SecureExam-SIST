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
        automaticLayout: true
    });
});

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

// Theme Toggle
const themeToggle = document.getElementById('theme-toggle');
themeToggle.addEventListener('click', () => {
    currentTheme = currentTheme === 'vs-dark' ? 'vs-light' : 'vs-dark';
    monaco.editor.setTheme(currentTheme);
    themeToggle.textContent = currentTheme === 'vs-dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme';
    document.body.classList.toggle('light-theme');
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
    const confirmation = confirm('Are you sure you want to exit?');
    if (confirmation) {
        window.close();  // Attempt to close the window/tab
    }
});
