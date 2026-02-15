// src/components/ReportCard.tsx
import { useState, useEffect } from 'react';
import './ReportCard.css';

interface ReportCardProps {
  title: string;
  type: 'balance-sheet' | 'profit-loss';
  companyId: string;
}

export default function ReportCard({ title, type, companyId }: ReportCardProps) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const API_URL = 'http://localhost:8787';

  useEffect(() => {
    loadReport();
  }, [type]);

  async function loadReport() {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/api/ledger/${companyId}/${type}`
      );
      const data = await response.json();
      setReport(data);
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="report-card loading">Loading...</div>;
  }

  if (!report) {
    return <div className="report-card error">Failed to load report</div>;
  }

  return (
    <div className="report-card">
      <h2>{title}</h2>

      {type === 'balance-sheet' && (
        <div className="balance-sheet">
          <section>
            <h3>Assets</h3>
            <div className="subsection">
              <h4>Current Assets</h4>
              {report.assets.currentAssets.map((item: any, i: number) => (
                <div key={i} className="line-item">
                  <span>{item.name}</span>
                  <span>${item.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="subsection">
              <h4>Fixed Assets</h4>
              {report.assets.fixedAssets.map((item: any, i: number) => (
                <div key={i} className="line-item">
                  <span>{item.name}</span>
                  <span>${item.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="total-line">
              <strong>Total Assets</strong>
              <strong>${report.assets.total.toFixed(2)}</strong>
            </div>
          </section>

          <section>
            <h3>Liabilities & Equity</h3>
            <div className="subsection">
              <h4>Liabilities</h4>
              {[
                ...report.liabilities.currentLiabilities,
                ...report.liabilities.longTermLiabilities,
              ].map((item: any, i: number) => (
                <div key={i} className="line-item">
                  <span>{item.name}</span>
                  <span>${item.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="subsection">
              <h4>Equity</h4>
              {report.equity.items.map((item: any, i: number) => (
                <div key={i} className="line-item">
                  <span>{item.name}</span>
                  <span>${item.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="total-line">
              <strong>Total Liabilities & Equity</strong>
              <strong>
                ${(report.liabilities.total + report.equity.total).toFixed(2)}
              </strong>
            </div>
          </section>
        </div>
      )}

      {type === 'profit-loss' && (
        <div className="profit-loss">
          <section>
            <h3>Revenue</h3>
            {report.revenue.map((item: any, i: number) => (
              <div key={i} className="line-item">
                <span>{item.name}</span>
                <span>${item.amount.toFixed(2)}</span>
              </div>
            ))}
            <div className="total-line">
              <strong>Total Revenue</strong>
              <strong>${report.totalRevenue.toFixed(2)}</strong>
            </div>
          </section>

          <section>
            <h3>Cost of Goods Sold</h3>
            {report.costOfGoodsSold.map((item: any, i: number) => (
              <div key={i} className="line-item">
                <span>{item.name}</span>
                <span>${item.amount.toFixed(2)}</span>
              </div>
            ))}
            <div className="total-line">
              <strong>Total COGS</strong>
              <strong>${report.totalCOGS.toFixed(2)}</strong>
            </div>
          </section>

          <div className="gross-profit">
            <strong>Gross Profit</strong>
            <strong>${report.grossProfit.toFixed(2)}</strong>
          </div>

          <section>
            <h3>Expenses</h3>
            {report.expenses.map((item: any, i: number) => (
              <div key={i} className="line-item">
                <span>{item.name}</span>
                <span>${item.amount.toFixed(2)}</span>
              </div>
            ))}
            <div className="total-line">
              <strong>Total Expenses</strong>
              <strong>${report.totalExpenses.toFixed(2)}</strong>
            </div>
          </section>

          <div className="net-income">
            <strong>Net Income</strong>
            <strong className={report.netIncome >= 0 ? 'positive' : 'negative'}>
              ${report.netIncome.toFixed(2)}
            </strong>
          </div>
        </div>
      )}

      <button onClick={loadReport} className="btn-refresh">
        Refresh Report
      </button>
    </div>
  );
}
