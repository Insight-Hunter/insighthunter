<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Account } from './BookkeepingApp.svelte';

  export let token: string;
  export let accounts: Account[];

  const dispatch = createEventDispatcher();
  const API = '/api/bookkeeping';

  let showForm = false;
  let editing: Partial<Account> | null = null;
  let error = '';
  let saving = false;

  type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  const TYPES: AccountType[] = ['ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE'];

  let form: Partial<Account> = { type: 'EXPENSE', name: '', code: '', subtype: '' };

  function openNew() { editing = null; form = { type: 'EXPENSE', name: '', code: '', subtype: '' }; showForm = true; }
  function openEdit(a: Account) { editing = a; form = { ...a }; showForm = true; }

  async function save() {
    error = ''; saving = true;
    try {
      const url = editing ? `${API}/accounts/${editing.id}` : `${API}/accounts`;
      const method = editing ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json<{ error: string }>()).error);
      const data = await res.json<{ account: Account }>();
      if (editing) {
        accounts = accounts.map((a) => (a.id === editing!.id ? data.account : a));
      } else {
        accounts = [...accounts, data.account];
      }
      showForm = false;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Save failed';
    } finally {
      saving = false;
    }
  }

  async function deactivate(id: string) {
    if (!confirm('Deactivate this account?')) return;
    await fetch(`${API}/accounts/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    });
    accounts = accounts.filter((a) => a.id !== id);
  }

  const typeColors: Record<string, string> = {
    ASSET: '#dbeafe', LIABILITY: '#fce7f3', EQUITY: '#ede9fe',
    REVENUE: '#d1fae5', EXPENSE: '#fee2e2',
  };
  const typeText: Record<string, string> = {
    ASSET: '#1d4ed8', LIABILITY: '#9d174d', EQUITY: '#5b21b6',
    REVENUE: '#065f46', EXPENSE: '#b91c1c',
  };

  // Group by type
  $: grouped = TYPES.reduce((acc, type) => {
    acc[type] = accounts.filter((a) => a.type === type && a.is_active);
    return acc;
  }, {} as Record<string, Account[]>);
</script>

<div class="accounts-mgr">
  <div class="mgr-header">
    <p class="subtitle">{accounts.filter(a=>a.is_active).length} active accounts</p>
    <button class="btn-primary" on:click={openNew}>+ New Account</button>
  </div>

  {#each TYPES as type}
    {#if grouped[type]?.length}
      <div class="type-group">
        <div class="type-header" style="background:{typeColors[type]}; color:{typeText[type]}">
          {type}
          <span class="count">{grouped[type].length}</span>
        </div>
        <table class="acct-table">
          <thead>
            <tr><th>Code</th><th>Name</th><th>Subtype</th><th></th></tr>
          </thead>
          <tbody>
            {#each grouped[type] as acct}
              <tr>
                <td class="code">{acct.code ?? '—'}</td>
                <td class="name">{acct.name}</td>
                <td class="sub">{acct.subtype ?? '—'}</td>
                <td class="actions">
                  <button class="act-btn" on:click={() => openEdit(acct)}>Edit</button>
                  <button class="act-btn red" on:click={() => deactivate(acct.id)}>Remove</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/each}

  <!-- Inline form -->
  {#if showForm}
    <div class="modal-overlay" on:click|self={() => showForm = false}>
      <div class="form-card">
        <h3>{editing ? 'Edit Account' : 'New Account'}</h3>
        <div class="form-grid">
          <div class="field">
            <label>Type *</label>
            <select bind:value={form.type}>
              {#each TYPES as t}<option value={t}>{t}</option>{/each}
            </select>
          </div>
          <div class="field">
            <label>Account Code</label>
            <input type="text" placeholder="e.g. 6100" bind:value={form.code} />
          </div>
          <div class="field flex-2">
            <label>Account Name *</label>
            <input type="text" placeholder="e.g. Utilities" bind:value={form.name} />
          </div>
          <div class="field flex-2">
            <label>Subtype</label>
            <input type="text" placeholder="e.g. Operating" bind:value={form.subtype} />
          </div>
        </div>
        {#if error}<div class="form-error">{error}</div>{/if}
        <div class="form-footer">
          <button class="btn-ghost" on:click={() => showForm = false}>Cancel</button>
          <button class="btn-primary" on:click={save} disabled={saving || !form.name}>
            {saving ? 'Saving…' : 'Save Account'}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .accounts-mgr { display: flex; flex-direction: column; gap: var(--space-4); }
  .mgr-header { display: flex; justify-content: space-between; align-items: center; }
  .subtitle { color: var(--color-taupe-500); font-size: var(--text-sm); margin: 0; }

  .type-group { border: 1px solid var(--color-taupe-200); border-radius: var(--radius-lg); overflow: hidden; }
  .type-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: var(--space-2) var(--space-4);
    font-size: var(--text-xs); font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
  }
  .count { background: rgba(0,0,0,0.1); border-radius: 999px; padding: 1px 7px; font-size: 11px; }

  .acct-table { width: 100%; border-collapse: collapse; font-size: var(--text-sm); }
  .acct-table th { text-align: left; padding: var(--space-2) var(--space-4); font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-taupe-400); border-bottom: 1px solid var(--color-taupe-100); }
  .acct-table td { padding: var(--space-2) var(--space-4); border-bottom: 1px solid var(--color-taupe-100); }
  .acct-table tr:last-child td { border-bottom: none; }
  .acct-table tr:hover td { background: var(--color-taupe-50); }

  .code { font-family: monospace; color: var(--color-taupe-500); }
  .sub  { color: var(--color-taupe-400); font-size: var(--text-xs); }
  .actions { display: flex; gap: var(--space-1); }

  .act-btn { padding: 2px 8px; border-radius: var(--radius-sm); border: 1px solid var(--color-taupe-200); background: white; font-size: var(--text-xs); cursor: pointer; }
  .act-btn.red { border-color: #fca5a5; color: #b91c1c; }

  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 50; display: flex; align-items: center; justify-content: center; }
  .form-card { background: white; border-radius: var(--radius-xl); padding: var(--space-6); width: min(540px, 95vw); box-shadow: var(--shadow-xl); }
  .form-card h3 { margin: 0 0 var(--space-5); font-size: var(--text-lg); }

  .form-grid { display: flex; flex-wrap: wrap; gap: var(--space-3); }
  .field { display: flex; flex-direction: column; gap: var(--space-1); flex: 1; min-width: 140px; }
  .field.flex-2 { flex: 2; }
  label { font-size: var(--text-xs); font-weight: 600; color: var(--color-taupe-600); text-transform: uppercase; letter-spacing: 0.05em; }
  input, select { padding: var(--space-2) var(--space-3); border: 1px solid var(--color-taupe-200); border-radius: var(--radius-md); font-size: var(--text-sm); background: white; }

  .form-error { background: #fee2e2; color: #b91c1c; padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); font-size: var(--text-sm); margin-top: var(--space-2); }
  .form-footer { display: flex; justify-content: flex-end; gap: var(--space-3); margin-top: var(--space-5); }
  .btn-ghost { padding: var(--space-2) var(--space-4); background: none; border: 1px solid var(--color-taupe-200); border-radius: var(--radius-md); font-size: var(--text-sm); cursor: pointer; }
  .btn-primary { padding: var(--space-2) var(--space-5); background: var(--color-sand-600); color: white; border: none; border-radius: var(--radius-md); font-size: var(--text-sm); font-weight: 600; cursor: pointer; }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
