// Handle form submission
document.getElementById('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();

  const registerNumber = document.getElementById('registerNumber').value;
  const password = document.getElementById('password').value;

  // Show the loading spinner
  document.getElementById('loadingSpinner').style.display = 'flex';

  try {
    const response = await fetch('http://localhost:3000/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registerNumber, password }),
    });

    const result = await response.json();
    // Introduce a slight delay before hiding the spinner
    setTimeout(() => {
      document.getElementById('loadingSpinner').style.display = 'none';
    }, 200); // 200ms delay

    if (response.ok) {
      // Show success modal
      document.getElementById('successModal').style.display = 'block';
      setTimeout(() => {
        document.getElementById('successModal').style.display = 'none';

        // Instead of redirecting via window.location, use IPC to open the compiler window
        window.electron.openCompilerWindow(); // This triggers the main process to open the compiler window

      }, 500); // Modal stays for 0.5 second before triggering the next action
    } else {
      // Update the error modal message based on response status
      const errorMessage =
        response.status === 404
          ? 'Invalid register number!'
          : response.status === 401
          ? 'Invalid password!'
          : 'Login failed! Try again.';
      document.getElementById('errorModal').querySelector('p').innerText = errorMessage;

      // Show error modal
      document.getElementById('errorModal').style.display = 'block';
      setTimeout(() => {
        document.getElementById('errorModal').style.display = 'none';
      }, 1000); // Modal stays for 1 second before disappearing
    }
  } catch (error) {
    // Hide the loading spinner and show generic error modal on network failure
    document.getElementById('loadingSpinner').style.display = 'none';
    document.getElementById('errorModal').querySelector('p').innerText = 'Network error! Please try again.';
    document.getElementById('errorModal').style.display = 'block';
    setTimeout(() => {
      document.getElementById('errorModal').style.display = 'none';
    }, 1000); // Modal stays for 1 second before disappearing
  }
});
