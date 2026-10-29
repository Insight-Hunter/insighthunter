type Row = Record<string, unknown>;

const container = document.querySelector<HTMLElement>("#app-content");
const alertBox = document.querySelector<HTMLElement>("#app-error");
const section = document.querySelector<HTMLElement>("[data-section]")?.dataset.section ?? "";

if (container && alertBox) {
  void initialize();
}

async function initialize(): Promise<void> {
  try {
    await request("/api/setup");
    switch (section) {
      case "overview":
        await renderOverview();
        break;
      case "transactions":
        await renderTransactions();
        break;
      case "journal":
        await renderJournal();
        break;
      case "reconcile":
        await renderReconciliation();
        break;
      case "invoices":
        await renderInvoices();
        break;
      case "bills":
        await renderBills();
        break;
      case "reports":
        renderReports();
        break;
      case "close":
        await renderClose();
        break;
      case "documents":
        await renderDocuments();
        break;
      case "exceptions":
        await renderExceptions();
        break;
      case "settings":
        await renderSettings();
        break;
      default:
        throw new Error("This workspace section is not available.");
    }
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      window.location.assign(
        `https://auth.insighthunter.app/login?redirect=${encodeURIComponent(window.location.href)}`,
      );
      return;
    }
    showError(error instanceof Error ? error.message : "The workspace could not be loaded.");
  }
}

async function renderOverview(): Promise<void> {
  const data = await request<Row>("/api/overview");
  const cards: [string, string][] = [
    ["Cash today", money(data.cashMinor)],
    ["Needs categorization", number(data.uncategorizedCount)],
    ["Open reconciliations", number(data.openReconciliationCount)],
    ["Close tasks", number(data.openTaskCount)],
    ["Open exceptions", number(data.openExceptionCount)],
    ["Income this month", money(data.currentMonthIncomeMinor)],
    ["Expense this month", money(data.currentMonthExpenseMinor)],
    ["Bank sync", text((data.bankSync as Row | undefined)?.status ?? "not connected")],
  ];
  const grid = el("div", undefined, "metric-grid");
  for (const [label, value] of cards) {
    const card = el("article", undefined, "metric-card");
    card.append(el("span", label, "metric-label"), el("strong", value, "metric-value"));
    grid.append(card);
  }
  const next = el("section", undefined, "panel");
  next.append(el("h2", "Next steps", "panel-title"));
  const links = el("div", undefined, "action-grid");
  for (const [href, label, hint] of [
    ["/transactions", "Review transactions", "Categorize and document current activity"],
    ["/reconcile", "Reconcile an account", "Compare book activity with a statement"],
    ["/close", "Continue month-end close", "Work through assigned close tasks"],
    ["/exceptions", "Review exceptions", "Prioritize items by close risk and impact"],
  ] as const) {
    const link = el("a", undefined, "action-link");
    link.href = href;
    link.append(el("strong", label), el("span", hint));
    links.append(link);
  }
  next.append(links);
  replace(grid, next);
}

