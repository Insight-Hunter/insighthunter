// public/auth/guard.js
;(async () => {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' })
    if (!res.ok) throw new Error('unauth')
    const { user } = await res.json()

    window.IH_USER = user

    // Update nav display elements
    const nameEl  = document.getElementById('nav-user-name')
    const planEl  = document.getElementById('nav-plan-badge')
    const avatarEl = document.getElementById('nav-avatar')

    if (nameEl)  nameEl.textContent  = user.first_name
    if (planEl)  { planEl.textContent = user.plan.toUpperCase(); planEl.style.display = 'inline' }
    if (avatarEl) avatarEl.textContent = (user.first_name?.[0] || '') + (user.last_name?.[0] || '')

    // Dispatch event so plan-gate.js can react
    window.dispatchEvent(new CustomEvent('ih:user-loaded', { detail: user }))

  } catch {
    sessionStorage.removeItem('ih_user')
    window.location.href = '/auth/login.html?redirect=' + encodeURIComponent(window.location.pathname)
  }
})()
