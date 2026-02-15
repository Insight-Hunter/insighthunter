// src/components/AIReconciliation.tsx
import { useState, useEffect } from 'react';
import { FiZap, FiCheck, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import './AIReconciliation.css';

interface AIReconciliationProps {
  companyId: string;
}

interface MatchResult {
  bankTxId: string;
  bookTxId: string;
  confidence: number;
  reasoning: string;
  suggestedAction: 'auto-match' | 'review' | 'reject';
}

export default function AIReconciliation({ companyId }: AIReconciliationProps) {
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const API_URL = 'http://localhost:8787';

  async function runAIReconciliation() {
    setLoading(true);
    
    try {
      const response = await fetch(
        `${API_URL}/api/ledger/${companyId}/ai-reconciliation`,
        { method: 'POST' }
      );

      const data = await response.json();
      setMatches(data.matches || []);
    } catch (error) {
      console.error('AI reconciliation failed:', error);
    } finally {
      setLoading(false);
    }
  }

  async function acceptMatch(match: MatchResult) {
    setProcessing(true);
    
    try {
      await fetch(
        `${API_URL}/api/ledger/${companyId}/accept-match`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bankTxId: match.bankTxId,
            bookTxId: match.bookTxId,
          }),
        }
      );

      // Remove from list
      setMatches(matches.filter((m) => m.bankTxId !== match.bankTxId));
    } catch (error) {
      console.error('Failed to accept match:', error);
    } finally {
      setProcessing(false);
    }
  }

  function getConfidenceColor(confidence: number): string {
    if (confidence >= 90) return 'high';
    if (confidence >= 70) return 'medium';
    return 'low';
  }

  return (
    <div className="ai-reconciliation">
      <div className="ai-header">
        <div className="ai-title">
          <FiZap className="ai-icon" />
          <h2>AI-Powered Reconciliation</h2>
        </div>
        <button
          onClick={runAIReconciliation}
          disabled={loading}
          className="btn-primary"
        >
          {loading ? (
            <>
              <FiRefreshCw className="spinning" /> Analyzing...
            </>
          ) : (
            <>
              <FiZap /> Run AI Matching
            </>
          )}
        </button>
      </div>

      {matches.length === 0 && !loading ? (
        <div className="no-matches">
          <p>No AI matches found. Click "Run AI Matching" to analyze transactions.</p>
        </div>
      ) : (
        <div className="matches-list">
          {matches.map((match) => (
            <div key={match.bankTxId} className="match-card">
              <div className="match-header">
                <div className={`confidence-badge ${getConfidenceColor(match.confidence)}`}>
                  {match.confidence}% confident
                </div>
                <div className="action-badge">
                  {match.suggestedAction === 'auto-match' && (
                    <span className="auto-match">
                      <FiCheck /> Auto-Match
                    </span>
                  )}
                  {match.suggestedAction === 'review' && (
                    <span className="review">
                      <FiAlertCircle /> Needs Review
                    </span>
                  )}
                </div>
              </div>

              <div className="match-reasoning">
                <h4>AI Reasoning:</h4>
                <p>{match.reasoning}</p>
              </div>

              <div className="match-actions">
                <button
                  onClick={() => acceptMatch(match)}
                  disabled={processing}
                  className="btn-accept"
                >
                  <FiCheck /> Accept Match
                </button>
                <button
                  onClick={() =>
                    setMatches(matches.filter((m) => m.bankTxId !== match.bankTxId))
                  }
                  className="btn-reject"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="ai-stats">
        <h3>AI Reconciliation Stats</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Auto-Matched</span>
            <span className="stat-value">
              {matches.filter((m) => m.suggestedAction === 'auto-match').length}
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Need Review</span>
            <span className="stat-value">
              {matches.filter((m) => m.suggestedAction === 'review').length}
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Average Confidence</span>
            <span className="stat-value">
              {matches.length > 0
                ? Math.round(
                    matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length
                  )
                : 0}
              %
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
