<script lang="ts">
  import { onMount } from 'svelte';
  import Spinner from '../shared/Spinner.svelte';
  import EmptyState from '../shared/EmptyState.svelte';
  import { apiGet, apiPost } from '../../lib/api.js';

  let activeTab = $state<'employees'|'runs'|'run-detail'>('employees');
  let employees = $state<Record<string,unknown>[]>([]);
  let runs = $state<Record<string,unknown>[]>([]);
  let activeRun = $state<Record<string,unknown> | null>(null);
  let loading = $state(true);
  let showConfirm = $state(false);
  let submitting = $state(false);

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(n ?? 0);
  const statusBadge: Record<string,string> = { DRAFT:'gray', PROCESSING:'yellow', COMPLETE:'green', FAILED:'red' };

  onMount(async () => {
    const [emps, runsData] = await Promise.all([
      apiGet<Record<string,unknown>[]>('/payroll/employees').catch(() => []),
      apiGet<Record<string,unknown>[]>('/payroll/runs').catch(() => []),
    ]);
    employees = emps; runs = runsData;
    loading = false;
  });

  async function selectRun(id: string) {
    activeRun = await apiGet<Record<string,unknown>>(`/payroll/runs/${id}`);
    activeTab = 'run-detail';
  }

  async function calculateRun() {
    if (!activeRun) return;
    const result = await apiPost<Record<string,unknown>>(`/payroll/runs/${activeRun.id}/calculate`);
    activeRun = await apiGet<Record<string,unknown>>(`/payroll/runs/${activeRun.id}`);
  }

  async function submitRun() {
    if (!activeRun) return;
    submitting = true;
    await apiPost(`/payroll/runs/${activeRun.id}/submit`);
    showConfirm = false;
    activeRun = await apiGet<Record<string,unknown>>(`/payroll/runs/${activeRun.id}`);
    submitting = false;
  }
</script>

<div>
  <div class="tabs">
    <button class="tab {activeTab==='employees'?'active':''}" onclick={() => activeTab='employees'}>Employees</button>
    <button class="tab {activeTab==='runs'?'active':''}" onclick={() => activeTab='runs'}>Payroll Runs</button>
    {#if activeRun}<button class="tab {activeTab==='run-detail'?'active':''}" onclick={() => activeTab='run-detail'}>Current Run</button>{/if}
  </div>

  {#if loading}
    <div style="display:flex;justify-content:center;padding:var(--space-16)"><Spinner size={32}/></div>
  {:else if activeTab === 'employees'}
    {#if employees.length === 0}
      <EmptyState icon="👥" title="No employees yet" description="Add employees to run payroll." />
    {:else}
      <div class="card" style="padding:0;overflow:hidden">
        <table class="table">
          <thead><tr><th>Name</th><th>Email</th><th>Type</th><th>Pay</th><th>Status</th></tr></thead>
          <tbody>
            {#each employees as emp}
            <tr>
              <td style="font-weight:500">{String(emp.first_name)} {String(emp.last_name)}</td>
              <td style="font-size:0.8125rem;color:var(--color-text-muted)">{String(emp.email)}</td>
              <td><span class="badge badge--sand" style="font-size:0.7rem">{String(emp.employment_type ?? '')}</span></td>
              <td style="font-family:var(--font-mono);font-size:0.8125rem">{fmt(emp.pay_rate as number)} <span style="color:var(--color-text-muted)">/{String(emp.pay_type === 'hourly' ? 'hr' : 'yr')}</span></td>
              <td><span class="badge badge--{emp.is_active ? 'green' : 'gray'}">{emp.is_active ? 'Active' : 'Inactive'}</span></td>
            </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {:else if activeTab === 'runs'}
    {#if runs.length === 0}
      <EmptyState icon="💳" title="No payroll runs" description="Create your first payroll run." />
    {:else}
      <div class="card" style="padding:0;overflow:hidden">
        <table class="table">
          <thead><tr><th>Period</th><th>Pay Date</th><th>Status</th><th>Gross</th><th>Net</th><th></th></tr></thead>
          <tbody>
            {#each runs as run}
            <tr>
              <td style="font-size:0.8125rem">{String(run.period_start)} → {String(run.period_end)}</td>
              <td style="font-size:0.8125rem">{String(run.pay_date)}</td>
              <td><span class="badge badge--{statusBadge[String(run.status)] ?? 'gray'}">{String(run.status)}</span></td>
              <td style="font-family:var(--font-mono)">{fmt(run.total_gross as number)}</td>
              <td style="font-family:var(--font-mono);color:var(--color-success)">{fmt(run.total_net as number)}</td>
              <td><button class="btn btn--ghost btn--sm" onclick={() => selectRun(String(run.id))}>View →</button></td>
            </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {:else if activeTab === 'run-detail' && activeRun}
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-4)">
      <div>
        <h3 style="font-size:1rem;font-weight:600">{String(activeRun.period_start)} — {String(activeRun.period_end)}</h3>
        <span class="badge badge--{statusBadge[String(activeRun.status)] ?? 'gray'}" style="margin-top:4px">{String(activeRun.status)}</span>
      </div>
      <div style="display:flex;gap:var(--space-3)">
        {#if activeRun.status === 'DRAFT'}
          <button class="btn btn--ghost" onclick={calculateRun}>Calculate</button>
          <button class="btn btn--primary" onclick={() => showConfirm=true}>Submit Payroll</button>
        {/if}
      </div>
    </div>
    <div class="card" style="padding:0;overflow:hidden">
      <table class="table">
        <thead><tr><th>Employee</th><th style="text-align:right">Gross</th><th style="text-align:right">Fed Tax</th><th style="text-align:right">FICA</th><th style="text-align:right">Net Pay</th></tr></thead>
        <tbody>
          {#each ((activeRun.line_items ?? []) as Record<string,unknown>[]) as line}
          <tr>
            <td style="font-weight:500">{String(line.first_name)} {String(line.last_name)}</td>
            <td style="text-align:right;font-family:var(--font-mono)">{fmt(line.gross_pay as number)}</td>
            <td style="text-align:right;font-family:var(--font-mono);color:var(--color-danger)">{fmt(line.federal_income_tax as number)}</td>
            <td style="text-align:right;font-family:var(--font-mono);color:var(--color-danger)">{fmt((line.social_security as number) + (line.medicare as number))}</td>
            <td style="text-align:right;font-family:var(--font-mono);color:var(--color-success);font-weight:600">{fmt(line.net_pay as number)}</td>
          </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

{#if showConfirm}
<div class="modal-overlay" onclick={() => showConfirm=false}>
  <div class="modal" onclick={(e) => e.stopPropagation()}>
    <h3 class="modal__title">Confirm Payroll Submission</h3>
    <p style="font-size:0.875rem;color:var(--color-text-muted)">
      This will queue payroll processing for <strong>{(activeRun?.line_items as unknown[])?.length ?? 0} employees</strong>.
      Total net pay: <strong>{fmt(activeRun?.total_net as number)}</strong>. This cannot be undone.
    </p>
    <div class="modal__actions">
      <button class="btn btn--ghost" onclick={() => showConfirm=false}>Cancel</button>
      <button class="btn btn--primary" onclick={submitRun} disabled={submitting}>
        {submitting ? 'Submitting…' : 'Confirm & Submit'}
      </button>
    </div>
  </div>
</div>
{/if}