async function renderTransactions(): Promise<void> {
  const accounts = await request<{ accounts: Row[] }>("/api/accounts");
  const categories = await request<{ categories: Row[] }>("/api/categories");
  const panel = sectionPanel("Add a transaction");
  const form = createForm([
    field("description", "Description", "text", true),
    field("date", "Transaction date", "date", true, new Date().toISOString().slice(0, 10)),
    field("amount", "Amount", "number", true, "", "0.01"),
  ]);
  form.querySelector<HTMLInputElement>('input[name="amount"]')?.removeAttribute("min");
  const accountSelect = addSelect(form, "accountId", "Financial account", accounts.accounts, "id", "name");
  const categorySelect = addSelect(form, "categoryId", "Category", categories.categories, "id", "name");
  addSubmit(form, "Save for review");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitForm(form, async (values) => {
      const amount = Number(values.amount);
      if (!Number.isFinite(amount) || amount === 0) throw new Error("Enter a non-zero amount.");
      await request("/api/transactions", {
        method: "POST",
        body: JSON.stringify({
          description: values.description,
          date: values.date,
          amountMinor: Math.round(amount * 100),
          accountId: accountSelect.value || undefined,
          categoryId: categorySelect.value || undefined,
        }),
      });
      await renderTransactions();
    });
  });
  panel.append(form);

  const importPanel = sectionPanel("Import bank activity");
  const importForm = createForm([field("file", "CSV file (up to 10 MB)", "file", true)]);
  importForm.querySelector<HTMLInputElement>('input[name="file"]')!.accept = ".csv,text/csv";
  addSubmit(importForm, "Upload for review");
  importForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitForm(importForm, async () => {
      const payload = new FormData(importForm);
      const response = await fetch("/api/imports/upload", {
        method: "POST",
        body: payload,
        credentials: "same-origin",
      });
      const result = await response.json() as { importId?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "File upload failed.");
      showNotice(`Import ${result.importId ?? ""} queued for review.`);
      await renderTransactions();
    });
  });
  importPanel.append(importForm);

  const transactions = await request<{ transactions: Row[]; total: number }>("/api/transactions");
  const tablePanel = sectionPanel(`Transaction queue · ${transactions.total}`);
  tablePanel.append(dataTable(
    ["Date", "Description", "Account", "Category", "Amount", "Status", "Review actions"],
    transactions.transactions.map((row) => {
      const account = el("select");
      account.setAttribute("aria-label", `Financial account for ${text(row.description)}`);
      const noAccount = el("option", "Choose account");
      noAccount.value = "";
      account.append(noAccount);
      for (const item of accounts.accounts) {
        const option = el("option", `${text(item.code)} · ${text(item.name)}`);
        option.value = text(item.id);
        option.selected = text(item.id) === text(row.account_id);
        account.append(option);
      }
      const category = el("select");
      category.setAttribute("aria-label", `Category for ${text(row.description)}`);
      const unassigned = el("option", "Choose category");
      unassigned.value = "";
      category.append(unassigned);
      for (const item of categories.categories) {
        const option = el("option", text(item.name));
        option.value = text(item.id);
        option.selected = text(item.id) === text(row.category_id);
        category.append(option);
      }

      const actions = el("div", undefined, "row-actions");
      const saveDetails = el("button", "Save details", "button button-small");
      saveDetails.type = "button";
      saveDetails.disabled = row.status === "posted";
      saveDetails.addEventListener("click", () => {
        void act(async () => {
          if (!category.value && !account.value) {
            throw new Error("Choose a financial account or category first.");
          }
          await request(`/api/transactions/${encodeURIComponent(text(row.id))}`, {
            method: "PATCH",
            body: JSON.stringify({
              accountId: account.value || undefined,
              categoryId: category.value || undefined,
            }),
          });
          await renderTransactions();
          showNotice("Transaction details saved.");
        });
      });
      actions.append(account, category, saveDetails);

      const reviewed = el("button", "Mark reviewed", "button button-small button-secondary");
      reviewed.type = "button";
      reviewed.disabled = row.status === "posted" || row.status === "reviewed";
      reviewed.addEventListener("click", () => {
        void act(async () => {
          if (!category.value) throw new Error("Choose a category before marking this transaction reviewed.");
          await request(`/api/transactions/${encodeURIComponent(text(row.id))}`, {
            method: "PATCH",
            body: JSON.stringify({
              accountId: account.value || undefined,
              categoryId: category.value,
              status: "reviewed",
            }),
          });
          await renderTransactions();
          showNotice("Transaction marked reviewed.");
        });
      });
      actions.append(reviewed);

      return [
        text(row.transaction_date),
        text(row.description),
        text(row.account_name ?? "Unassigned"),
        text(row.category_name ?? "Uncategorized"),
        money(row.amount_minor),
        text(row.status),
        actions,
      ];
    }),
  ));

  const imports = await request<{ imports: Row[] }>("/api/imports/recent");
  const importsPanel = sectionPanel(`Recent imports · ${imports.imports.length}`);
  importsPanel.append(dataTable(
    ["File", "Status", "Rows", "Duplicates", "Warnings", "Created", "Review"],
    imports.imports.map((row) => {
      const review = el("button", "Review rows", "button button-small button-secondary");
      review.type = "button";
      review.addEventListener("click", () => {
        void act(() => loadImportReview(text(row.id), reviewArea));
      });
      return [
        text(row.original_filename),
        text(row.status),
        number(row.row_count ?? row.imported_transaction_count),
        number(row.duplicate_count),
        number(row.warning_count),
        text(row.created_at),
        review,
      ];
    }),
  ));
  const reviewArea = sectionPanel("Import row review");
  const reviewContent = el("div");
  reviewContent.className = "import-review-content";
  reviewContent.append(el("p", "Choose an import to review its staged rows.", "muted"));
  reviewArea.append(reviewContent);
  if (imports.imports.length) {
    replace(panel, importPanel, tablePanel, importsPanel, reviewArea);
  } else {
    replace(panel, importPanel, tablePanel, importsPanel);
  }
}

