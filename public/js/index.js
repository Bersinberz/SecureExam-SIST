const userTypeDropdown = document.getElementById("userType");
const studentForm = document.getElementById("studentForm");
const staffForm = document.getElementById("staffForm");
const loginForm = document.getElementById("loginForm");
const loadingSpinner = document.getElementById("loadingSpinner");
const successModal = document.getElementById("successModal");

// Create a global message container for success/error messages
const messageContainer = document.createElement('div');
document.body.appendChild(messageContainer);
messageContainer.style.position = 'fixed';
messageContainer.style.top = '10px';
messageContainer.style.left = '50%';
messageContainer.style.transform = 'translateX(-50%)';
messageContainer.style.zIndex = '9999';
messageContainer.style.maxWidth = '400px';
messageContainer.style.textAlign = 'center';

// Function to show success/error messages
function showMessage(text, type = 'success') {
    const messageBox = document.createElement('div');
    messageBox.textContent = text;
    messageBox.style.padding = '12px 18px';
    messageBox.style.margin = '10px auto';
    messageBox.style.borderRadius = '8px';
    messageBox.style.fontSize = '16px';
    messageBox.style.fontWeight = 'bold';
    messageBox.style.boxShadow = '0px 4px 6px rgba(0, 0, 0, 0.1)';
    messageBox.style.opacity = '0';
    messageBox.style.transition = 'opacity 0.5s ease-in-out';

    if (type === 'success') {
        messageBox.style.backgroundColor = '#4CAF50';
        messageBox.style.color = 'white';
    } else {
        messageBox.style.backgroundColor = '#FF4C4C';
        messageBox.style.color = 'white';
    }

    messageContainer.appendChild(messageBox);

    setTimeout(() => {
        messageBox.style.opacity = '1';
    }, 100);

    setTimeout(() => {
        messageBox.style.opacity = '0';
        setTimeout(() => messageBox.remove(), 500);
    }, 3000);
}

// Clear input fields
function clearInputs() {
    document.getElementById("registerNumber").value = '';
    document.getElementById("email").value = '';
    document.getElementById("password").value = '';
}

// Handle dropdown selection for user type
userTypeDropdown.addEventListener("change", function () {
    clearInputs();

    const userType = userTypeDropdown.value;
    if (userType === "student") {
        studentForm.style.display = "block";
        staffForm.style.display = "none";
        document.getElementById("registerNumber").required = true;
        document.getElementById("email").required = false;
    } else if (userType === "staff") {
        studentForm.style.display = "none";
        staffForm.style.display = "block";
        document.getElementById("registerNumber").required = false;
        document.getElementById("email").required = true;
    }
});

// Login Form submission
loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const userType = userTypeDropdown.value;
    let identifier;

    if (userType === "student") {
        identifier = document.getElementById("registerNumber").value.trim();
    } else if (userType === "staff") {
        identifier = document.getElementById("email").value.trim();
    }

    const password = document.getElementById("password").value.trim();

    if (!userType) {
        showMessage("Please select a user type!", "error");
        return;
    }

    if (!identifier || !password) {
        showMessage("Please enter your credentials!", "error");
        return;
    }

    loadingSpinner.style.display = "flex";

    try {
        const response = await fetch("http://172.20.10.2:3000/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier, password, userType }),
        });

        const result = await response.json();
        loadingSpinner.style.display = "none";

        if (response.ok) {
            if (userType === "student") {
                document.querySelector(".login-container").style.display = "none";
                successModal.style.display = "block";

                let countdown = 15;
                const countdownElement = document.createElement('p');
                countdownElement.id = 'countdownTimer';
                countdownElement.style.fontWeight = 'bold';
                countdownElement.style.marginTop = '10px';
                countdownElement.textContent = `Exam is Starting in ${countdown} seconds!`;

                successModal.querySelector('.custom-modal-content').appendChild(countdownElement);

                const interval = setInterval(() => {
                    countdown -= 1;
                    countdownElement.textContent = `Starting in ${countdown} seconds...`;
                    if (countdown === 0) {
                        clearInterval(interval);
                        successModal.style.display = 'none';
                        window.location.href = `../html/compiler.html?registerNumber=${identifier}`;
                    }
                }, 1000);
            } else if (userType === "staff") {
                showMessage("Login successful!", "success");
                setTimeout(() => {
                    window.location.href = "../html/dashboard.html";
                }, 2000);
            }
        } else {
            clearInputs();
            showMessage(result.message || "Invalid credentials", "error");
        }
    } catch (error) {
        clearInputs();
        loadingSpinner.style.display = "none";
        showMessage("Network error! Please try again.", "error");
    }
});

// Start Exam Button Click
startExamBtn.addEventListener("click", function () {
    const userType = userTypeDropdown.value;
    let identifier;

    if (userType === "student") {
        identifier = document.getElementById("registerNumber").value.trim();
    } else if (userType === "staff") {
        identifier = document.getElementById("email").value.trim();
    }

    if (identifier) {
        window.location.href = `../html/compiler.html?registerNumber=${identifier}`;
    } else {
        showMessage("Please login first!", "error");
    }
});

