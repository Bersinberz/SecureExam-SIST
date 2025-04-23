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
            `http://172.20.10.2:3000/api/exam/get?registerNumber=${registerNumber}`
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
        const response = await fetch("http://172.20.10.2:3001/run-code", {
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
        const response = await fetch("http://172.20.10.2:3000/api/code/submit", {
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