async function loadImportReview(importId: string, panel: HTMLElement): Promise<void> {
  const result = await request<{ import: Row; rows: Row[] }>(
    `/api/imports/${encodeURIComponent(importId)}`,
  );
  const content = panel.querySelector<HTMLElement>(".import-review-content");
  if (!content) return;
  const details = el(
    "p",
    `${text(result.import.original_filename)} · ${text(result.import.status)}${result.import.error_message ? ` · ${text(result.import.error_message)}` : ""}`,
    "muted",
  );
  const table = dataTable(
    ["Date", "Description", "Amount", "Suggested category", "Status", "Decision"],
    result.rows.map((row) => {
      const status = el("select");
      status.setAttribute("aria-label", `Review decision for ${text(row.normalized_description)}`);
      const choose = el("option", "Choose a decision");
      choose.value = "";
      status.append(choose);
      for (const [value, label] of [
        ["ready_to_post", "Approve for transaction review"],
        ["ignored", "Ignore"],
        ["force_review", "Needs more review"],
      ] as const) {
        const option = el("option", label);
        option.value = value;
        option.selected = text(row.status) === value;
        status.append(option);
      }
      const decision = el("div", undefined, "row-actions");
      const save = el("button", "Save decision", "button button-small");
      save.type = "button";
      save.disabled = status.value === "";
      status.addEventListener("change", () => {
        save.disabled = status.value === "";
      });
      save.addEventListener("click", () => {
        void act(async () => {
          await request(`/api/imports/rows/${encodeURIComponent(text(row.id))}`, {
            method: "PATCH",
            body: JSON.stringify({ status: status.value }),
          });
          await loadImportReview(importId, panel);
          showNotice("Import row decision saved.");
        });
      });
      decision.append(status, save);
      return [
        text(row.transaction_date),
        text(row.normalized_description),
        money(row.amount_minor),
        text(row.category_hint),
        text(row.status),
        decision,
      ];
    }),
  );
  const parts: HTMLElement[] = [details, table];
  if (result.import.status === "review_required") {
    const commit = el("button", "Commit approved rows to transaction review", "button button-primary");
    commit.type = "button";
    commit.addEventListener("click", () => {
      void act(async () => {
        const committed = await request<{ transactionsCreated: number; ledgerPosted: boolean }>(
          `/api/imports/${encodeURIComponent(importId)}/commit`,
          { method: "POST", body: "{}" },
        );
        await renderTransactions();
        showNotice(
          `${committed.transactionsCreated} transaction(s) added for review. Ledger posted: ${committed.ledgerPosted ? "yes" : "no"}.`,
        );
      });
    });
    parts.push(commit);
  }
  content.replaceChildren(...parts);
}

async function renderJournal(): Promise<void> {
  const accounts = await request<{ accounts: Row[] }>("/api/accounts");
  const panel = sectionPanel("Draft a journal entry");
  const form = el("form", undefined, "journal-form");
  const header = el("div", undefined, "form-grid");
  const entryDate = field("entryDate", "Entry date", "date", true, new Date().toISOString().slice(0, 10));
  const memo = field("memo", "Memo", "text", true);
  memo.maxLength = 500;
  header.append(labelledField("Entry date", entryDate), labelledField("Memo", memo));
  const lineList = el("div", undefined, "journal-lines");
  lineList.append(createJournalLine(accounts.accounts));
  lineList.append(createJournalLine(accounts.accounts));
  const addLine = el("button", "Add line", "button button-secondary");
  addLine.type = "button";
  addLine.addEventListener("click", () => lineList.append(createJournalLine(accounts.accounts)));
  const actions = el("div", undefined, "form-actions");
  const submit = el("button", "Save balanced draft", "button button-primary");
  submit.type = "submit";
  actions.append(addLine, submit);
  form.append(header, el("h3", "Journal lines"), lineList, actions);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitForm(form, async () => {
      const lines = Array.from(lineList.querySelectorAll<HTMLElement>(".journal-line")).map((line) => {
        const accountId = line.querySelector<HTMLSelectElement>(".journal-account")?.value ?? "";
        const debit = Number(line.querySelector<HTMLInputElement>(".journal-debit")?.value ?? 0);
        const credit = Number(line.querySelector<HTMLInputElement>(".journal-credit")?.value ?? 0);
        if (!accountId || !Number.isFinite(debit) || !Number.isFinite(credit) || debit < 0 || credit < 0) {
          throw new Error("Select an account and enter valid non-negative amounts for each journal line.");
        }
        const debitMinor = Math.round(debit * 100);
        const creditMinor = Math.round(credit * 100);
        if (!Number.isSafeInteger(debitMinor) || !Number.isSafeInteger(creditMinor)) {
          throw new Error("Journal line amounts exceed the supported range.");
        }
        return { accountId, debitMinor, creditMinor };
      });
      const debitTotal = lines.reduce((total, line) => total + line.debitMinor, 0);
      const creditTotal = lines.reduce((total, line) => total + line.creditMinor, 0);
      if (debitTotal === 0 || debitTotal !== creditTotal) {
        throw new Error("Journal draft must have equal, non-zero debits and credits.");
      }
      await request("/api/journal-entries", {
        method: "POST",
        body: JSON.stringify({
          entryDate: entryDate.value,
          memo: memo.value,
          lines,
        }),
      });
      await renderJournal();
      showNotice("Balanced journal draft saved. It has not been posted.");
    });
  });
  panel.append(form);

  const response = await request<{ entries: Row[] }>("/api/journal-entries");
  const entries = sectionPanel("Journal history");
  entries.append(dataTable(
    ["Date", "Memo", "Lines", "Debits", "Credits", "Status", "Action"],
    response.entries.map((entry) => {
      const actions = el("div", undefined, "row-actions");
      if (entry.status === "draft" || entry.status === "pending_review") {
        const post = el("button", "Post as reviewer", "button button-small button-primary");
        post.type = "button";
        post.addEventListener("click", () => {
          void act(async () => {
            await request(`/api/journal-entries/${encodeURIComponent(text(entry.id))}/post`, {
              method: "POST",
              body: "{}",
            });
            await renderJournal();
            showNotice("Journal entry posted.");
          });
        });
        actions.append(post);
      }
      return [
        text(entry.entry_date),
        text(entry.memo),
        number(entry.line_count),
        money(entry.debit_minor),
        money(entry.credit_minor),
        text(entry.status),
        actions,
      ];
    }),
  ));
  replace(panel, entries);
}

