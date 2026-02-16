// src/components/InvoiceManager.tsx
import { useState, useEffect } from 'react';
import { FiPlus, FiEdit, FiTrash2, FiSend, FiDollarSign } from 'react-icons/fi';
import './InvoiceManager.css';

interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  issueDate: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  total: number;
}

interface InvoiceManagerProps {
  companyId: string;
}

export default function InvoiceManager({ companyId }: InvoiceManagerProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const API_URL = 'http://localhost:8787';

  useEffect(() => {
    loadInvoices();
  }, [filter]);

  async function loadInvoices() {
    setLoading(true);
    
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.append('status', filter);
      }

      const response = await fetch(
        `${API_URL}/api/invoices/${companyId}?${params.toString()}`
      );
      const data = await response.json();
      setInvoices(data.invoices || []);
    } catch (error) {
      console.error('Failed to load invoices:', error);
    } finally {
      setLoading(false);
    }
  }

  function getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      draft: 'status-draft',
      sent: 'status-sent',
      paid: 'status-paid',
      overdue: 'status-overdue',
      cancelled: 'status-cancelled',
    };
    return classes[status] || '';
  }

  function calculateTotals() {
    return {
      total: invoices.reduce((sum, inv) => sum + inv.total, 0),
      paid: invoices
        .filter((inv) => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.total, 0),
      unpaid: invoices
        .filter((inv) => inv.status !== 'paid' && inv.status !== 'cancelled')
        .reduce((sum, inv) => sum + inv.total, 0),
    };
  }

  const totals = calculateTotals();

  return (
    <div className="invoice-manager">
      <div className="invoice-header">
        <h2>Invoices</h2>
        <button className="btn-primary">
          <FiPlus /> Create Invoice
        </button>
      </div>

      <div className="invoice-summary">
        <div className="summary-card">
          <span className="summary-label">Total Invoiced</span>
          <span className="summary-value">${totals.total.toLocaleString()}</span>
        </div>
        <div className="summary-card paid">
          <span className="summary-label">Paid</span>
          <span className="summary-value">${totals.paid.toLocaleString()}</span>
        </div>
        <div className="summary-card unpaid">
          <span className="summary-label">Unpaid</span>
          <span className="summary-value">${totals.unpaid.toLocaleString()}</span>
        </div>
      </div>

      <div className="invoice-filters">
        <button
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={filter === 'draft' ? 'active' : ''}
          onClick={() => setFilter('draft')}
        >
          Draft
        </button>
        <button
          className={filter === 'sent' ? 'active' : ''}
          onClick={() => setFilter('sent')}
        >
          Sent
        </button>
        <button
          className={filter === 'paid' ? 'active' : ''}
          onClick={() => setFilter('paid')}
        >
          Paid
        </button>
        <button
          className={filter === 'overdue' ? 'active' : ''}
          onClick={() => setFilter('overdue')}
        >
          Overdue
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading invoices...</div>
      ) : (
        <div className="invoice-list">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="invoice-card">
              <div className="invoice-info">
                <div>
                  <h3>{invoice.invoiceNumber}</h3>
                  <p className="client-name">{invoice.clientName}</p>
                </div>
                <div className="invoice-dates">
                  <span>Issued: {invoice.issueDate}</span>
                  <span>Due: {invoice.dueDate}</span>
                </div>
              </div>

              <div className="invoice-status">
                <span className={`status-badge ${getStatusClass(invoice.status)}`}>
                  {invoice.status.toUpperCase()}
                </span>
                <span className="invoice-total">
                  ${invoice.total.toLocaleString()}
                </span>
              </div>

              <div className="invoice-actions">
                <button className="btn-icon" title="Edit">
                  <FiEdit />
                </button>
                <button className="btn-icon" title="Send">
                  <FiSend />
                </button>
                {invoice.status !== 'paid' && (
                  <button className="btn-icon" title="Record Payment">
                    <FiDollarSign />
                  </button>
                )}
                <button className="btn-icon danger" title="Delete">
                  <FiTrash2 />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
