<!-- apps/insighthunter-main/src/components/dashboard/pbx/ExtensionManager.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { pbxClient, type Extension } from '../../../lib/pbx-client';

  let extensions: Extension[] = [];
  let loading = true;
  let showForm = false;
  let editTarget: Extension | null = null;
  let saving = false;
  let error = '';
  let form = { number: '', name: '', voicemail_enabled: true, forward_to: '' };

  async function load() {
    loading = true;
    try { const { data } = await pbxClient.listExtensions(); extensions = data; }
    catch (e) { error = (e as Error).message; }
    finally { loading = false; }
  }

  function openCreate() { form = { number: '', name: '', voicemail_enabled: true, forward_to: '' }; editTarget = null; showForm = true; }
  function openEdit(ext: Extension) {
    form = { number: ext.number, name: ext.name, voicemail_enabled: !!ext.voicemail_enabled, forward_to: ext.forward_to ?? '' };
    editTarget = ext; showForm = true;
  }

  async function save() {
    saving = true; error = '';
    try {
      if (editTarget) {
        await pbxClient.updateExtension(editTarget.id, { name: form.name, voicemail_enabled: form.voicemail_enabled ? 1 : 0, forward_to: form.forward_to || null });
      } else {
        await pbxClient.createExtension({ number: form.number, name: form.name, voicemail_enabled: form.voicemail_enabled ? 1 : 0, forward_to: form.forward_to || null });
      }
      showForm = false; await load();
    } catch (e) { error = (e as Error).message; }
    finally { saving = false; }
  }

  async function remove(id: string) {
    if (!confirm('Delete this extension?')) return;
    await pbxClient.deleteExtension(id); await load();
  }

  onMount(load);
</script>

<div class="ext-manager">
  <div class="section-header">
    <h3>Extensions</h3>
    <button class="btn btn--primary" on:click={openCreate}>+ New Extension</button>
  </div>

  {#if error}<p class="error">{error}</p>{/if}

  {#if loading}
    <div class="loading-row"><span class="spinner"></span> Loading extensions…</div>
  {:else if extensions.length === 0}
    <div class="empty-state">
      <p>No extensions yet. Create your first extension to assign to team members.</p>
      <button class="btn btn--primary" on:click={openCreate}>Create Extension</button>
    </div>
  {:else}
    <table class="ext-table">
      <thead>
        <tr><th>Ext.</th><th>Name</th><th>Voicemail</th><th>Forward To</th><th>Actions</th></tr>
      </thead>
      <tbody>
        {#each extensions as ext}
          <tr>
            <td><span class="ext-badge">{ext.number}</span></td>
            <td>{ext.name}</td>
            <td>{ext.voicemail_enabled ? '✅' : '—'}</td>
            <td>{ext.forward_to ?? '—'}</td>
            <td class="actions">
              <button class="btn-icon" on:click={() => openEdit(ext)} title="Edit">✏️</button>
              <button class="btn-icon btn-icon--danger" on:click={() => remove(ext.id)} title="Delete">🗑️</button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}

  <!-- Modal form -->
  {#if showForm}
    <div class="modal-overlay" role="dialog" aria-modal="true">
      <div class="modal">
        <h4>{editTarget ? 'Edit Extension' : 'New Extension'}</h4>
        {#if !editTarget}
          <label class="field">
            <span>Extension Number</span>
            <input bind:value={form.number} placeholder="101" maxlength={6} />
          </label>
        {/if}
        <label class="field">
          <span>Display Name</span>
          <input bind:value={form.name} placeholder="Reception" />
        </label>
        <label class="field field--checkbox">
          <input type="checkbox" bind:checked={form.voicemail_enabled} />
          <span>Voicemail enabled</span>
        </label>
        <label class="field">
          <span>Forward to (optional E.164)</span>
          <input bind:value={form.forward_to} placeholder="+14045550123" />
        </label>
        {#if error}<p class="error">{error}</p>{/if}
        <div class="modal-actions">
          <button class="btn btn--ghost" on:click={() => (showForm = false)}>Cancel</button>
          <button class="btn btn--primary" on:click={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .ext-manager { max-width: 720px; }
  .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
  .section-header h3 { margin: 0; font-size: 1rem; font-weight: 600; }
  .ext-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
  .ext-table th { text-align: left; padding: 0.5rem 0.75rem; background: var(--color-bg, #faf9f7); font-weight: 600; color: var(--color-text-muted, #6b7280); border-bottom: 1px solid var(--color-border, #e5e2dc); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; }
  .ext-table td { padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--color-border, #e5e2dc); }
  .ext-badge { background: var(--color-accent, #8b7355); color: #fff; padding: 0.15rem 0.5rem; border-radius: 6px; font-weight: 700; font-size: 0.85rem; font-family: monospace; }
  .actions { display: flex; gap: 0.35rem; }
  .btn-icon { background: none; border: none; cursor: pointer; font-size: 1rem; padding: 0.2rem; border-radius: 4px; transition: background 0.1s; }
  .btn-icon:hover { background: var(--color-bg, #faf9f7); }
  .btn-icon--danger:hover { background: #fef2f2; }
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 50; }
  .modal { background: var(--color-surface, #fff); border-radius: 12px; padding: 1.5rem; width: 100%; max-width: 420px; box-shadow: 0 8px 32px rgba(0,0,0,0.15); }
  .modal h4 { margin: 0 0 1rem; font-size: 1rem; font-weight: 600; }
  .modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem; }
  .field { display: flex; flex-direction: column; gap: 0.3rem; margin-bottom: 0.75rem; font-size: 0.88rem; font-weight: 500; }
  .field input[type=text], .field input[type=tel] { padding: 0.5rem 0.75rem; border: 1px solid var(--color-border, #e5e2dc); border-radius: 6px; font-size: 0.9rem; }
  .field--checkbox { flex-direction: row; align-items: center; gap: 0.5rem; }
  .empty-state { text-align: center; padding: 3rem 1rem; color: var(--color-text-muted, #6b7280); }
  .loading-row { display: flex; align-items: center; gap: 0.5rem; color: var(--color-text-muted, #6b7280); padding: 2rem; justify-content: center; }
  .spinner { width: 16px; height: 16px; border: 2px solid var(--color-border, #e5e2dc); border-top-color: var(--color-accent, #8b7355); border-radius: 50%; animation: spin 0.7s linear infinite; }
  .btn { padding: 0.5rem 1rem; border-radius: 7px; border: none; font-weight: 600; font-size: 0.88rem; cursor: pointer; }
  .btn--primary { background: var(--color-accent, #8b7355); color: #fff; }
  .btn--primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn--ghost { background: var(--color-bg, #faf9f7); border: 1px solid var(--color-border, #e5e2dc); color: var(--color-text, #1a1a1a); }
  .error { color: #dc2626; font-size: 0.82rem; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