function createJournalLine(accounts: Row[]): HTMLElement {
  const line = el("div", undefined, "journal-line");
  const account = el("select", undefined, "journal-account");
  account.setAttribute("aria-label", "Journal account");
  const placeholder = el("option", "Select account");
  placeholder.value = "";
  account.append(placeholder);
  for (const item of accounts) {
    const option = el("option", `${text(item.code)} · ${text(item.name)}`);
    option.value = text(item.id);
    account.append(option);
  }
  const debit = field("debit", "Debit", "number", false, "", "0.01");
  debit.min = "0";
  debit.className = "journal-debit";
  const credit = field("credit", "Credit", "number", false, "", "0.01");
  credit.min = "0";
  credit.className = "journal-credit";
  line.append(
    labelledField("Account", account),
    labelledField("Debit", debit),
    labelledField("Credit", credit),
  );
  return line;
}

function labelledField(label: string, input: HTMLElement): HTMLLabelElement {
  const wrapper = el("label", undefined, "field");
  wrapper.append(el("span", label), input);
  input.setAttribute("aria-label", label);
  return wrapper;
}

async function renderReconciliation(): Promise<void> {
  const accounts = await request<{ accounts: Row[] }>("/api/accounts");
  const panel = sectionPanel("Open a statement period");
  const form = createForm([
    field("periodStart", "Period start", "date", true),
    field("periodEnd", "Period end", "date", true),
    field("beginningBalance", "Beginning balance", "number", true, "", "0.01"),
    field("endingBalance", "Statement ending balance", "number", true, "", "0.01"),
  ]);
  form.querySelector<HTMLInputElement>('input[name="beginningBalance"]')?.removeAttribute("min");
  form.querySelector<HTMLInputElement>('input[name="endingBalance"]')?.removeAttribute("min");
  addSelect(form, "accountId", "Financial account", accounts.accounts, "id", "name");
  addSubmit(form, "Start reconciliation");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitForm(form, async (values) => {
      await request("/api/reconcile/sessions", {
        method: "POST",
        body: JSON.stringify({
          accountId: values.accountId,
          periodStart: values.periodStart,
          periodEnd: values.periodEnd,
          beginningBalanceMinor: Math.round(Number(values.beginningBalance) * 100),
          endingBalanceMinor: Math.round(Number(values.endingBalance) * 100),
        }),
      });
      await renderReconciliation();
    });
  });
  panel.append(form);
  const response = await request<{ sessions: Row[] }>("/api/reconcile/sessions");
  const list = sectionPanel("Reconciliation history");
  const matchPanel = sectionPanel("Match transactions");
  const matchContent = el("div");
  matchContent.className = "reconciliation-match-content";
  matchContent.append(el("p", "Choose an open reconciliation to review its transaction matches.", "muted"));
  matchPanel.append(matchContent);
  list.append(dataTable(
    ["Account", "Period", "Statement ending", "Book balance", "Difference", "Status", "Actions"],
    response.sessions.map((row) => {
      const actions = el("div", undefined, "row-actions");
      if (row.status === "open" || row.status === "in_progress") {
        const match = el("button", "Review matches", "button button-small button-secondary");
        match.type = "button";
        match.addEventListener("click", () => {
          void act(() => loadReconciliationMatches(row, matchPanel));
        });
        actions.append(match);
      }
      return [
        text(row.account_name),
        `${text(row.period_start)} – ${text(row.period_end)}`,
        money(row.ending_balance_minor),
        row.book_balance_minor === null ? "Not calculated" : money(row.book_balance_minor),
        row.difference_minor === null ? "Not calculated" : money(row.difference_minor),
        text(row.status),
        actions,
      ];
    }),
  ));
  replace(panel, list, matchPanel);
}

