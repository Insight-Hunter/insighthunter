<script lang="ts">
  // ─── Types ──────────────────────────────────────────────────
  interface User {
    id: string;
    email: string;
    name: string;
    plan: "free" | "pro" | "white-label";
    status: "active" | "inactive" | "suspended";
    createdAt: string;
    lastLogin: string;
    reportsGenerated: number;
  }

  // ─── Props ──────────────────────────────────────────────────
  export let users: User[] = [];
  export let loading: boolean = false;

  // ─── State ──────────────────────────────────────────────────
  let searchQuery = "";
  let filterPlan: string = "all";
  let filterStatus: string = "all";
  let sortField: keyof User = "createdAt";
  let sortDir: "asc" | "desc" = "desc";
  let currentPage = 1;
  const perPage = 10;

  // ─── Derived ────────────────────────────────────────────────
  $: filtered = users
    .filter((u) => {
      const matchSearch =
        searchQuery === "" ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchPlan = filterPlan === "all" || u.plan === filterPlan;
      const matchStatus = filterStatus === "all" || u.status === filterStatus;
      return matchSearch && matchPlan && matchStatus;
    })
    .sort((a, b) => {
      const av = a[sortField] ?? "";
      const bv = b[sortField] ?? "";
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });

  $: totalPages = Math.ceil(filtered.length / perPage);
  $: paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  // ─── Helpers ────────────────────────────────────────────────
  function toggleSort(field: keyof User) {
    if (sortField === field) {
      sortDir = sortDir === "asc" ? "desc" : "asc";
    } else {
      sortField = field;
      sortDir = "asc";
    }
    currentPage = 1;
  }

  function planBadge(plan: User["plan"]) {
    return {
      free: "badge-gray",
      pro: "badge-blue",
      "white-label": "badge-purple",
    }[plan];
  }

  function statusBadge(status: User["status"]) {
    return {
      active: "badge-green",
      inactive: "badge-yellow",
      suspended: "badge-red",
    }[status];
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  }

  // ─── Actions ────────────────────────────────────────────────
  async function suspendUser(userId: string) {
    if (!confirm("Suspend this user?")) return;
    await fetch(`/api/admin/users/${userId}/suspend`, { method: "POST" });
    users = users.map((u) =>
      u.id === userId ? { ...u, status: "suspended" } : u
    );
  }

  async function deleteUser(userId: string) {
    if (!confirm("Permanently delete this user? This cannot be undone.")) return;
    await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    users = users.filter((u) => u.id !== userId);
  }
</script>

<!-- ─── Toolbar ─────────────────────────────────────────────── -->
<div class="flex flex-col sm:flex-row gap-3 mb-4">
  <input
    type="text"
    placeholder="Search by name or email..."
    bind:value={searchQuery}
    on:input={() => (currentPage = 1)}
    class="input flex-1"
  />
  <select bind:value={filterPlan} on:change={() => (currentPage = 1)} class="input w-36">
    <option value="all">All Plans</option>
    <option value="free">Free</option>
    <option value="pro">Pro</option>
    <option value="white-label">White-Label</option>
  </select>
  <select bind:value={filterStatus} on:change={() => (currentPage = 1)} class="input w-36">
    <option value="all">All Status</option>
    <option value="active">Active</option>
    <option value="inactive">Inactive</option>
    <option value="suspended">Suspended</option>
  </select>
</div>

