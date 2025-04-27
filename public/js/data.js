const loaderOverlay = document.getElementById("loaderOverlay");
const messageContainer = document.createElement("div");
document.body.appendChild(messageContainer);

// Message container styling
messageContainer.style.position = "fixed";
messageContainer.style.top = "10px";
messageContainer.style.left = "50%";
messageContainer.style.transform = "translateX(-50%)";
messageContainer.style.zIndex = "9999";
messageContainer.style.maxWidth = "400px";
messageContainer.style.textAlign = "center";

// Extract department & section from URL parameters
const urlParams = new URLSearchParams(window.location.search);
const department = urlParams.get("department");
const section = urlParams.get("section");

// Show loader
function showLoader() {
  loaderOverlay.classList.add("active");
}

// Hide loader
function hideLoader() {
  setTimeout(() => {
    loaderOverlay.classList.remove("active");
  }, 500);
}

// Show message
function showMessage(text, type = "success") {
  const messageBox = document.createElement("div");
  messageBox.textContent = text;
  messageBox.style.padding = "12px 18px";
  messageBox.style.margin = "10px auto";
  messageBox.style.borderRadius = "8px";
  messageBox.style.fontSize = "16px";
  messageBox.style.fontWeight = "bold";
  messageBox.style.boxShadow = "0px 4px 6px rgba(0, 0, 0, 0.1)";
  messageBox.style.opacity = "0";
  messageBox.style.transition = "opacity 0.5s ease-in-out";
  messageBox.style.backgroundColor = type === "success" ? "#4CAF50" : "#FF4C4C";
  messageBox.style.color = "white";

  messageContainer.appendChild(messageBox);
  setTimeout(() => (messageBox.style.opacity = "1"), 100);
  setTimeout(() => {
    messageBox.style.opacity = "0";
    setTimeout(() => messageBox.remove(), 500);
  }, 3000);
}

// Create a downloadable .txt file for code submissions
function createCodeFile(assignedQuestion, code, registerNumber) {
  const content = `Assigned Question: ${assignedQuestion || ""
    }\n\nCode Submission:\n${code || ""}`;
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  return { url, fileName: `code_submission_${registerNumber}.txt` };
}

// Fetch student details
async function fetchStudentDetails() {
  try {
    showLoader();
    const response = await fetch(
      `https://securexam.in/students?department=${department}&section=${section}`
    );
    let students = await response.json();
    hideLoader();

    if (!response.ok) {
      showMessage("Error fetching student data", "error");
      return;
    }

    students.sort((a, b) =>
      String(a.registerNumber).localeCompare(String(b.registerNumber))
    );
    populateStudentTable(students);
  } catch (error) {
    hideLoader();
    console.error(error);
    showMessage("Failed to fetch student data", "error");
  }
}

// Fetch and update code submissions
async function fetchCodeSubmissions() {
  try {
    const response = await fetch("https://securexam.in/all-codes");
    let submissions = await response.json();

    if (!response.ok) return;

    submissions.sort((a, b) =>
      String(a.registerNumber).localeCompare(String(b.registerNumber))
    );
    updateCodeData(submissions);
  } catch (error) {
    console.error(error);
    showMessage("Failed to fetch code data", "error");
  }
}