async function loadReconciliationMatches(session: Row, panel: HTMLElement): Promise<void> {
  const content = panel.querySelector<HTMLElement>(".reconciliation-match-content");
  if (!content) return;
  const response = await request<{ transactions: Row[] }>("/api/transactions?limit=200");
  const candidates = response.transactions.filter((row) =>
    text(row.account_id) === text(session.account_id) &&
    text(row.transaction_date) >= text(session.period_start) &&
    text(row.transaction_date) <= text(session.period_end) &&
    !Number(row.is_reconciled) &&
    ["pending", "reviewed", "posted"].includes(text(row.status)),
  );
  const rows = candidates.map((row) => {
    const match = el("button", "Match", "button button-small button-secondary");
    match.type = "button";
    match.addEventListener("click", () => {
      void act(async () => {
        const result = await request<{ differenceMinor: number }>(
          `/api/reconcile/sessions/${encodeURIComponent(text(session.id))}/matches`,
          {
            method: "POST",
            body: JSON.stringify({
              transactionId: text(row.id),
              matchType: "manual",
              rationale: "Manually matched to the selected statement period.",
            }),
          },
        );
        await renderReconciliation();
        showNotice(`Transaction matched. Remaining difference: ${money(result.differenceMinor)}.`);
      });
    });
    return [
      text(row.transaction_date),
      text(row.description),
      money(row.amount_minor),
      text(row.status),
      match,
    ];
  });
  content.replaceChildren(
    el("p", `${text(session.account_name)} · ${text(session.period_start)} to ${text(session.period_end)}`, "muted"),
    dataTable(["Date", "Description", "Amount", "Status", "Action"], rows),
  );
}

async function renderInvoices(): Promise<void> {
  const panel = sectionPanel("Create an invoice");
  const form = createForm([
    field("customerName", "Customer", "text", true),
    field("customerEmail", "Customer email", "email"),
    field("invoiceNumber", "Invoice number", "text", true),
    field("issueDate", "Issue date", "date", true, new Date().toISOString().slice(0, 10)),
    field("dueDate", "Due date", "date", true),
    field("total", "Total", "number", true, "", "0.01"),
  ]);
  addSubmit(form, "Save draft");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitForm(form, async (values) => {
      const total = Math.round(Number(values.total) * 100);
      if (!Number.isSafeInteger(total) || total < 0) throw new Error("Enter a valid invoice total.");
      await request("/api/invoices", {
        method: "POST",
        body: JSON.stringify({
          ...values,
          subtotalMinor: total,
          totalMinor: total,
          taxMinor: 0,
        }),
      });
      await renderInvoices();
    });
  });
  panel.append(form);
  const response = await request<{ invoices: Row[] }>("/api/invoices");
  const list = sectionPanel("Receivables");
  list.append(dataTable(
    ["Invoice", "Customer", "Issued", "Due", "Total", "Paid", "Status", "Actions"],
    response.invoices.map((row) => {
      const actions = el("div", undefined, "row-actions");
      const addAction = (label: string, status: string, danger = false): void => {
        const button = el(
          "button",
          label,
          `button button-small ${danger ? "button-danger" : "button-secondary"}`,
        );
        button.type = "button";
        button.addEventListener("click", () => {
          void act(async () => {
            if (danger && !window.confirm("Void this invoice? This cannot be undone.")) return;
            await request(`/api/invoices/${encodeURIComponent(text(row.id))}`, {
              method: "PATCH",
              body: JSON.stringify({ status }),
            });
            await renderInvoices();
            showNotice(`Invoice status changed to ${status.replaceAll("_", " ")}.`);
          });
        });
        actions.append(button);
      };
      if (row.status === "draft") addAction("Mark sent", "sent");
      if (row.status === "sent") addAction("Mark viewed", "viewed");
      if (row.status !== "void" && row.status !== "paid") addAction("Void", "void", true);
      return [
        text(row.invoice_number),
        text(row.customer_name),
        text(row.issue_date),
        text(row.due_date),
        money(row.total_minor),
        money(row.amount_paid_minor),
        text(row.status),
        actions,
      ];
    }),
  ));
  replace(panel, list);
}

