import { useEffect, useState } from 'react';

type DocumentItem = {
  id: string;
  file_name: string;
  kind: string;
  status: string;
  created_at: string;
};

export function DocumentList({ businessId }: { businessId: string }) {
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [error, setError] = useState('');

  async function load() {
    try {
      const token = (window as any).__IH_TOKEN__ || '';
      const response = await fetch(`/api/documents/${businessId}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load documents');
      setItems(data.documents || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  useEffect(() => {
    void load();
  }, [businessId]);

  async function openDocument(documentId: string) {
    const token = (window as any).__IH_TOKEN__ || '';
    const response = await fetch(`/api/documents/download-token/${documentId}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (data.downloadUrl) {
      window.open(data.downloadUrl, '_blank', 'noopener,noreferrer');
    }
  }

  return (
    <section>
      <h3>Documents</h3>
      {error ? <p role="alert">{error}</p> : null}
      <ul>
        {items.map((doc) => (
          <li key={doc.id}>
            <span>{doc.file_name}</span>
            <span> · {doc.status}</span>
            {doc.status === 'ready' ? (
              <button onClick={() => openDocument(doc.id)}>Open</button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
