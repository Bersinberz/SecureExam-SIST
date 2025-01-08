// Lock the browser window for kiosk mode
window.addEventListener("keydown", function (e) {
  if (e.key === "F11" || e.key === "Alt") {
    e.preventDefault();
  }
});

// Show appropriate fields based on user selection
const userTypeDropdown = document.getElementById("userType");
const studentForm = document.getElementById("studentForm");
const staffForm = document.getElementById("staffForm");

// Clear input fields for user type forms
function clearInputs() {
  document.getElementById("registerNumber").value = ''; // Clear register number
  document.getElementById("email").value = ''; // Clear email
  document.getElementById("password").value = ''; // Clear password
}

// Handle dropdown selection for user type
userTypeDropdown.addEventListener("change", function () {
  clearInputs(); // Clear inputs whenever the user type changes
  
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
const loginForm = document.getElementById("loginForm");
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault(); // Prevent default form submission

  const userType = document.getElementById("userType").value;
  let identifier;

  // Determine identifier based on user type
  if (userType === "student") {
    identifier = document.getElementById("registerNumber").value; // Register Number
  } else if (userType === "staff") {
    identifier = document.getElementById("email").value; // Email
  }

  const password = document.getElementById("password").value;

  // Validate if userType is selected
  if (!userType) {
    alert("Please select a user type!");
    return;
  }

  // Show the loading spinner
  document.getElementById("loadingSpinner").style.display = "flex";

  try {
    const response = await fetch("http://localhost:3000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password, userType }),
    });

    const result = await response.json();

    // Hide the loading spinner after response
    document.getElementById("loadingSpinner").style.display = "none";

    if (response.ok) {
      // Show success modal
      document.getElementById("successModal").style.display = "block";
      setTimeout(() => {
        document.getElementById("successModal").style.display = "none";
        // Redirect based on user type after successful login
        if (userType === "staff") {
          window.location.href = "../html/dashboard.html"; // Redirect staff to dashboard
        } else if (userType === "student") {
          window.location.href = "../html/compiler.html"; // Redirect student to compiler
        }
      }, 500); // 0.5 second delay before redirecting
    } else {
      // Clear the input fields in case of error
      clearInputs(); // Clear inputs after login error

      // Handle error messages based on response status
      const errorMessage = result.message || "Invalid credentials"; // Generic message for invalid credentials
      document.getElementById("errorModal").querySelector("p").innerText = errorMessage;
      document.getElementById("errorModal").style.display = "block";
      setTimeout(() => {
        document.getElementById("errorModal").style.display = "none";
      }, 2000); // 2 second delay before hiding the modal
    }
  } catch (error) {
    // Hide the loading spinner and show network error
    document.getElementById("loadingSpinner").style.display = "none";

    // Clear the input fields in case of network error
    clearInputs(); // Clear inputs after network error

    document.getElementById("errorModal").querySelector("p").innerText = "Network error! Please try again.";
    document.getElementById("errorModal").style.display = "block";
    setTimeout(() => {
      document.getElementById("errorModal").style.display = "none";
    }, 1000); // 1 second delay before hiding the modal
  }
});