async function renderBills(): Promise<void> {
  const panel = sectionPanel("Record a bill");
  const form = createForm([
    field("vendorName", "Vendor", "text", true),
    field("billNumber", "Vendor bill number", "text"),
    field("issueDate", "Bill date", "date", true),
    field("dueDate", "Due date", "date", true),
    field("total", "Total", "number", true, "", "0.01"),
  ]);
  addSubmit(form, "Save bill draft");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitForm(form, async (values) => {
      const total = Math.round(Number(values.total) * 100);
      if (!Number.isSafeInteger(total) || total < 0) throw new Error("Enter a valid bill total.");
      await request("/api/bills", {
        method: "POST",
        body: JSON.stringify({ ...values, totalMinor: total }),
      });
      await renderBills();
    });
  });
  panel.append(form);
  const response = await request<{ bills: Row[] }>("/api/bills");
  const list = sectionPanel("Payables");
  list.append(dataTable(
    ["Vendor", "Bill number", "Bill date", "Due", "Total", "Paid", "Status", "Actions"],
    response.bills.map((row) => {
      const actions = el("div", undefined, "row-actions");
      const addAction = (label: string, status: string, danger = false): void => {
        const button = el(
          "button",
          label,
          `button button-small ${danger ? "button-danger" : "button-secondary"}`,
        );
        button.type = "button";
        button.addEventListener("click", () => {
          void act(async () => {
            if (danger && !window.confirm("Void this bill? This cannot be undone.")) return;
            await request(`/api/bills/${encodeURIComponent(text(row.id))}`, {
              method: "PATCH",
              body: JSON.stringify({ status }),
            });
            await renderBills();
            showNotice(`Bill status changed to ${status.replaceAll("_", " ")}.`);
          });
        });
        actions.append(button);
      };
      if (row.status === "draft") addAction("Submit for approval", "pending_approval");
      if (row.status === "pending_approval") addAction("Approve bill", "approved");
      if (row.status !== "void" && row.status !== "paid") addAction("Void", "void", true);
      return [
        text(row.vendor_name),
        text(row.bill_number ?? "—"),
        text(row.issue_date),
        text(row.due_date),
        money(row.total_minor),
        money(row.amount_paid_minor),
        text(row.status),
        actions,
      ];
    }),
  ));
  replace(panel, list);
}

function renderReports(): void {
  const panel = sectionPanel("Generate a financial report");
  const form = createForm([
    field("from", "From", "date", true, `${new Date().getUTCFullYear()}-01-01`),
    field("to", "To", "date", true, new Date().toISOString().slice(0, 10)),
  ]);
  const typeSelect = el("select");
  typeSelect.name = "type";
  for (const [value, label] of [
    ["profit-and-loss", "Profit and loss"],
    ["balance-sheet", "Balance sheet"],
    ["trial-balance", "Trial balance"],
    ["general-ledger", "General ledger"],
    ["ar-aging", "Accounts receivable aging"],
    ["ap-aging", "Accounts payable aging"],
  ] as const) {
    const option = el("option", label);
    option.value = value;
    typeSelect.append(option);
  }
  addLabel(form, "Report", typeSelect);
  addSubmit(form, "Run report");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitForm(form, async (values) => {
      const result = await request<{ data: Row[] }>(
        `/api/reports/${typeSelect.value}?from=${encodeURIComponent(values["from"] ?? "")}&to=${encodeURIComponent(values["to"] ?? "")}`,
      );
      const output = document.querySelector<HTMLElement>("#report-result");
      if (output) output.replaceChildren(dataTable(
        Object.keys(result.data[0] ?? { message: "No results for this period" }),
        result.data.map((row) => Object.values(row).map((value) => text(value))),
      ));
    });
  });
  const output = el("div");
  output.id = "report-result";
  panel.append(form, output);
  replace(panel);
}

async function renderClose(): Promise<void> {
  const create = sectionPanel("Start a close period");
  const form = createForm([
    field("year", "Year", "number", true, String(new Date().getUTCFullYear())),
    field("month", "Month", "number", true, String(new Date().getUTCMonth() + 1)),
  ]);
  addSubmit(form, "Create close checklist");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitForm(form, async (values) => {
      await request("/api/close/periods", {
        method: "POST",
        body: JSON.stringify({ year: Number(values.year), month: Number(values.month) }),
      });
      await renderClose();
    });
  });
  create.append(form);
  const response = await request<{ periods: Row[] }>("/api/close/periods");
  const periods = sectionPanel("Close periods");
  for (const period of response.periods) {
    const card = el("article", undefined, "period-card");
    const heading = el("div", undefined, "period-heading");
    heading.append(
      el("h3", `${period.period_year}-${String(period.period_month).padStart(2, "0")}`),
      el("span", `${text(period.status)} · ${number(period.checklist_percent)}% complete`, "status-pill"),
    );
    card.append(heading);
    const loadTasks = el("button", "View checklist", "button button-secondary");
    loadTasks.type = "button";
    loadTasks.addEventListener("click", () => void loadCloseTasks(card, text(period.id), Boolean(period.books_locked)));
    card.append(loadTasks);
    if (!period.books_locked && period.status !== "closed") {
      const lock = el("button", "Lock period", "button button-danger");
      lock.type = "button";
      lock.addEventListener("click", () => {
        void act(async () => {
          await request(`/api/close/periods/${encodeURIComponent(text(period.id))}/lock`, { method: "POST", body: "{}" });
          await renderClose();
        });
      });
      card.append(lock);
    } else {
      const reopen = el("button", "Reopen with reason", "button button-secondary");
      reopen.type = "button";
      reopen.addEventListener("click", () => {
        const reason = window.prompt("Reason for reopening this locked period:");
        if (!reason?.trim()) return;
        void act(async () => {
          await request(`/api/close/periods/${encodeURIComponent(text(period.id))}/reopen`, {
            method: "POST",
            body: JSON.stringify({ reason }),
          });
          await renderClose();
        });
      });
      card.append(reopen);
    }
    periods.append(card);
  }
  replace(create, periods);
}

