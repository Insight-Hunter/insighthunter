const signupForm = document.getElementById('signup-form');
const errorMessage = document.getElementById('error-message');

// The authentication service runs on a separate subdomain
const authApiUrl = 'https://auth.insighthunter.app'; 

signupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorMessage.textContent = '';
  errorMessage.style.display = 'none';

  const formData = new FormData(event.target);
  const turnstileResponse = formData.get('cf-turnstile-response');

  if (!turnstileResponse) {
    errorMessage.textContent = 'Please complete the security check before submitting.';
    errorMessage.style.display = 'block';
    return;
  }

  try {
    // The fetch request will follow the 302 redirect from the server,
    // and the browser will automatically handle the cookie.
    const response = await fetch(`${authApiUrl}/api/signup`, {
      method: 'POST',
      body: formData,
      credentials: 'include', // Send cookies with the request
    });

    // If the final response URL is the shopping page, the signup was successful.
    if (response.url.includes('shopping.html')) {
      window.location.href = response.url; // Navigate to the shopping page
    } else {
      // Otherwise, an error occurred and we should display it.
      const errorText = await response.text();
      errorMessage.textContent = errorText || 'An unknown error occurred.';
      errorMessage.style.display = 'block';
    }
  } catch (error) {
    console.error('Signup request failed:', error);
    errorMessage.textContent = 'Could not connect to the signup service. Please try again later.';
    errorMessage.style.display = 'block';
  }
});
