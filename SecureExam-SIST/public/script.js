    // Handle form submission
    document.getElementById('loginForm').addEventListener('submit', async (event) => {
        event.preventDefault();
  
        const registerNumber = document.getElementById('registerNumber').value;
        const password = document.getElementById('password').value;
  
        try {
          const response = await fetch('http://localhost:3000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ registerNumber, password }),
          });
  
          const result = await response.json();
          if (response.ok) {
            alert('Login Successful!');
            window.location.href = '/dashboard.html'; // Redirect to dashboard
          } else {
            alert(result.message || 'Login Failed');
          }
        } catch (error) {
          alert('Error logging in. Try again later.');
        }
      });