async function loadCloseTasks(card: HTMLElement, periodId: string, locked: boolean): Promise<void> {
  const result = await request<{ tasks: Row[] }>(`/api/close/periods/${encodeURIComponent(periodId)}/tasks`);
  const list = el("div", undefined, "task-list");
  for (const task of result.tasks) {
    const item = el("div", undefined, "task-row");
    const details = el("div");
    details.append(el("strong", text(task.title)), el("span", `${text(task.owner_role)} · ${text(task.status)}`, "muted"));
    item.append(details);
    if (!locked && task.status !== "complete") {
      const complete = el("button", "Complete", "button button-small");
      complete.type = "button";
      complete.addEventListener("click", () => {
        void act(async () => {
          await request(`/api/close/tasks/${encodeURIComponent(text(task.id))}`, {
            method: "PATCH",
            body: JSON.stringify({ status: "complete" }),
          });
          await renderClose();
        });
      });
      item.append(complete);
    }
    list.append(item);
  }
  card.querySelector(".task-list")?.remove();
  card.append(list);
}

async function renderDocuments(): Promise<void> {
  const panel = sectionPanel("Upload a supporting document");
  const form = createForm([
    field("title", "Document title", "text"),
    field("file", "File (PDF, JPG, PNG, or CSV; up to 10 MB)", "file", true),
  ]);
  form.querySelector<HTMLInputElement>('input[name="file"]')!.accept = ".pdf,.jpg,.jpeg,.png,.csv,application/pdf,image/jpeg,image/png,text/csv";
  const category = el("select");
  category.name = "category";
  for (const [value, label] of [
    ["receipt", "Receipt"],
    ["bank_statement", "Bank statement"],
    ["invoice", "Invoice"],
    ["tax_document", "Tax document"],
    ["other", "Other"],
  ] as const) {
    const option = el("option", label);
    option.value = value;
    category.append(option);
  }
  addLabel(form, "Document type", category);
  addSubmit(form, "Upload privately");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitForm(form, async () => {
      const response = await fetch("/api/documents", {
        method: "POST",
        body: new FormData(form),
        credentials: "same-origin",
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Upload failed.");
      await renderDocuments();
    });
  });
  panel.append(form);
  const response = await request<{ documents: Row[] }>("/api/documents");
  const list = sectionPanel("Document vault");
  list.append(dataTable(
    ["Document", "Type", "Format", "Size", "Added", "Access"],
    response.documents.map((row) => [
      text(row.title),
      text(row.document_category),
      text(row.mime_type),
      `${number(Math.ceil(Number(row.byte_size) / 1024))} KB`,
      text(row.created_at),
      "Private",
    ]),
  ));
  replace(panel, list);
}

async function renderExceptions(): Promise<void> {
  const response = await request<{ exceptions: Row[] }>("/api/exceptions");
  const panel = sectionPanel(`Exception queue · ${response.exceptions.length}`);
  panel.append(dataTable(
    ["Severity", "Exception", "Description", "Financial impact", "Status", "Created"],
    response.exceptions.map((row) => [
      text(row.severity),
      text(row.title),
      text(row.description),
      money(row.financial_impact_minor),
      text(row.status),
      text(row.created_at),
    ]),
  ));
  replace(panel);
}

async function renderSettings(): Promise<void> {
  const panel = sectionPanel("Chart of accounts");
  const form = createForm([
    field("code", "Account code", "text", true),
    field("name", "Account name", "text", true),
  ]);
  const select = el("select");
  select.name = "accountType";
  for (const type of ["asset", "liability", "equity", "income", "expense"]) {
    const option = el("option", titleCase(type));
    option.value = type;
    select.append(option);
  }
  addLabel(form, "Account type", select);
  addSubmit(form, "Add account");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitForm(form, async (values) => {
      await request("/api/accounts", { method: "POST", body: JSON.stringify(values) });
      await renderSettings();
    });
  });
  panel.append(form);
  const [accounts, categories] = await Promise.all([
    request<{ accounts: Row[] }>("/api/accounts"),
    request<{ categories: Row[] }>("/api/categories"),
  ]);
  const accountList = sectionPanel("Accounts");
  accountList.append(dataTable(
    ["Code", "Account", "Type", "Subtype", "Status"],
    accounts.accounts.map((row) => [
      text(row.code), text(row.name), text(row.account_type), text(row.subtype ?? "—"),
      Number(row.is_active) ? "Active" : "Archived",
    ]),
  ));
  const categoryList = sectionPanel("Categories");
  categoryList.append(dataTable(
    ["Category", "Type", "Linked account"],
    categories.categories.map((row) => [
      text(row.name), text(row.kind), text(row.account_id ?? "No mapped account"),
    ]),
  ));
  replace(panel, accountList, categoryList);
}

