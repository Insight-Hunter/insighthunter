// src/types/invoice.ts
export interface Invoice {
  id: string;
  invoiceNumber: string;
  companyId: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  issueDate: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number;
  tax: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  items: InvoiceItem[];
  notes?: string;
  terms?: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
  paidDate?: string;
  sentDate?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate?: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  date: string;
  method: 'cash' | 'check' | 'credit_card' | 'bank_transfer' | 'other';
  reference?: string;
  notes?: string;
  createdAt: string;
}
