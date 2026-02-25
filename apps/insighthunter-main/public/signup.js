const signupForm = document.getElementById('signup-form');
const errorMessage = document.getElementById('error-message');

// The authentication service runs on a separate subdomain
const authApiUrl = 'https://auth.insighthunter.app'; 
// The progressive web app (where the user lands after signup) is also on a separate subdomain
const liteAppUrl = 'https://lite.insighthunter.app';

signupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorMessage.textContent = '';

  
  // Get form data
  const email = event.target.email.value;
  const password = event.target.password.value;
  const role = event.target.role.value;
  const plan = event.target.plan.value;

  // Get the Cloudflare Turnstile token from the form
  const turnstileResponse = signupForm.elements['cf-turnstile-response']?.value;

  if (!turnstileResponse) {
    errorMessage.textContent = 'Please complete the security check before submitting.';
    return;
  }

  try {
    const response = await fetch(`${authApiUrl}/api/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        role,
        plan,
        'cf-turnstile-response': turnstileResponse
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      // On successful signup, redirect the user to the main app (PWA),
      // passing the token so the app can log them in automatically.
      window.location.href = `${liteAppUrl}/auth/callback?token=${data.token}`;
    } else {
      // Display the error message from the server
      errorMessage.textContent = data.error || 'An unknown error occurred during signup.';
    }
  } catch (error) {
    console.error('Signup request failed:', error);
    errorMessage.textContent = 'Could not connect to the signup service. Please try again later.';
  }
});