function field(
  name: string,
  label: string,
  type: string,
  required = false,
  value = "",
  step?: string,
): HTMLInputElement {
  const input = el("input");
  input.name = name;
  input.type = type;
  input.required = required;
  input.value = value;
  if (step) input.step = step;
  if (type === "number") input.min = "0";
  return input;
}

function createForm(fields: HTMLInputElement[]): HTMLFormElement {
  const form = el("form", undefined, "form-grid");
  for (const input of fields) {
    addLabel(form, input.name, input);
  }
  return form;
}

function addLabel(form: HTMLFormElement, label: string, input: HTMLElement): void {
  const wrapper = el("label", undefined, "field");
  wrapper.append(el("span", titleCase(label)));
  input.setAttribute("aria-label", titleCase(label));
  wrapper.append(input);
  form.append(wrapper);
}

function addSelect(
  form: HTMLFormElement,
  name: string,
  label: string,
  options: Row[],
  valueKey: string,
  labelKey: string,
): HTMLSelectElement {
  const select = el("select");
  select.name = name;
  const empty = el("option", "Select…");
  empty.value = "";
  select.append(empty);
  for (const row of options) {
    const option = el("option", text(row[labelKey]));
    option.value = text(row[valueKey]);
    select.append(option);
  }
  addLabel(form, label, select);
  return select;
}

function addSubmit(form: HTMLFormElement, label: string): void {
  const row = el("div", undefined, "form-actions");
  const button = el("button", label, "button button-primary");
  button.type = "submit";
  row.append(button);
  form.append(row);
}

function sectionPanel(title: string): HTMLElement {
  const panel = el("section", undefined, "panel");
  panel.append(el("h2", title, "panel-title"));
  return panel;
}

function dataTable(headers: string[], rows: Array<Array<string | HTMLElement>>): HTMLElement {
  if (!rows.length) return el("p", "No records yet.", "muted");
  const wrapper = el("div", undefined, "table-scroll");
  const table = el("table");
  const head = el("thead");
  const headRow = el("tr");
  for (const value of headers) headRow.append(el("th", value));
  head.append(headRow);
  const body = el("tbody");
  for (const row of rows) {
    const tr = el("tr");
    for (const value of row) {
      const cell = el("td");
      cell.append(typeof value === "string" ? document.createTextNode(value) : value);
      tr.append(cell);
    }
    body.append(tr);
  }
  table.append(head, body);
  wrapper.append(table);
  return wrapper;
}

function replace(...children: HTMLElement[]): void {
  if (!container) return;
  container.replaceChildren(...children);
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  value?: string,
  className?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (value !== undefined) element.textContent = value;
  if (className) element.className = className;
  return element;
}

async function request<T = unknown>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "same-origin",
    headers: {
      ...(init.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error =
      typeof payload === "object" && payload !== null && "error" in payload
        ? String(payload.error)
        : "Request failed.";
    throw new ApiError(error, response.status);
  }
  return payload as T;
}

async function submitForm(
  form: HTMLFormElement,
  action: (values: Record<string, string>) => Promise<void>,
): Promise<void> {
  try {
    await action(Object.fromEntries(new FormData(form).entries()) as Record<string, string>);
    form.reset();
    showNotice("Saved.");
  } catch (error) {
    showError(error instanceof Error ? error.message : "The action could not be completed.");
  }
}

async function act(action: () => Promise<void>): Promise<void> {
  try {
    clearError();
    await action();
  } catch (error) {
    showError(error instanceof Error ? error.message : "The action could not be completed.");
  }
}

function showError(message: string): void {
  if (!alertBox) return;
  alertBox.hidden = false;
  alertBox.textContent = message.replaceAll("_", " ");
}

function clearError(): void {
  if (!alertBox) return;
  alertBox.hidden = true;
  alertBox.textContent = "";
}

function showNotice(message: string): void {
  clearError();
  const notice = el("p", message, "success-message");
  container?.prepend(notice);
}

function money(value: unknown): string {
  const minor = typeof value === "number" ? value : Number(value ?? 0);
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(minor / 100);
}

function number(value: unknown): string {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? new Intl.NumberFormat().format(parsed) : "0";
}

function text(value: unknown): string {
  return value === null || value === undefined || value === "" ? "—" : String(value);
}

function titleCase(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}
