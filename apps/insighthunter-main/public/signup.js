const signupForm = document.getElementById('signup-form');
const errorMessage = document.getElementById('error-message');

// You will need to replace this with the actual URL of your authentication service
const authApiUrl = 'https://auth.insighthunter.app'; 
// You will need to replace this with the actual URL of your PWA
const liteAppUrl = 'https://lite.insighthunter.app';

signupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorMessage.textContent = '';

  const name = event.target.name.value;
  const email = event.target.email.value;
  const password = event.target.password.value;
  const confirmPassword = event.target['confirm-password'].value;

  if (password !== confirmPassword) {
    errorMessage.textContent = 'Passwords do not match.';
    return;
  }

  // Correctly get the Turnstile response token from the form
  const turnstileResponse = signupForm.elements['cf-turnstile-response'].value;
  if (!turnstileResponse) {
    errorMessage.textContent = 'Please complete the CAPTCHA.';
    return;
  }

  try {
    const response = await fetch(`${authApiUrl}/api/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name, 
        email, 
        password, 
        'cf-turnstile-response': turnstileResponse 
      }),
    });

    const data = await response.json();

    if (data.success) {
      // On successful signup, redirect to the PWA with the token
      window.location.href = `${liteAppUrl}/auth/callback?token=${data.token}`;
    } else {
      errorMessage.textContent = data.error || 'An unknown error occurred.';
    }
  } catch (error) {
    console.error('Signup failed:', error);
    errorMessage.textContent = 'Could not connect to the authentication service.';
  }
});
