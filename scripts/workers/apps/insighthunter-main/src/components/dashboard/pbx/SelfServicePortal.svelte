<!-- src/components/dashboard/pbx/SelfServicePortal.svelte -->
<!-- Replaces Stripe Customer Portal redirect entirely -->
<script lang="ts">
  import { onMount } from 'svelte';

  type PlanId = 'starter' | 'professional' | 'enterprise';

  interface CardInfo { brand: string; last4: string; expMonth: number; expYear: number }
  interface UsageData { plan: PlanId; estimatedTotal: number|null; nextBillingDate: number|null }

  const API = import.meta.env.PUBLIC_PBX_API_URL ?? 'https://pbx-api.insighthunter.app';

  async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
    const r = await fetch(`${API}${path}`, {
      ...init, credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
    if (!r.ok) {
      const e = await r.json<{ error?: string }>().catch(() => ({}));
      throw new Error(e.error ?? `HTTP ${r.status}`);
    }
    return r.json<T>();
  }

  let tab: 'plan' | 'payment' | 'invoices' = 'plan';
  let card: CardInfo | null   = null;
  let usage: UsageData | null = null;
  let invoices: unknown[]     = [];
  let saving    = false;
  let changing  = false;
  let error     = '';
  let success   = '';

  // Stripe.js
  let stripe: unknown = null;
  let cardElement: unknown = null;
  let cardMounted = false;

  const PLANS = [
    { id: 'starter'      as PlanId, name: 'Starter',      price: '$29/mo', dids: 3,   calls: '500 min',   color: '#22c55e' },
    { id: 'professional' as PlanId, name: 'Professional', price: '$79/mo', dids: 15,  calls: '2,000 min', color: '#3b82f6' },
    { id: 'enterprise'   as PlanId, name: 'Enterprise',   price: '$199/mo',dids: 100, calls: '10,000 min',color: '#8b5cf6' },
  ];

  function flash(msg: string, isErr = false) {
    if (isErr) { error = msg; setTimeout(() => (error = ''), 7000); }
    else { success = msg; setTimeout(() => (success = ''), 4000); }
  }
  function usd(c: number|null) {
    return c == null ? '—' : new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(c/100);
  }
  function dt(ts: number|null) {
    return ts ? new Date(ts*1000).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—';
  }
  function capFirst(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

  async function loadCard()    { const r = await apiFetch<{data:CardInfo|null}>('/api/pbx/billing/payment-method'); card = r.data; }
  async function loadUsage()   { const r = await apiFetch<{data:UsageData}>('/api/pbx/billing/usage'); usage = r.data; }
  async function loadInvoices(){ const r = await apiFetch<{data:unknown[]}>('/api/pbx/billing/invoices'); invoices = r.data ?? []; }

  async function mountStripe() {
    if (cardMounted) return;
    const { clientSecret, stripePublicKey } = await apiFetch<{ clientSecret: string; stripePublicKey: string }>(
      '/api/pbx/billing/setup-intent', { method: 'POST' },
    );
    // @ts-ignore
    stripe = Stripe(stripePublicKey);
    // @ts-ignore
    const elements = stripe.elements({ clientSecret });
    // @ts-ignore
    cardElement = elements.create('card', {
      style: { base: { fontSize: '15px', color: '#1a1a1a', fontFamily: 'system-ui, sans-serif' } },
    });
    // @ts-ignore
    cardElement.mount('#stripe-card-element');
    cardMounted = true;
  }

  async function changePlan(planId: PlanId) {
    if (usage?.plan === planId) return;
    if (!confirm(`Switch to ${capFirst(planId)} plan?`)) return;
    changing = true;
    try {
      await apiFetch('/api/pbx/billing/change-plan', { method: 'POST', body: JSON.stringify({ planId }) });
      flash(`✓ Switched to ${capFirst(planId)}`);
      await loadUsage();
    } catch (e) { flash((e as Error).message, true); }
    finally { changing = false; }
  }

  async function saveCard() {
    saving = true;
    try {
      // @ts-ignore
      const { setupIntent, error: stripeError } = await stripe.confirmCardSetup(
        // Re-fetch client_secret for the mounted setup intent
        (await apiFetch<{ clientSecret: string }>('/api/pbx/billing/setup-intent', { method: 'POST' })).clientSecret,
        // @ts-ignore
        { payment_method: { card: cardElement } },
      );
      if (stripeError) throw new Error(stripeError.message);
      await apiFetch('/api/pbx/billing/payment-method', {
        method: 'POST',
        body: JSON.stringify({ paymentMethodId: setupIntent.payment_method }),
      });
      flash('✓ Card updated');
      await loadCard();
      cardMounted = false;
    } catch (e) { flash((e as Error).message, true); }
    finally { saving = false; }
  }

  onMount(async () => {
    await Promise.all([loadCard(), loadUsage(), loadInvoices()]);
    // Load Stripe.js
    if (!document.querySelector('script[src*="stripe.com/v3"]')) {
      const s = document.createElement('script');
      s.src = 'https://js.stripe.com/v3/';
      document.head.appendChild(s);
    }
  });

  $: currentPlan = PLANS.find(p => p.id === usage?.plan) ?? PLANS[0];
</script>

<svelte:head>
  <!-- Stripe.js must be loaded before card element mounts -->
</svelte:head>

<div class="portal">
  <div class="portal-header">
    <h2 class="portal-title">Billing & Subscription</h2>
    {#if usage}
      <div class="est-badge">
        <span class="est-label">Estimated this month</span>
        <span class="est-amt">{usd(usage.estimatedTotal)}</span>
        {#if usage.nextBillingDate}
          <span class="est-due">due {dt(usage.nextBillingDate)}</span>
        {/if}
      </div>
    {/if}
  </div>

  {#if error}   <div class="alert alert--error"  role="alert">⚠ {error}</div>   {/if}
  {#if success} <div class="alert alert--success" role="status">✓ {success}</div> {/if}

  <!-- Tab bar -->
  <div class="tabs" role="tablist">
    {#each [['plan','📋 Plan'],['payment','💳 Payment'],['invoices','🧾 Invoices']] as [t, l]}
      <button class="tab" class:tab--active={tab === t}
        on:click={() => { tab = t as typeof tab; if (t === 'payment') mountStripe(); }}
        role="tab" aria-selected={tab === t}>{l}</button>
    {/each}
  </div>

  <!-- ── Plan Tab ──────────────────────────────────────────────────────────── -->
  {#if tab === 'plan'}
    <div class="plan-grid">
      {#each PLANS as plan}
        {@const isCurrent = usage?.plan === plan.id}
        <div class="plan-card" class:plan-card--current={isCurrent}
          style="--plan-color:{plan.color}">
          {#if isCurrent}
            <span class="current-badge">Current Plan</span>
          {/if}
          <div class="plan-name">{plan.name}</div>
          <div class="plan-price">{plan.price}</div>
          <ul class="plan-features">
            <li>Up to <b>{plan.dids}</b> phone numbers</li>
            <li><b>{plan.calls}</b> included</li>
            <li>Unlimited extensions</li>
            <li>AI voicemail transcription</li>
          </ul>
          <button class="btn"
            class:btn--current={isCurrent}
            class:btn--upgrade={!isCurrent}
            disabled={changing || isCurrent}
            on:click={() => changePlan(plan.id)}>
            {isCurrent ? '✓ Active' : changing ? '⏳ Switching…' : 'Switch to this plan'}
          </button>
        </div>
      {/each}
    </div>
    <p class="plan-note">Plan changes take effect immediately with prorated billing. Downgrading requires releasing numbers above the new plan's limit.</p>

  <!-- ── Payment Tab ──────────────────────────────────────────────────────── -->
  {:else if tab === 'payment'}
    <div class="payment-wrap">
      {#if card}
        <div class="card-current">
          <div class="card-icon">
            {#if card.brand === 'visa'}💳{:else if card.brand === 'mastercard'}💳{:else}💳{/if}
          </div>
          <div class="card-info">
            <span class="card-brand">{capFirst(card.brand)}</span>
            <span class="card-num">•••• •••• •••• {card.last4}</span>
            <span class="card-exp">Expires {card.expMonth}/{card.expYear}</span>
          </div>
          <button class="btn btn--ghost" on:click={mountStripe}>Update Card</button>
        </div>
      {:else}
        <p class="no-card">No payment method on file.</p>
      {/if}

      <div class="card-form">
        <label class="field-label" for="stripe-card-element">
          {card ? 'New card details' : 'Add payment method'}
        </label>
        <div id="stripe-card-element" class="stripe-element"></div>
        <button class="btn btn--primary" on:click={saveCard} disabled={saving || !cardMounted}>
          {saving ? '⏳ Saving…' : 'Save card'}
        </button>
        <p class="card-note">Card data is handled directly by Stripe. We never see your full card number.</p>
      </div>
    </div>

  <!-- ── Invoices Tab ─────────────────────────────────────────────────────── -->
  {:else}
    {#if invoices.length === 0}
      <div class="empty">📄 No paid invoices yet.</div>
    {:else}
      <div class="inv-table">
        <div class="inv-head">
          <span>Period</span><span>Amount</span><span>Status</span><span></span>
        </div>
        {#each invoices as inv}
          {@const i = inv as Record<string, unknown>}
          <div class="inv-row">
            <span>{dt((i.period_end as number) ?? null)}</span>
            <span class="inv-amt">{usd((i.amount_paid as number) ?? null)}</span>
            <span><span class="badge-paid">Paid</span></span>
            <a class="inv-link" href={i.hosted_invoice_url as string} target="_blank" rel="noopener noreferrer">
              PDF →
            </a>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .portal{display:flex;flex-direction:column;gap:.85rem;max-width:780px}
  .portal-header{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:.5rem}
  .portal-title{margin:0;font-size:1.1rem;font-weight:800}
  .est-badge{display:flex;flex-direction:column;align-items:flex-end}
  .est-label{font-size:.72rem;color:var(--color-text-muted,#6b7280)}
  .est-amt{font-size:1.35rem;font-weight:800;font-variant-numeric:tabular-nums}
  .est-due{font-size:.72rem;color:var(--color-text-muted,#9ca3af)}
  .alert{padding:.6rem .9rem;border-radius:8px;font-size:.83rem}
  .alert--error{background:#fef2f2;color:#dc2626;border:1px solid #fecaca}
  .alert--success{background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0}
  .tabs{display:flex;border-bottom:1px solid var(--color-border,#e5e2dc)}
  .tab{padding:.5rem .95rem;background:none;border:none;border-bottom:2px solid transparent;font-size:.84rem;font-weight:500;color:var(--color-text-muted,#6b7280);cursor:pointer;margin-bottom:-1px;transition:color .15s,border-color .15s}
  .tab--active{color:var(--color-primary,#01696f);border-bottom-color:var(--color-primary,#01696f);font-weight:700}
  /* Plan */
  .plan-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem}
  @media(max-width:600px){.plan-grid{grid-template-columns:1fr}}
  .plan-card{position:relative;background:var(--color-surface,#fff);border:2px solid var(--color-border,#e5e2dc);border-radius:14px;padding:1.25rem;display:flex;flex-direction:column;gap:.5rem}
  .plan-card--current{border-color:var(--plan-color)}
  .current-badge{display:inline-block;background:var(--plan-color);color:#fff;border-radius:5px;padding:.15rem .5rem;font-size:.7rem;font-weight:700;width:fit-content}
  .plan-name{font-weight:800;font-size:1rem}
  .plan-price{font-size:1.4rem;font-weight:800;color:var(--plan-color)}
  .plan-features{list-style:none;padding:0;margin:.25rem 0;display:flex;flex-direction:column;gap:.25rem}
  .plan-features li{font-size:.82rem;color:var(--color-text-muted,#6b7280);padding-left:.85rem;position:relative}
  .plan-features li::before{content:'✓';position:absolute;left:0;color:var(--plan-color);font-weight:700}
  .plan-note{font-size:.76rem;color:var(--color-text-muted,#9ca3af);margin:0}
  /* Payment */
  .payment-wrap{display:flex;flex-direction:column;gap:1rem}
  .card-current{display:flex;align-items:center;gap:.75rem;background:var(--color-surface,#fff);border:1px solid var(--color-border,#e5e2dc);border-radius:12px;padding:1rem}
  .card-icon{font-size:1.8rem}
  .card-info{display:flex;flex-direction:column;gap:.1rem;flex:1}
  .card-brand{font-weight:700;font-size:.9rem;text-transform:capitalize}
  .card-num{font-size:.88rem;letter-spacing:.05em;font-variant-numeric:tabular-nums}
  .card-exp{font-size:.76rem;color:var(--color-text-muted,#6b7280)}
  .no-card{font-size:.88rem;color:var(--color-text-muted,#6b7280);margin:0}
  .card-form{display:flex;flex-direction:column;gap:.6rem}
  .field-label{font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--color-text-muted,#6b7280)}
  .stripe-element{border:1px solid var(--color-border,#e5e2dc);border-radius:8px;padding:.65rem .85rem;background:var(--color-surface,#fff);min-height:42px}
  .card-note{font-size:.73rem;color:var(--color-text-muted,#9ca3af);margin:0}
  /* Invoices */
  .inv-table{border:1px solid var(--color-border,#e5e2dc);border-radius:12px;overflow:hidden}
  .inv-head{display:grid;grid-template-columns:1fr 120px 80px 60px;gap:.5rem;padding:.45rem .85rem;background:var(--color-surface,#fff);font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--color-text-muted,#6b7280);border-bottom:1px solid var(--color-border,#e5e2dc)}
  .inv-row{display:grid;grid-template-columns:1fr 120px 80px 60px;gap:.5rem;padding:.6rem .85rem;border-bottom:1px solid var(--color-border,#e5e2dc);background:var(--color-bg,#faf9f7);font-size:.84rem;align-items:center}
  .inv-row:last-child{border-bottom:none}
  .inv-amt{font-weight:700;font-variant-numeric:tabular-nums}
  .badge-paid{background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;border-radius:4px;padding:.1rem .4rem;font-size:.72rem;font-weight:700}
  .inv-link{color:var(--color-primary,#01696f);font-size:.8rem;text-decoration:none;white-space:nowrap}
  .inv-link:hover{text-decoration:underline}
  .empty{display:flex;align-items:center;justify-content:center;padding:3rem;font-size:.9rem;color:var(--color-text-muted,#6b7280)}
  /* Shared buttons */
  .btn{padding:.45rem .95rem;border-radius:8px;border:none;font-weight:600;font-size:.86rem;cursor:pointer;margin-top:auto}
  .btn--current{background:var(--plan-color,#01696f);color:#fff;opacity:.7;cursor:default}
  .btn--upgrade{background:var(--color-surface,#fff);border:1.5px solid var(--plan-color);color:var(--plan-color);transition:background .15s}
  .btn--upgrade:hover:not(:disabled){background:color-mix(in oklch,var(--plan-color) 8%,#fff)}
  .btn--upgrade:disabled{opacity:.4;cursor:not-allowed}
  .btn--primary{background:var(--color-primary,#01696f);color:#fff}
  .btn--primary:hover:not(:disabled){background:var(--color-primary-hover,#0c4e54)}
  .btn--primary:disabled{opacity:.45;cursor:not-allowed}
  .btn--ghost{background:var(--color-surface,#fff);border:1px solid var(--color-border,#e5e2dc);color:var(--color-text,#1a1a1a)}
  .btn--ghost:hover{background:var(--color-surface-offset,#f0ece5)}
</style>
