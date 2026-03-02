
interface LoginResponse {
  success: boolean;
  token?: string;
  error?: string;
}

const authApiUrl = import.meta.env.PUBLIC_AUTH_API_URL ?? 'https://auth.insighthunter.io';
const liteAppUrl = import.meta.env.PUBLIC_LITE_APP_URL ?? 'https://lite.insighthunter.io';

const loginForm = document.getElementById('login-form') as HTMLFormElement | null;
const errorMessage = document.getElementById('error-message') as HTMLParagraphElement | null;
const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement | null;

if (loginForm && errorMessage && submitBtn) {
  loginForm.addEventListener('submit', async (event: Event) => {
    event.preventDefault();
    errorMessage.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in…';

    const email = (loginForm.elements.namedItem('email') as HTMLInputElement).value;
    const password = (loginForm.elements.namedItem('password') as HTMLInputElement).value;

    try {
      const response = await fetch(`${authApiUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok && response.status !== 401) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data: LoginResponse = await response.json();

      if (data.success && data.token) {
        sessionStorage.setItem('auth_token', data.token);
        window.location.href = `${liteAppUrl}/dashboard`;
      } else {
        errorMessage.textContent = data.error ?? 'Invalid email or password.';
      }
    } catch (error) {
      console.error('Login failed:', error);
      errorMessage.textContent =
        error instanceof Error && error.message.startsWith('Server error')
          ? 'The server is temporarily unavailable. Please try again.'
          : 'Could not connect to the authentication service.';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Login';
    }
  });
}
