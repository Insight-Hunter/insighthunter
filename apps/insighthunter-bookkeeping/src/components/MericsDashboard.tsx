// src/components/MetricsDashboard.tsx
import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import './MetricsDashboard.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface MetricsDashboardProps {
  companyId: string;
}

export default function MetricsDashboard({ companyId }: MetricsDashboardProps) {
  const [metrics, setMetrics] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const API_URL = 'http://localhost:8787';

  useEffect(() => {
    loadMetrics();
    loadTrends();
  }, []);

  async function loadMetrics() {
    try {
      const response = await fetch(
        `${API_URL}/api/ledger/${companyId}/metrics/snapshot`
      );
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  }

  async function loadTrends() {
    try {
      const response = await fetch(
        `${API_URL}/api/ledger/${companyId}/metrics/trends?months=12`
      );
      const data = await response.json();
      setTrends(data.trends);
    } catch (error) {
      console.error('Failed to load trends:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="metrics-loading">Loading metrics...</div>;
  }

  const chartData = {
    labels: trends.map((t) => new Date(t.date).toLocaleDateString('en-US', { month: 'short' })),
    datasets: [
      {
        label: 'Revenue',
        data: trends.map((t) => t.revenue),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
      },
      {
        label: 'Expenses',
        data: trends.map((t) => t.expenses),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
      },
    ],
  };

  return (
    <div className="metrics-dashboard">
      <div className="key-metrics">
        <div className="metric-card highlight">
          <h3>Cash Balance</h3>
          <p className="metric-value">
            ${metrics?.cashBalance?.toLocaleString() || '0'}
          </p>
        </div>

        <div className="metric-card">
          <h3>Monthly Burn Rate</h3>
          <p className="metric-value">
            ${metrics?.burnRate?.toLocaleString() || '0'}
          </p>
        </div>

        <div className="metric-card">
          <h3>Runway</h3>
          <p className="metric-value">
            {metrics?.runway?.toFixed(1) || '0'} months
          </p>
        </div>

        <div className="metric-card">
          <h3>MRR</h3>
          <p className="metric-value">
            ${metrics?.mrr?.toLocaleString() || '0'}
          </p>
        </div>

        <div className="metric-card">
          <h3>ARR</h3>
          <p className="metric-value">
            ${metrics?.arr?.toLocaleString() || '0'}
          </p>
        </div>
      </div>

      <div className="trends-chart">
        <h3>Revenue & Expenses Trend</h3>
        <Line data={chartData} />
      </div>
    </div>
  );
}
