// apps/insighthunter-bills/src/types.ts
export type BillStatus = 'draft' | 'received' | 'approved' | 'scheduled' | 'paid' | 'overdue' | 'void';
export type VendorStatus = 'active' | 'inactive';
export type PaymentMethod = 'ACH' | 'check' | 'card' | 'cash' | 'wire';

export interface VendorRow {
  id: string;
  org_id: string;
  name: string;
  email: string | null;
  payment_terms: string;
  status: VendorStatus;
  created_at: string;
  updated_at: string;
}

export interface BillRow {
  id: string;
  org_id: string;
  vendor_id: string | null;
  vendor_name: string;
  bill_number: string;
  issue_date: string;
  due_date: string;
  memo: string | null;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: BillStatus;
  approved_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillLineRow {
  id: string;
  bill_id: string;
  position: number;
  description: string;
  amount: number;
  account_code: string | null;
  created_at: string;
}
