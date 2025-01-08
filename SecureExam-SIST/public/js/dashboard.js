// Elements
const examForm = document.getElementById('exam-form');
const examNameInput = document.getElementById('exam-name');
const startButton = document.getElementById('start-button');
const countdownDisplay = document.getElementById('countdown');
const fileUploadInput = document.getElementById('file-upload');
const loader = document.getElementById('loader');
const uploadSuccessMessage = document.getElementById('upload-success-message');
const removeFileButton = document.getElementById('remove-file-button');

// Variables to store exam details
let examDetails = { name: '', time: 0 };

// Populate hours (1 to 12)
const hoursSelect = document.getElementById("hours");
for (let i = 1; i <= 12; i++) {
  const option = document.createElement("option");
  option.value = i;
  option.textContent = i.toString().padStart(2, "0");
  hoursSelect.appendChild(option);
}

// Populate minutes (0 to 59)
const minutesSelect = document.getElementById("minutes");
for (let i = 0; i < 60; i++) {
  const option = document.createElement("option");
  option.value = i;
  option.textContent = i.toString().padStart(2, "0");
  minutesSelect.appendChild(option);
}

// Handle file upload
fileUploadInput.addEventListener('change', () => {
  if (fileUploadInput.files.length > 0) {
    // Show loader
    loader.style.display = 'block';

    // Simulate file upload process (you can replace with real upload logic)
    setTimeout(() => {
      loader.style.display = 'none';  // Hide loader
      uploadSuccessMessage.style.display = 'block';  // Show success message
      removeFileButton.style.display = 'inline-block';  // Show remove button
      removeFileButton.disabled = false;  // Enable remove button

      // Hide success message after 4 seconds
      setTimeout(() => {
        uploadSuccessMessage.style.display = 'none';
      }, 3000);
    }, 5000);  // Simulate 5 seconds upload time
  }
});

// Remove file handler
removeFileButton.addEventListener('click', () => {
  fileUploadInput.value = ''; // Clear the file input
  removeFileButton.style.display = 'none'; // Hide remove button
  removeFileButton.disabled = true; // Disable remove button
  uploadSuccessMessage.style.display = 'none'; // Hide success message
});

// Start Exam button click event
startButton.addEventListener("click", () => {
  const hours = parseInt(hoursSelect.value);
  const minutes = parseInt(minutesSelect.value);

  // Check if exam name and time are valid before proceeding
  if (!examNameInput.value.trim() || isNaN(hours) || isNaN(minutes)) {
    alert("Please fill in all the fields correctly before starting the exam.");
    return; // Exit if the form is incomplete
  }

  // Convert selected time to total seconds
  let totalSeconds = hours * 3600 + minutes * 60;

  // Update countdown
  const updateCountdown = () => {
    if (totalSeconds <= 0) {
      countdownDisplay.textContent = "Time's up!";
      clearInterval(countdownInterval);
      return;
    }

    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    countdownDisplay.textContent = `${hrs.toString().padStart(2, "0")}h:${mins.toString().padStart(2, "0")}m:${secs.toString().padStart(2, "0")}s`;

    totalSeconds--;
  };

  updateCountdown();
  const countdownInterval = setInterval(updateCountdown, 1000);
});

// Save Exam Details and Enable Start Exam Button
examForm.addEventListener('change', () => {
  const examName = examNameInput.value.trim();

  // Enable Start Exam button when valid exam details are entered
  if (examName && hoursSelect.value !== "" && minutesSelect.value !== "") {
    examDetails.name = examName;
    examDetails.time = parseInt(hoursSelect.value) * 60 + parseInt(minutesSelect.value);
    startButton.disabled = false;
  } else {
    startButton.disabled = true; // Disable Start Exam button if details are not valid
  }
});

// Start Exam
startButton.addEventListener('click', () => {
  if (!examDetails.name || examDetails.time <= 0) {
    return; // Exit if exam details are not valid
  }

  alert('Exam Started!');
  console.log('Exam Details:', examDetails);
});