// Populate the student table
function populateStudentTable(students) {
  const tbody = document.getElementById("table-body");
  if (!tbody) return;

  tbody.innerHTML = "";
  if (students.length === 0) {
    tbody.innerHTML =
      "<tr><td colspan='9' style='text-align:center;'>No student data available</td></tr>";
    return;
  }

  students.forEach((student, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${student.registerNumber}</td>
      <td>${student.userName}</td>
      <td>${student.department}</td>
      <td>${student.section}</td>
      <td class="assigned-question">N/A</td>
      <td class="code">No code available</td>
      <td class="submitted-time">Not submitted</td>
      <td class="viva-checkbox">
        <label class="container">
          <input type="checkbox" name="viva_status_${student.registerNumber}">
          <div class="checkmark"></div>
        </label>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Update table rows with code submissions
function updateCodeData(codeSubmissions) {
  const tbody = document.getElementById("table-body");

  codeSubmissions.forEach((submission) => {
    const rows = tbody.getElementsByTagName("tr");

    for (const row of rows) {
      const registerNumberCell = row.cells[1];

      if (
        registerNumberCell &&
        registerNumberCell.textContent === String(submission.registerNumber)
      ) {
        const questionCell = row.querySelector(".assigned-question");
        const codeCell = row.querySelector(".code");
        const timeCell = row.cells[7];

        // Fetch student name from the corresponding table row
        const studentName = row.cells[2]?.textContent || "Unknown";

        questionCell.textContent = submission.assignedQuestion || "N/A";
        let formattedTime = submission.submittedAt
          ? new Date(submission.submittedAt).toLocaleString()
          : "Not submitted";
        timeCell.textContent = formattedTime;

        if (submission.code) {
          const viewButton = document.createElement("button");
          viewButton.textContent = "View Code";

          viewButton.dataset.code = submission.code;
          codeCell.dataset.code = submission.code;

          viewButton.onclick = () => {
            const newTab = window.open();
            newTab.document.write(`
              <html>
              <head>
                <title>Code Submission - ${submission.registerNumber}</title>
                <style>
                  body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                    max-width: 800px;
                    margin: auto;
                  }
                  h2 {
                    color: #333;
                    border-bottom: 2px solid #007BFF;
                    padding-bottom: 5px;
                  }
                  pre {
                    background-color: #f4f4f4;
                    padding: 10px;
                    border: 1px solid #ddd;
                    border-radius: 5px;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                  }
                </style>
              </head>
              <body>
                <h2>Register Number: ${submission.registerNumber}</h2>
                <h2>Name: ${studentName}</h2>
                <h2>Assigned Question:</h2>
                <p>${submission.assignedQuestion || "N/A"}</p>
                <h2>Code Submission:</h2>
                <pre>${submission.code}</pre>
              </body>
              </html>
            `);
          };

          // Apply styles
          viewButton.style.backgroundColor = "#f3f7fe";
          viewButton.style.color = "#3b82f6";
          viewButton.style.border = "none";
          viewButton.style.cursor = "pointer";
          viewButton.style.borderRadius = "8px";
          viewButton.style.width = "100px";
          viewButton.style.height = "45px";
          viewButton.style.transition = "0.3s";

          viewButton.onmouseover = function () {
            viewButton.style.backgroundColor = "#3b82f6";
            viewButton.style.boxShadow = "0 0 0 5px #3b83f65f";
            viewButton.style.color = "#fff";
          };
          viewButton.onmouseout = function () {
            viewButton.style.backgroundColor = "#f3f7fe";
            viewButton.style.color = "#3b82f6";
            viewButton.style.boxShadow = "none";
          };

          codeCell.innerHTML = "";
          codeCell.appendChild(viewButton);
        } else {
          codeCell.textContent = "No code available";
        }
      }
    }
  });
}

// Function to download student submissions as a ZIP file
async function downloadStudentSubmissions() {
  const tbody = document.getElementById("table-body");
  if (!tbody) return;

  const rows = tbody.getElementsByTagName("tr");
  if (rows.length === 0) {
    showMessage("No student data available to download.", "error");
    return;
  }

  const zip = new JSZip();

  for (const row of rows) {
    const registerNumber = row.cells[1]?.textContent.trim() || "Unknown";
    const name = row.cells[2]?.textContent.trim() || "Unknown";
    const assignedQuestion =
      row.querySelector(".assigned-question")?.textContent.trim() || "N/A";
    const submittedAt = row.cells[7]?.textContent.trim() || "Not submitted";

    let code = "No code submitted";
    const codeCell = row.querySelector(".code");

    if (codeCell.dataset.code) {
      code = codeCell.dataset.code;
    } else if (codeCell.querySelector("button")) {
      code =
        codeCell.querySelector("button").dataset.code || "No code submitted";
    } else {
      code = codeCell.textContent.trim();
    }

    // File content
    const content = `Register Number: ${registerNumber}
Name: ${name}
Assigned Question: ${assignedQuestion}
Submitted At: ${submittedAt}

Code:
${code}`;

    // Add file to ZIP archive
    zip.file(`${registerNumber}_submission.txt`, content);
  }

  // Generate ZIP and trigger download
  zip.generateAsync({ type: "blob" }).then((blob) => {
    const zipUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = zipUrl;
    a.download = "student_submissions.zip";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });
}

// Attach function to the download button
document
  .querySelector(".Download-button")
  .addEventListener("click", downloadStudentSubmissions);

async function finishExam() {
  showLoader();

  setTimeout(async function () {
    hideLoader();

    const urlParams = new URLSearchParams(window.location.search);
    const department = urlParams.get("department");
    const section = urlParams.get("section");

    console.log(department);
    console.log(section);

    try {
      const response = await fetch("https://securexam.in/exam/finish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ department, section }),
      });

      const data = await response.json();

      if (response.ok) {
        window.close();
      } else {
        showMessage(data.message, "error");
      }
    } catch (error) {
      console.error("Error during finish exam:", error);
      showMessage("Failed to finish the exam", "error");
    }
  }, 3000);
}

// Init data fetching
async function init() {
  await fetchStudentDetails();
  fetchCodeSubmissions();
}
init();

setInterval(fetchCodeSubmissions, 10000);