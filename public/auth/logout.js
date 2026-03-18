// public/auth/logout.js
// Called by logout buttons: <a href="#" onclick="logout()">Log Out</a>

async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  } finally {
    window.location.href = '/auth/login.html';
  }
}
