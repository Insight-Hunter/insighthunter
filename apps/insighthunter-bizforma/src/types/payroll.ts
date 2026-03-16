export enum FilingStatus {
    SINGLE             = 'SINGLE',
    MARRIED_JOINTLY    = 'MARRIED_JOINTLY',
    MARRIED_SEPARATELY = 'MARRIED_SEPARATELY',
    HEAD_OF_HOUSEHOLD  = 'HEAD_OF_HOUSEHOLD',
    QUALIFYING_WIDOW   = 'QUALIFYING_WIDOW',
  }
  
  export enum Form1099Type {
    NEC  = '1099-NEC',
    MISC = '1099-MISC',
    K    = '1099-K',
  }
  
  export interface W4Record {
    id:                  string;
    orgId:               string;
    businessId:          string;
    employeeName:        string;
    employeeEmail:       string;
    ssn:                 string;          // encrypted
    filingStatus:        FilingStatus;
    multipleJobs:        boolean;
    dependentsAmount:    number;          // cents
    otherIncome:         number;          // cents
    deductions:          number;          // cents
    extraWithholding:    number;          // cents
    exempt:              boolean;
    taxYear:             number;
    r2Key:               string | null;
    createdAt:           string;
    updatedAt:           string;
  }
  
  export interface Contractor {
    id:            string;
    orgId:         string;
    businessId:    string;
    name:          string;
    email:         string;
    tin:           string;               // EIN or SSN, encrypted
    tinType:       'ssn' | 'ein';
    address:       ContractorAddress;
    businessName:  string | null;
    ytdPayments:   number;               // cents — year-to-date
    taxYear:       number;
    needs1099:     boolean;              // true if ytdPayments >= $600
    w9Received:    boolean;
    w9ReceivedAt:  string | null;
    createdAt:     string;
    updatedAt:     string;
  }
  
  export interface ContractorAddress {
    line1:   string;
    line2:   string | null;
    city:    string;
    state:   string;
    zip:     string;
    country: string;
  }
  
  export interface Form1099Record {
    id:                  string;
    orgId:               string;
    businessId:          string;
    contractorId:        string;
    taxYear:             number;
    formType:            Form1099Type;
    payerName:           string;
    payerTin:            string;
    payerAddress:        ContractorAddress;
    recipientName:       string;
    recipientTin:        string;
    recipientAddress:    ContractorAddress;
    nonEmployeeComp:     number;         // cents — box 1 NEC
    otherIncome:         number;         // cents
    federalTaxWithheld:  number;         // cents
    stateTaxWithheld:    number;         // cents
    stateId:             string | null;
    status:              '1099_draft' | '1099_filed' | '1099_sent';
    r2Key:               string | null;
    createdAt:           string;
    updatedAt:           string;
  }
  
  export interface PayrollSetup {
    id:                    string;
    orgId:                 string;
    businessId:            string;
    hasEmployees:          boolean;
    hasContractors:        boolean;
    stateWithholdingId:    string | null;
    stateSUIRegistered:    boolean;
    federalDepositSchedule: 'monthly' | 'semiweekly' | null;
    futaRate:              number;        // percentage
    payrollSoftware:       string | null;
    firstPayrollDate:      string | null;
    createdAt:             string;
    updatedAt:             string;
  }
  