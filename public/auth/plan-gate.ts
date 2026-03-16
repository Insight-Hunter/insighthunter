// public/auth/plan-gate.js
// Drop this on every dashboard page AFTER guard.js
// Usage: add data-requires-plan="standard" or data-requires-plan="pro" to any widget/panel

;(function() {
    const PLAN_RANK = { lite: 1, standard: 2, pro: 3 }
  
    const UPGRADE_MSG = {
      standard: {
        title:  'Insight Standard Required',
        desc:   'Upgrade to unlock this feature.',
        badge:  'Standard — $79/mo',
        color:  '#C9972B',
      },
      pro: {
        title:  'Insight Pro Required',
        desc:   'This feature is available on Insight Pro.',
        badge:  'Pro — $199/mo',
        color:  '#EC4899',
      }
    }
  
    const css = `
      .ih-lock-wrap   { position:relative; }
      .ih-lock-overlay{
        position:absolute;inset:0;z-index:10;border-radius:inherit;
        background:rgba(13,17,23,.82);backdrop-filter:blur(6px);
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        gap:.6rem;text-align:center;padding:1.5rem;
        border:1px solid rgba(201,151,43,.18);border-radius:12px;
      }
      .ih-lock-icon   { font-size:1.6rem; line-height:1; }
      .ih-lock-badge  {
        font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;
        padding:3px 10px;border-radius:100px;border:1px solid;
      }
      .ih-lock-title  { font-size:.88rem;font-weight:700;color:#E2E8F0; }
      .ih-lock-desc   { font-size:.75rem;color:#64748B;line-height:1.5;max-width:220px; }
      .ih-lock-cta    {
        display:inline-flex;align-items:center;gap:5px;
        padding:.45rem 1.1rem;border-radius:8px;
        background:#C9972B;color:#0D1117;font-size:.78rem;font-weight:700;
        text-decoration:none;margin-top:.25rem;transition:background .18s;
      }
      .ih-lock-cta:hover { background:#D4A843; }
    `
  
    function injectCSS() {
      if (document.getElementById('ih-plan-gate-css')) return
      const s = document.createElement('style')
      s.id = 'ih-plan-gate-css'
      s.textContent = css
      document.head.appendChild(s)
    }
  
    function lockElement(el, requiredPlan) {
      const cfg = UPGRADE_MSG[requiredPlan] || UPGRADE_MSG.standard
      // Wrap in relative container
      el.classList.add('ih-lock-wrap')
      el.style.position = 'relative'
      // Blur content inside
      el.querySelectorAll(':scope > *').forEach(child => {
        child.style.filter  = 'blur(4px)'
        child.style.pointerEvents = 'none'
        child.style.userSelect    = 'none'
      })
      // Inject overlay
      const overlay = document.createElement('div')
      overlay.className = 'ih-lock-overlay'
      overlay.innerHTML = `
        <div class="ih-lock-icon">🔒</div>
        <div class="ih-lock-badge" style="color:${cfg.color};border-color:${cfg.color}40">${cfg.badge}</div>
        <div class="ih-lock-title">${cfg.title}</div>
        <div class="ih-lock-desc">${cfg.desc}</div>
        <a href="/dashboard/upgrade.html" class="ih-lock-cta">
          Upgrade Now
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>`
      el.appendChild(overlay)
    }
  
    function applyGating(userPlan) {
      const rank = PLAN_RANK[userPlan] ?? 1
      document.querySelectorAll('[data-requires-plan]').forEach(el => {
        const required = el.getAttribute('data-requires-plan')
        const reqRank  = PLAN_RANK[required] ?? 2
        if (rank < reqRank) lockElement(el, required)
      })
      // Also hide sidebar links the user can't access
      document.querySelectorAll('[data-requires-plan-nav]').forEach(el => {
        const required = el.getAttribute('data-requires-plan-nav')
        const reqRank  = PLAN_RANK[required] ?? 2
        if (rank < reqRank) {
          el.style.opacity = '.35'
          el.style.pointerEvents = 'none'
          el.title = `Requires ${required} plan`
        }
      })
    }
  
    function init() {
      injectCSS()
      // IH_USER is set by guard.js after /api/auth/me resolves
      if (window.IH_USER) {
        applyGating(window.IH_USER.plan || 'lite')
      } else {
        // guard.js hasn't resolved yet — wait for custom event it dispatches
        window.addEventListener('ih:user-loaded', (e) => {
          applyGating(e.detail?.plan || 'lite')
        }, { once: true })
      }
    }
  
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init)
    } else {
      init()
    }
  })()
  