// Attach to any logout button:  <button onclick="IH.logout()">Sign Out</button>
window.IH = {
    logout: async () => {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
      sessionStorage.removeItem('ih_user')
      window.location.href = '/auth/login.html'
    }
  }
  