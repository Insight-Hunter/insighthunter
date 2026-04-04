import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiBase } from "../../hooks/useApi";

interface Props {
  onClose: () => void;
}

const AccountForm: React.FC<Props> = ({ onClose }) => {
  const { apiFetch } = useApiBase();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState("expense");
  const [subtype, setSubtype] = useState("expense");
  const [description, setDescription] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch("/accounts", {
        method: "POST",
        body: JSON.stringify({
          name,
          code,
          type,
          subtype,
          description: description || undefined,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      onClose();
    },
  });

  return (
    <div className="bk-modal-backdrop">
      <div className="bk-modal">
        <header className="bk-modal-header">
          <h2>New Account</h2>
        </header>
        <div className="bk-modal-body">
          <div className="bk-field">
            <label>Code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. 6210"
            />
          </div>
          <div className="bk-field">
            <label>Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Software & Subscriptions"
            />
          </div>
          <div className="bk-field-grid">
            <div>
              <label>Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="asset">Asset</option>
                <option value="liability">Liability</option>
                <option value="equity">Equity</option>
                <option value="revenue">Revenue</option>
                <option value="expense">Expense</option>
                <option value="cost_of_goods_sold">COGS</option>
                <option value="other_income">Other income</option>
                <option value="other_expense">Other expense</option>
              </select>
            </div>
            <div>
              <label>Subtype</label>
              <input
                value={subtype}
                onChange={(e) => setSubtype(e.target.value)}
                placeholder="expense, bank, accounts_payable…"
              />
            </div>
          </div>
          <div className="bk-field">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          {mutation.isError && (
            <div className="bk-alert bk-alert--error">
              {(mutation.error as Error).message}
            </div>
          )}
        </div>
        <footer className="bk-modal-footer">
          <button
            className="bk-btn"
            onClick={onClose}
            disabled={mutation.isLoading}
          >
            Cancel
          </button>
          <button
            className="bk-btn bk-btn--primary"
            onClick={() => mutation.mutate()}
            disabled={mutation.isLoading || !name || !code}
          >
            {mutation.isLoading ? "Saving…" : "Save account"}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default AccountForm;
