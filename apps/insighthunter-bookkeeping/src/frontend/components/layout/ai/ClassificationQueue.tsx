import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiBase } from "../../hooks/useApi";

interface QueueItem {
  id: string;
  transaction_id: string;
  question: string;
  suggested_account_id: string | null;
  suggested_account_name: string | null;
  confidence: number;
  ai_reasoning: string;
  alternatives: string;
}

const ClassificationQueue: React.FC = () => {
  const { apiFetch } = useApiBase();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery<QueueItem[]>({
    queryKey: ["ai-queue"],
    queryFn: () => apiFetch("/ai/queue").catch(() => [] as QueueItem[]),
  });

  const approve = useMutation({
    mutationFn: (input: { queueItemId: string; accountId: string }) =>
      apiFetch("/ai/approve", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-queue"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      setSelectedId(null);
    },
  });

  useEffect(() => {
    const id = setInterval(refetch, 15000);
    return () => clearInterval(id);
  }, [refetch]);

  return (
    <div className="bk-page">
      <header className="bk-page-header">
        <div>
          <h1>AI Classification Queue</h1>
          <p>
            Review and approve low-confidence classifications and edge cases.
          </p>
        </div>
      </header>

      <section className="bk-panel">
        {isLoading && <div>Loading queue…</div>}
        {error && (
          <div className="bk-alert bk-alert--error">
            {(error as Error).message}
          </div>
        )}
        {!isLoading && !error && (data ?? []).length === 0 && (
          <div>No items awaiting review. You’re all caught up.</div>
        )}
        {!isLoading && !error && (data ?? []).length > 0 && (
          <table className="bk-table bk-table--hover">
            <thead>
              <tr>
                <th>Question</th>
                <th>Suggested</th>
                <th className="bk-num">Confidence</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((item) => (
                <tr key={item.id}>
                  <td>{item.question}</td>
                  <td>
                    {item.suggested_account_name ?? "None"}{" "}
                    {item.suggested_account_id &&
                      `(${item.suggested_account_id.slice(0, 6)}…)`}
                  </td>
                  <td className="bk-num">
                    {(item.confidence * 100).toFixed(1)}%
                  </td>
                  <td className="bk-num">
                    <button
                      className="bk-btn bk-btn--secondary"
                      onClick={() => setSelectedId(item.id)}
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {selectedId && (
        <AmbiguityModal
          item={data!.find((x) => x.id === selectedId)!}
          onClose={() => setSelectedId(null)}
          onApprove={(accountId) =>
            approve.mutate({ queueItemId: selectedId, accountId })
          }
        />
      )}
    </div>
  );
};

interface AmbiguityModalProps {
  item: QueueItem;
  onClose: () => void;
  onApprove: (accountId: string) => void;
}

const AmbiguityModal: React.FC<AmbiguityModalProps> = ({
  item,
  onClose,
  onApprove,
}) => {
  const [accountId, setAccountId] = useState(item.suggested_account_id ?? "");
  const alternatives = (() => {
    try {
      return JSON.parse(item.alternatives) as Array<{
        account_id: string;
        account_name: string;
        confidence: number;
      }>;
    } catch {
      return [];
    }
  })();

  return (
    <div className="bk-modal-backdrop">
      <div className="bk-modal">
        <header className="bk-modal-header">
          <h2>Review classification</h2>
        </header>
        <div className="bk-modal-body">
          <p className="bk-question">{item.question}</p>
          <p className="bk-ai-reasoning">{item.ai_reasoning}</p>

          <div className="bk-field">
            <label>Choose account</label>
            <input
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="Paste or type account ID"
            />
          </div>

          {alternatives.length > 0 && (
            <div className="bk-alt-list">
              <p>AI suggestions:</p>
              <ul>
                {alternatives.map((alt) => (
                  <li key={alt.account_id}>
                    <button
                      className="bk-chip"
                      onClick={() => setAccountId(alt.account_id)}
                    >
                      {alt.account_name} ({(alt.confidence * 100).toFixed(1)}%)
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <footer className="bk-modal-footer">
          <button className="bk-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="bk-btn bk-btn--primary"
            onClick={() => onApprove(accountId)}
            disabled={!accountId}
          >
            Approve
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ClassificationQueue;
