import { useState } from 'react';

type Suggestion = {
  name: string;
  tagline?: string;
  rationale?: string;
};

export function NameSuggestionsPanel() {
  const [businessConcept, setBusinessConcept] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function generate() {
    setLoading(true);
    setError('');
    try {
      const token = (window as any).__IH_TOKEN__ || '';
      const response = await fetch('/api/ai/name-suggestions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ businessConcept, tone: 'professional' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate suggestions');
      setSuggestions(data.suggestions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <h3>Name suggestions</h3>
      <textarea
        value={businessConcept}
        onChange={(e) => setBusinessConcept(e.target.value)}
        placeholder="Describe your business idea"
        rows={5}
      />
      <button onClick={generate} disabled={loading || !businessConcept.trim()}>
        {loading ? 'Generating…' : 'Generate names'}
      </button>
      {error ? <p role="alert">{error}</p> : null}
      <ul>
        {suggestions.map((item, index) => (
          <li key={`${item.name}-${index}`}>
            <strong>{item.name}</strong>
            {item.tagline ? <div>{item.tagline}</div> : null}
            {item.rationale ? <small>{item.rationale}</small> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
