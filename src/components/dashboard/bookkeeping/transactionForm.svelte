<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Account } from './BookkeepingApp.svelte';

  export let token: string;
  export let accounts: Account[];
  export let txn: Record<string, unknown> | null = null; // null = new entry

  const dispatch = createEventDispatcher();
  const API = '/api/bookkeeping';

  interface Line { account_id: string; debit: number | ''; credit: number | ''; memo: string; }

  let date = txn ? String(txn.date) : new Date().toISOString().slice(0, 10);
  let description = txn ? String(txn.description) : '';
  let reference = txn ? String(txn.reference ?? '') : '';
  let lines: Line[] = txn
    ? (txn.lines as Line[] ?? [{ account_id: '', debit: '', credit: '', memo: '' }])
    : [
        { account_id: '', debit: '', credit: '', memo: '' },
        { account_id: '', debit: '', credit: '', memo: '' },
      ];

  let saving = false;
  let validationError = '';

  $: totalDebit  = lines.reduce((s, l) => s + (Number(l.debit)  || 0), 0);
  $: totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  $: balanced = Math.abs(totalDebit - totalCredit) < 0.001 && totalDebit > 0;

  function addLine() {
    lines = [...lines, { account_id: '', debit: '', credit: '', memo: '' }];
  }

  function removeLine(i: number) {
    if (lines.length <= 2) return;
    lines = lines.filter((_, idx) => idx !== i);
  }

  function fmt(n: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  }

  async function save() {
    validationError = '';
    if (!date || !description) { validationError = 'Date and description are required.'; return; }
    if (!balanced) { validationError = 'Entry is unbalanced. Total debits must equal total credits.'; return; }
    const hasEmpty = lines.some((l) => !l.account_id || (Number(l.debit) === 0 && Number(l.credit) === 0));
    if (hasEmpty) { validationError = 'Each line needs an account and a debit or credit amount.'; return; }

    saving = true;
    try {
      const payload = {
        date, description, reference: reference || undefined,
        lines: lines.map((l) => ({
          account_id: l.account_id,
          debit:  Number(l.debit)  || 0,
          credit: Number(l.credit) || 0,
          memo: l.memo || undefined,
        })),
      };

      const url = txn ? `${API}/transactions/${txn.id}` : `${API}/transactions`;
      const method = txn ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json<{ error: string }>();
        throw new Error(err.error);
      }
      dispatch('saved');
    } catch (e) {
      validationError = e instanceof Error ? e.message : 'Save failed.';
    } finally {
      saving = false;
    }
  }

  const accountOptions = accounts.filter((a) => a.is_active);
</script>

