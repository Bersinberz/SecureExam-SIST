// Elements
const startButton = document.getElementById('start-button');
const examNameInput = document.getElementById('exam-name');
const hoursSelect = document.getElementById("hours");
const minutesSelect = document.getElementById("minutes");
const departmentSelect = document.getElementById('department-select');
const classSelect = document.getElementById('class-select');
const fileUploadInput = document.getElementById('file-input');
const loader = document.getElementById('loader');
const uploadSuccessMessage = document.getElementById('upload-success-message');
const removeFileButton = document.getElementById('remove-file-button');
const dropContainer = document.querySelector('.drop-container');

let examDetails = { name: '', time: 0, file: '', department: '', section: '' };

// Populate hours (1 to 12)
for (let i = 1; i <= 12; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = i.toString().padStart(2, '0');
    hoursSelect.appendChild(option);
}

// Populate minutes (00, 15, 30, 45)
[0, 15, 30, 45].forEach(min => {
    const option = document.createElement("option");
    option.value = min;
    option.textContent = min.toString().padStart(2, '0');
    minutesSelect.appendChild(option);
});

// Handle file upload
function handleFileUpload(files) {
    if (files.length > 0) {
        loader.style.display = 'block';

        // Simulate file upload process
        setTimeout(() => {
            loader.style.display = 'none';
            uploadSuccessMessage.style.display = 'block';
            removeFileButton.style.display = 'inline-block';
            removeFileButton.disabled = false;

            // Simulate setting file path (you can replace this with actual file path from backend)
            examDetails.file = files[0].name; // Assuming backend saves file with original name

            setTimeout(() => {
                uploadSuccessMessage.style.display = 'none';
            }, 2000);
        }, 2000);
    }
}

// Event listener for file input change
fileUploadInput.addEventListener('change', () => {
    handleFileUpload(fileUploadInput.files);
});

// Drag and Drop Event Listeners
dropContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropContainer.classList.add('drag-over');
});

dropContainer.addEventListener('dragleave', () => {
    dropContainer.classList.remove('drag-over');
});

dropContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    dropContainer.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    fileUploadInput.files = files;
    handleFileUpload(files);
});

// Remove uploaded file and reset
removeFileButton.addEventListener('click', () => {
    fileUploadInput.value = '';
    removeFileButton.style.display = 'none';
    removeFileButton.disabled = true;
    uploadSuccessMessage.style.display = 'none';
    loader.style.display = 'none';
    examDetails.file = ''; // Clear file path
});

// Handle start button click
startButton.addEventListener('click', () => {
    examDetails.name = examNameInput.value;
    examDetails.time = (parseInt(hoursSelect.value) * 60) + parseInt(minutesSelect.value);
    examDetails.department = departmentSelect.value;
    examDetails.section = classSelect.value;

    const formData = new FormData();

    // Add text fields to FormData
    formData.append('name', examDetails.name);
    formData.append('time', examDetails.time);
    formData.append('department', examDetails.department);
    formData.append('section', examDetails.section);

    // Add file to FormData (check if file exists)
    if (fileUploadInput.files.length > 0) {
        formData.append('file', fileUploadInput.files[0]);
    }

    // Show loader before sending request
    loader.style.display = 'block';

    // Send request to backend
    fetch('/api/exam/start', {
        method: 'POST',
        body: formData,
    })
        .then(response => response.json())
        .then(data => {
            loader.style.display = 'none'; // Hide loader
            uploadSuccessMessage.style.display = 'block';
            setTimeout(() => {
                uploadSuccessMessage.style.display = 'none';
            }, 2000);
            alert('Exam started successfully');
        })
        .catch(error => {
            loader.style.display = 'none'; // Hide loader
            console.error('Error starting exam:', error);
        });
});
