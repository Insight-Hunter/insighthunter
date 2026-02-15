// src/components/banking/PlaidLink.tsx
import { useEffect, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';

interface PlaidLinkProps {
  userId: string;
  companyId: string;
  onSuccess: (publicToken: string, metadata: any) => void;
}

export default function PlaidLink({ userId, companyId, onSuccess }: PlaidLinkProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);

  useEffect(() => {
    createLinkToken();
  }, []);

  async function createLinkToken() {
    try {
      const response = await fetch('/api/bank/create-link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, companyId }),
      });

      const data = await response.json();
      setLinkToken(data.linkToken);
    } catch (error) {
      console.error('Failed to create link token:', error);
    }
  }

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (publicToken, metadata) => {
      onSuccess(publicToken, metadata);
    },
  });

  return (
    <button
      onClick={() => open()}
      disabled={!ready}
      className="btn-primary"
    >
      Connect Bank Account
    </button>
  );
}