<div class="txn-form">
  <div class="form-header">
    <h2>{txn ? 'Edit Journal Entry' : 'New Journal Entry'}</h2>
    <button class="close-btn" on:click={() => dispatch('cancel')}>✕</button>
  </div>

  <div class="form-body">
    <!-- Header fields -->
    <div class="header-fields">
      <div class="field">
        <label>Date *</label>
        <input type="date" bind:value={date} />
      </div>
      <div class="field flex-2">
        <label>Description *</label>
        <input type="text" placeholder="e.g. Monthly rent payment" bind:value={description} />
      </div>
      <div class="field">
        <label>Reference #</label>
        <input type="text" placeholder="Invoice / check #" bind:value={reference} />
      </div>
    </div>

    <!-- Lines -->
    <div class="lines-section">
      <div class="lines-header">
        <span class="col-account">Account</span>
        <span class="col-debit">Debit</span>
        <span class="col-credit">Credit</span>
        <span class="col-memo">Memo</span>
        <span class="col-del"></span>
      </div>

      {#each lines as line, i}
        <div class="line-row">
          <select class="col-account" bind:value={line.account_id}>
            <option value="">— Select account —</option>
            {#each ['ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE'] as type}
              <optgroup label={type}>
                {#each accountOptions.filter(a => a.type === type) as acct}
                  <option value={acct.id}>
                    {acct.code ? `${acct.code} · ` : ''}{acct.name}
                  </option>
                {/each}
              </optgroup>
            {/each}
          </select>
          <input class="col-debit money" type="number" step="0.01" min="0"
                 placeholder="0.00" bind:value={line.debit}
                 on:input={() => { if (Number(line.debit) > 0) line.credit = ''; }} />
          <input class="col-credit money" type="number" step="0.01" min="0"
                 placeholder="0.00" bind:value={line.credit}
                 on:input={() => { if (Number(line.credit) > 0) line.debit = ''; }} />
          <input class="col-memo" type="text" placeholder="Optional memo" bind:value={line.memo} />
          <button class="del-btn col-del" on:click={() => removeLine(i)}
                  disabled={lines.length <= 2}>✕</button>
        </div>
      {/each}

      <button class="add-line-btn" on:click={addLine}>+ Add line</button>
    </div>

    <!-- Totals -->
    <div class="totals">
      <div class="total-row">
        <span>Total Debits</span>
        <span class="money">{fmt(totalDebit)}</span>
      </div>
      <div class="total-row">
        <span>Total Credits</span>
        <span class="money">{fmt(totalCredit)}</span>
      </div>
      <div class="total-row difference" class:balanced class:unbalanced={!balanced && totalDebit > 0}>
        <span>Difference</span>
        <span class="money">{fmt(Math.abs(totalDebit - totalCredit))}</span>
        {#if balanced}
          <span class="ok-badge">✓ Balanced</span>
        {:else if totalDebit > 0}
          <span class="err-badge">Unbalanced</span>
        {/if}
      </div>
    </div>

    {#if validationError}
      <div class="validation-error">{validationError}</div>
    {/if}
  </div>

  <div class="form-footer">
    <button class="btn-ghost" on:click={() => dispatch('cancel')}>Cancel</button>
    <button class="btn-primary" on:click={save} disabled={saving || !balanced}>
      {saving ? 'Saving…' : txn ? 'Update Entry' : 'Save as Draft'}
    </button>
  </div>
</div>

<style>
  .txn-form { display: flex; flex-direction: column; }
  .form-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: var(--space-5) var(--space-6);
    border-bottom: 1px solid var(--color-taupe-200);
  }
  .form-header h2 { margin: 0; font-size: var(--text-lg); font-weight: 700; }
  .close-btn { background: none; border: none; font-size: 1.2rem; cursor: pointer; color: var(--color-taupe-400); }

  .form-body { padding: var(--space-6); display: flex; flex-direction: column; gap: var(--space-6); }

  .header-fields { display: flex; gap: var(--space-3); }
  .field { display: flex; flex-direction: column; gap: var(--space-1); flex: 1; }
  .field.flex-2 { flex: 2; }
  label { font-size: var(--text-xs); font-weight: 600; color: var(--color-taupe-600); text-transform: uppercase; letter-spacing: 0.05em; }
  input[type="text"], input[type="date"] {
    padding: var(--space-2) var(--space-3); border: 1px solid var(--color-taupe-200);
    border-radius: var(--radius-md); font-size: var(--text-sm); background: white;
  }

  .lines-section { display: flex; flex-direction: column; gap: var(--space-1); }
  .lines-header, .line-row { display: grid; grid-template-columns: 2fr 1fr 1fr 1.5fr 32px; gap: var(--space-2); align-items: center; }
  .lines-header { padding: 0 0 var(--space-1); border-bottom: 1px solid var(--color-taupe-200); }
  .lines-header span { font-size: 11px; font-weight: 600; color: var(--color-taupe-500); text-transform: uppercase; letter-spacing: 0.05em; }

  select { padding: var(--space-2) var(--space-3); border: 1px solid var(--color-taupe-200); border-radius: var(--radius-md); font-size: var(--text-sm); background: white; }
  input.money { text-align: right; font-variant-numeric: tabular-nums; padding: var(--space-2) var(--space-3); border: 1px solid var(--color-taupe-200); border-radius: var(--radius-md); font-size: var(--text-sm); }
  .col-memo input { font-size: var(--text-xs); }

  .del-btn { width: 28px; height: 28px; border: 1px solid var(--color-taupe-200); border-radius: var(--radius-sm); background: white; cursor: pointer; color: var(--color-taupe-400); display: flex; align-items: center; justify-content: center; font-size: 12px; }
  .del-btn:disabled { opacity: 0.3; cursor: not-allowed; }

  .add-line-btn { align-self: flex-start; margin-top: var(--space-1); padding: var(--space-1) var(--space-3); border: 1px dashed var(--color-taupe-300); border-radius: var(--radius-md); background: none; cursor: pointer; font-size: var(--text-sm); color: var(--color-taupe-500); }
  .add-line-btn:hover { border-color: var(--color-sand-400); color: var(--color-sand-600); }

  .totals {
    background: var(--color-taupe-50); border-radius: var(--radius-lg);
    padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-2);
  }
  .total-row { display: flex; justify-content: flex-end; align-items: center; gap: var(--space-4); font-size: var(--text-sm); }
  .total-row.difference { font-weight: 700; padding-top: var(--space-2); border-top: 1px solid var(--color-taupe-200); }
  .total-row.balanced .money { color: #065f46; }
  .total-row.unbalanced .money { color: #b91c1c; }
  .ok-badge  { background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 999px; font-size: 11px; }
  .err-badge { background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 999px; font-size: 11px; }
  .money { font-variant-numeric: tabular-nums; }

  .validation-error { background: #fee2e2; color: #991b1b; padding: var(--space-3); border-radius: var(--radius-md); font-size: var(--text-sm); }

  .form-footer {
    display: flex; justify-content: flex-end; gap: var(--space-3);
    padding: var(--space-4) var(--space-6);
    border-top: 1px solid var(--color-taupe-200);
  }
  .btn-ghost { padding: var(--space-2) var(--space-4); background: none; border: 1px solid var(--color-taupe-200); border-radius: var(--radius-md); font-size: var(--text-sm); cursor: pointer; }
  .btn-primary { padding: var(--space-2) var(--space-5); background: var(--color-sand-600); color: white; border: none; border-radius: var(--radius-md); font-size: var(--text-sm); font-weight: 600; cursor: pointer; }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
