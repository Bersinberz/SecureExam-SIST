const startButton = document.getElementById("start-button");
const examNameInput = document.getElementById("exam-name");
const hoursSelect = document.getElementById("hours");
const minutesSelect = document.getElementById("minutes");
const departmentSelect = document.getElementById("department-select");
const classSelect = document.getElementById("class-select");
const fileUploadInput = document.getElementById("file-input");
const loader = document.getElementById("loader");
const removeFileButton = document.getElementById("remove-file-button");
const dropContainer = document.querySelector(".drop-container");
const messageContainer = document.createElement("div");

// Append message container to body
document.body.appendChild(messageContainer);
messageContainer.style.position = "fixed";
messageContainer.style.top = "10px";
messageContainer.style.left = "50%";
messageContainer.style.transform = "translateX(-50%)";
messageContainer.style.zIndex = "9999";
messageContainer.style.maxWidth = "400px";
messageContainer.style.textAlign = "center";

// Exam details object
let examDetails = { name: "", time: 0, file: "", department: "", section: "" };

// Populate hours (1 to 12)
for (let i = 0; i <= 5; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = i.toString().padStart(2, "0");
    hoursSelect.appendChild(option);
}

// Populate minutes (00, 15, 30, 45)
[0, 15, 30, 45].forEach((min) => {
    const option = document.createElement("option");
    option.value = min;
    option.textContent = min.toString().padStart(2, "0");
    minutesSelect.appendChild(option);
});

// Show message function
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

    if (type === "success") {
        messageBox.style.backgroundColor = "#4CAF50";
        messageBox.style.color = "white";
    } else {
        messageBox.style.backgroundColor = "#FF4C4C";
        messageBox.style.color = "white";
    }

    messageContainer.appendChild(messageBox);

    setTimeout(() => {
        messageBox.style.opacity = "1";
    }, 100);

    setTimeout(() => {
        messageBox.style.opacity = "0";
        setTimeout(() => messageBox.remove(), 500);
    }, 3000);
}

// Handle file upload
function handleFileUpload(files) {
    if (files.length > 0) {
        loader.style.display = "block";

        setTimeout(() => {
            loader.style.display = "none";
            showMessage("File uploaded successfully", "success");
            removeFileButton.style.display = "inline-block";
            removeFileButton.disabled = false;
            examDetails.file = files[0].name;
        }, 2000);
    }
}

// File input change event
fileUploadInput.addEventListener("change", () => {
    handleFileUpload(fileUploadInput.files);
});

// Drag & Drop Event Listeners
dropContainer.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropContainer.classList.add("drag-over");
});

dropContainer.addEventListener("dragleave", () => {
    dropContainer.classList.remove("drag-over");
});

dropContainer.addEventListener("drop", (e) => {
    e.preventDefault();
    dropContainer.classList.remove("drag-over");
    const files = e.dataTransfer.files;
    fileUploadInput.files = files;
    handleFileUpload(files);
});

// Remove uploaded file
removeFileButton.addEventListener("click", () => {
    fileUploadInput.value = "";
    removeFileButton.style.display = "none";
    removeFileButton.disabled = true;
    showMessage("File removed", "error");
    examDetails.file = "";
});

// Start exam event
startButton.addEventListener("click", () => {
    examDetails.name = examNameInput.value.trim();
    examDetails.time =
        parseInt(hoursSelect.value) * 60 + parseInt(minutesSelect.value);
    examDetails.department = departmentSelect.value;
    examDetails.section = classSelect.value;

    if (!examDetails.name || !examDetails.department || !examDetails.section) {
        showMessage("Please fill all fields", "error");
        return;
    }

    const url = `data.html?department=${examDetails.department}&section=${examDetails.section}`;

    const formData = new FormData();
    formData.append("name", examDetails.name);
    formData.append("time", examDetails.time);
    formData.append("department", examDetails.department);
    formData.append("section", examDetails.section);

    if (fileUploadInput.files.length > 0) {
        formData.append("file", fileUploadInput.files[0]);
    }

    fetch("http://10.128.0.50:80/api/exam/start", {
        method: "POST",
        body: formData,
    })
        .then((response) => response.json())
        .then((data) => {
            loader.style.display = "none";

            if (data.message.includes("successfully")) {
                showMessage("Exam started successfully!", "success");
                setTimeout(() => {
                    window.location.href = url;
                }, 2000);
            } else {
                showMessage(data.message, "error");
            }
        })
        .catch((error) => {
            loader.style.display = "none";
            console.error("Error:", error);
            showMessage("Failed to start exam", "error");
        });
});
