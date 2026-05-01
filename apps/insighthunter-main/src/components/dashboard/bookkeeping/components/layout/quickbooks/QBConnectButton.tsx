import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useApiBase } from "../../hooks/useApi";

const QBConnectButton: React.FC = () => {
  const { apiFetch } = useApiBase();

  const { data, isLoading, error } = useQuery<{ url: string }>({
    queryKey: ["qb-connect-url"],
    queryFn: () => apiFetch("/quickbooks/connect-url"),
  });

  if (error) {
    return (
      <div className="bk-alert bk-alert--error">{(error as Error).message}</div>
    );
  }

  return (
    <button
      className="bk-btn bk-btn--primary"
      disabled={isLoading || !data?.url}
      onClick={() => data?.url && (window.location.href = data.url)}
    >
      {isLoading ? "Preparing…" : "Connect QuickBooks"}
    </button>
  );
};

export default QBConnectButton;
