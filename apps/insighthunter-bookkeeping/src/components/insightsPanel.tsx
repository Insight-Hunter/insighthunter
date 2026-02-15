// src/components/InsightsPanel.tsx
import { useState, useEffect } from 'react';
import { FiAlertCircle, FiInfo, FiAlertTriangle } from 'react-icons/fi';
import './InsightsPanel.css';

interface InsightsPanelProps {
  companyId: string;
}

export default function InsightsPanel({ companyId }: InsightsPanelProps) {
  const [insights, setInsights] = useState<any[]>([]);

  const API_URL = 'http://localhost:8787';

  useEffect(() => {
    loadInsights();
  }, []);

  async function loadInsights() {
    try {
      const response = await fetch(
        `${API_URL}/api/ledger/${companyId}/insights`
      );
      const data = await response.json();
      setInsights(data.insights || []);
    } catch (error) {
      console.error('Failed to load insights:', error);
    }
  }

  function getIcon(type: string) {
    switch (type) {
      case 'warning':
        return <FiAlertTriangle className="icon-warning" />;
      case 'alert':
        return <FiAlertCircle className="icon-alert" />;
      default:
        return <FiInfo className="icon-info" />;
    }
  }

  return (
    <div className="insights-panel">
      <h2>AI Insights</h2>
      
      {insights.length === 0 ? (
        <div className="no-insights">
          <p>No insights available at this time.</p>
        </div>
      ) : (
        <div className="insights-list">
          {insights.map((insight, index) => (
            <div key={index} className={`insight-card ${insight.priority}`}>
              <div className="insight-header">
                {getIcon(insight.type)}
                <h3>{insight.title}</h3>
              </div>
              <p>{insight.message}</p>
              {insight.actionable && (
                <button className="btn-action">Take Action</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
