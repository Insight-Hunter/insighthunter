// public/auth/guard.js
// Include this on every dashboard page to enforce auth
;(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      if (!res.ok) throw new Error('unauth')
      const { user } = await res.json()
      // Expose user globally for dashboard pages
      window.IH_USER = user
      // Update nav display name if present
      const nameEl = document.getElementById('nav-user-name')
      if (nameEl) nameEl.textContent = user.first_name
      const planEl = document.getElementById('nav-plan-badge')
      if (planEl) { planEl.textContent = user.plan.toUpperCase(); planEl.style.display = 'inline' }
    } catch {
      sessionStorage.removeItem('ih_user')
      window.location.href = '/auth/login.html?redirect=' + encodeURIComponent(window.location.pathname)
    }
  })()
  