<!-- ─── Table ─────────────────────────────────────────────────── -->
<div class="overflow-x-auto rounded-lg border border-gray-800">
  <table class="w-full text-sm text-left">
    <thead class="bg-gray-900 text-gray-400 uppercase text-xs">
      <tr>
        <th class="th cursor-pointer" on:click={() => toggleSort("name")}>
          Name {sortField === "name" ? (sortDir === "asc" ? "↑" : "↓") : ""}
        </th>
        <th class="th cursor-pointer" on:click={() => toggleSort("email")}>
          Email {sortField === "email" ? (sortDir === "asc" ? "↑" : "↓") : ""}
        </th>
        <th class="th">Plan</th>
        <th class="th">Status</th>
        <th class="th cursor-pointer" on:click={() => toggleSort("reportsGenerated")}>
          Reports {sortField === "reportsGenerated" ? (sortDir === "asc" ? "↑" : "↓") : ""}
        </th>
        <th class="th cursor-pointer" on:click={() => toggleSort("createdAt")}>
          Joined {sortField === "createdAt" ? (sortDir === "asc" ? "↑" : "↓") : ""}
        </th>
        <th class="th cursor-pointer" on:click={() => toggleSort("lastLogin")}>
          Last Login {sortField === "lastLogin" ? (sortDir === "asc" ? "↑" : "↓") : ""}
        </th>
        <th class="th text-right">Actions</th>
      </tr>
    </thead>
    <tbody>
      {#if loading}
        <tr>
          <td colspan="8" class="td text-center text-gray-500 py-10">
            Loading users...
          </td>
        </tr>
      {:else if paginated.length === 0}
        <tr>
          <td colspan="8" class="td text-center text-gray-500 py-10">
            No users found.
          </td>
        </tr>
      {:else}
        {#each paginated as user (user.id)}
          <tr class="border-t border-gray-800 hover:bg-gray-900 transition-colors">
            <td class="td font-medium text-white">{user.name}</td>
            <td class="td text-gray-400">{user.email}</td>
            <td class="td">
              <span class="badge {planBadge(user.plan)}">{user.plan}</span>
            </td>
            <td class="td">
              <span class="badge {statusBadge(user.status)}">{user.status}</span>
            </td>
            <td class="td text-gray-300">{user.reportsGenerated}</td>
            <td class="td text-gray-400">{formatDate(user.createdAt)}</td>
            <td class="td text-gray-400">{formatDate(user.lastLogin)}</td>
            <td class="td text-right">
              <div class="flex gap-2 justify-end">
                <a href={`/admin/users/${user.id}`} class="btn-sm btn-ghost">
                  View
                </a>
                {#if user.status !== "suspended"}
                  <button class="btn-sm btn-yellow" on:click={() => suspendUser(user.id)}>
                    Suspend
                  </button>
                {/if}
                <button class="btn-sm btn-red" on:click={() => deleteUser(user.id)}>
                  Delete
                </button>
              </div>
            </td>
          </tr>
        {/each}
      {/if}
    </tbody>
  </table>
</div>

<!-- ─── Pagination ─────────────────────────────────────────── -->
{#if totalPages > 1}
  <div class="flex items-center justify-between mt-4 text-sm text-gray-400">
    <span>{filtered.length} users · Page {currentPage} of {totalPages}</span>
    <div class="flex gap-2">
      <button
        class="btn-sm btn-ghost"
        disabled={currentPage === 1}
        on:click={() => (currentPage -= 1)}
      >
        ← Prev
      </button>
      <button
        class="btn-sm btn-ghost"
        disabled={currentPage === totalPages}
        on:click={() => (currentPage += 1)}
      >
        Next →
      </button>
    </div>
  </div>
{/if}

<style>
  .input {
    background: #111827;
    border: 1px solid #374151;
    border-radius: 0.5rem;
    padding: 0.5rem 0.75rem;
    color: #f9fafb;
    font-size: 0.875rem;
    outline: none;
  }
  .input:focus { border-color: #3b82f6; }

  .th { padding: 0.75rem 1rem; white-space: nowrap; }
  .td { padding: 0.75rem 1rem; }

  .badge {
    padding: 0.2rem 0.6rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: capitalize;
  }
  .badge-gray   { background: #374151; color: #d1d5db; }
  .badge-blue   { background: #1d4ed8; color: #bfdbfe; }
  .badge-purple { background: #6d28d9; color: #ddd6fe; }
  .badge-green  { background: #065f46; color: #6ee7b7; }
  .badge-yellow { background: #78350f; color: #fde68a; }
  .badge-red    { background: #7f1d1d; color: #fca5a5; }

  .btn-sm {
    padding: 0.3rem 0.65rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: opacity 0.15s;
  }
  .btn-sm:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-ghost  { background: #1f2937; color: #d1d5db; }
  .btn-yellow { background: #78350f; color: #fde68a; }
  .btn-red    { background: #7f1d1d; color: #fca5a5; }
</style>
