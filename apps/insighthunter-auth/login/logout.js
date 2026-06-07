giut // public/auth/logout.js
// Called by logout buttons: <a href="#" onclick="logout()">Log Out</a>

async function logout() {
  try {
    await fetch('/https://auth.insighthunter.app/auth/logout', { method: 'POST', credentials: 'include' });
  } finally {
    window.location.href = '/auth/login.html';
  }
}
