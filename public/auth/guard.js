// public/auth/guard.js
// Included in every dashboard HTML page via <script src="/auth/guard.js">
// Checks session cookie → redirects to login if not authenticated

(async function () {
  // Skip guard on auth pages
  const publicPaths = ['/auth/login.html', '/auth/register.html',
                       '/pricing.html', '/index.html', '/features/',
                       '/legal/', '/contact.html'];
  const path = window.location.pathname;
  if (publicPaths.some(p => path.startsWith(p)) || path === '/') return;

  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) throw new Error('Not authenticated');
    const data = await res.json();
    // Expose session globally for pages to use
    window.__session = data;
    // Inject user name in topbar if element exists
    const nameEl = document.getElementById('user-name');
    if (nameEl && data.name) nameEl.textContent = data.name;
    const planEl = document.getElementById('user-plan');
    if (planEl && data.plan) planEl.textContent = data.plan;
  } catch {
    window.location.href = '/auth/login.html?redirect=' + encodeURIComponent(window.location.pathname);
  }
})();
