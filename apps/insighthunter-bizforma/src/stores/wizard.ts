/**
 * Bizforma — Svelte wizard store
 * Reactive state for all 11 formation steps, session sync, and AI state.
 */

import { writable, derived, get } from 'svelte/store';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BusinessFormData {
  concept: {
    businessIdea: string;
    targetMarket: string;
    products: string;
    uniqueValue: string;
  };
  naming: {
    businessName: string;
    alternateNames: string;
    domainAvailable: boolean;
  };
  entity: {
    type: string;
    state: string;
    owners: string;
  };
  registration: {
    registeredAgent: string;
    businessAddress: string;
    mailingAddress: string;
  };
  einTax: {
    einApplied: boolean;
    einNumber: string;
    taxElection: string;
  };
  compliance: {
    sosFilingDate: string;
    annualReportRequired: boolean;
    salesTaxPermit: boolean;
  };
  accounting: {
    software: string;
    accountant: string;
    taxStrategy: string;
  };
  financing: {
    startupCosts: string;
    fundingSources: string;
    businessAccount: string;
  };
  marketing: {
    strategy: string;
    channels: string;
    budget: string;
  };
  webDesign: {
    domainName: string;
    hosting: string;
    dnsProvider: string;
    emailSetup: string;
  };
}

export interface WizardStep {
  id: number;
  name: string;
  description: string;
  icon: string;
  color: string;
}

// ── Step Definitions ──────────────────────────────────────────────────────────

export const STEPS: WizardStep[] = [
  { id: 1,  name: 'Concept',      description: 'Define your business idea',      icon: '💡', color: 'from-violet-500 to-indigo-500' },
  { id: 2,  name: 'Naming',       description: 'Choose your business name',      icon: '✏️', color: 'from-blue-500 to-cyan-500' },
  { id: 3,  name: 'Entity Type',  description: 'Select business structure',      icon: '🏛️', color: 'from-emerald-500 to-teal-500' },
  { id: 4,  name: 'Registration', description: 'Register your business',         icon: '📋', color: 'from-amber-500 to-orange-500' },
  { id: 5,  name: 'EIN & Tax',    description: 'Tax identification setup',       icon: '🔢', color: 'from-rose-500 to-pink-500' },
  { id: 6,  name: 'Compliance',   description: 'State & revenue compliance',     icon: '✅', color: 'from-teal-500 to-green-500' },
  { id: 7,  name: 'Accounting',   description: 'Setup accounting & tax',         icon: '📊', color: 'from-indigo-500 to-purple-500' },
  { id: 8,  name: 'Financing',    description: 'Funding & banking',              icon: '💰', color: 'from-yellow-500 to-amber-500' },
  { id: 9,  name: 'Marketing',    description: 'Marketing strategy',             icon: '📣', color: 'from-pink-500 to-rose-500' },
  { id: 10, name: 'Web & Domain', description: 'Online presence',                icon: '🌐', color: 'from-sky-500 to-blue-500' },
  { id: 11, name: 'Calendar',     description: 'Compliance & tax dates',         icon: '📅', color: 'from-violet-500 to-fuchsia-500' },
];

// ── Default Form Data ─────────────────────────────────────────────────────────

const defaultFormData: BusinessFormData = {
  concept:      { businessIdea: '', targetMarket: '', products: '', uniqueValue: '' },
  naming:       { businessName: '', alternateNames: '', domainAvailable: false },
  entity:       { type: '', state: '', owners: '' },
  registration: { registeredAgent: '', businessAddress: '', mailingAddress: '' },
  einTax:       { einApplied: false, einNumber: '', taxElection: '' },
  compliance:   { sosFilingDate: '', annualReportRequired: false, salesTaxPermit: false },
  accounting:   { software: '', accountant: '', taxStrategy: '' },
  financing:    { startupCosts: '', fundingSources: '', businessAccount: '' },
  marketing:    { strategy: '', channels: '', budget: '' },
  webDesign:    { domainName: '', hosting: '', dnsProvider: '', emailSetup: '' },
};

// ── Stores ────────────────────────────────────────────────────────────────────

export const currentStep = writable<number>(1);
export const formData = writable<BusinessFormData>(structuredClone(defaultFormData));
export const sessionId = writable<string | null>(null);
export const isSaving = writable<boolean>(false);
export const aiLoading = writable<boolean>(false);
export const aiError = writable<string | null>(null);

// ── Derived ───────────────────────────────────────────────────────────────────

export const currentStepDef = derived(currentStep, ($step) =>
  STEPS.find(s => s.id === $step) ?? STEPS[0]
);

export const progressPercent = derived(currentStep, ($step) =>
  Math.round((($step - 1) / (STEPS.length - 1)) * 100)
);

export const isFirstStep = derived(currentStep, ($step) => $step === 1);
export const isLastStep  = derived(currentStep, ($step) => $step === STEPS.length);

// ── Actions ───────────────────────────────────────────────────────────────────

export function nextStep() {
  currentStep.update(s => Math.min(s + 1, STEPS.length));
  window.scrollTo({ top: 0, behavior: 'smooth' });
  persistSession();
}

export function prevStep() {
  currentStep.update(s => Math.max(s - 1, 1));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function goToStep(n: number) {
  currentStep.set(Math.max(1, Math.min(n, STEPS.length)));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function updateSection<K extends keyof BusinessFormData>(
  section: K,
  data: Partial<BusinessFormData[K]>
) {
  formData.update(prev => ({
    ...prev,
    [section]: { ...prev[section], ...data },
  }));
}

// ── Session Persistence ───────────────────────────────────────────────────────

const SESSION_KEY = 'bizforma_session_id';

export async function initSession() {
  const storedId = localStorage.getItem(SESSION_KEY);
  try {
    const res = await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: storedId }),
    });
    const data = await res.json() as {
      sessionId: string;
      data: { currentStep?: number; formData?: Partial<BusinessFormData> };
      resumed: boolean;
    };
    sessionId.set(data.sessionId);
    localStorage.setItem(SESSION_KEY, data.sessionId);

    if (data.resumed && data.data.formData) {
      formData.update(prev => ({ ...prev, ...data.data.formData }));
      if (data.data.currentStep) currentStep.set(data.data.currentStep);
    }
  } catch (err) {
    console.error('Session init failed:', err);
  }
}

export async function persistSession() {
  const sid = get(sessionId);
  if (!sid) return;
  isSaving.set(true);
  try {
    await fetch(`/api/session/${sid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentStep: get(currentStep),
        formData: get(formData),
      }),
    });
  } catch (err) {
    console.error('Session persist failed:', err);
  } finally {
    isSaving.set(false);
  }
}

// ── Summary Download ──────────────────────────────────────────────────────────

export function downloadSummary() {
  const fd = get(formData);
  const lines = [
    'BIZFORMA — BUSINESS FORMATION SUMMARY',
    `Generated: ${new Date().toLocaleDateString()}`,
    '═'.repeat(58),
    '',
    'BUSINESS CONCEPT',
    '─'.repeat(58),
    `Business Idea: ${fd.concept.businessIdea}`,
    `Target Market: ${fd.concept.targetMarket}`,
    `Products/Services: ${fd.concept.products}`,
    `Unique Value: ${fd.concept.uniqueValue}`,
    '',
    'NAMING & BRANDING',
    '─'.repeat(58),
    `Business Name: ${fd.naming.businessName}`,
    `Alternate Names: ${fd.naming.alternateNames}`,
    '',
    'ENTITY STRUCTURE',
    '─'.repeat(58),
    `Entity Type: ${fd.entity.type}`,
    `State: ${fd.entity.state}`,
    `Owners: ${fd.entity.owners}`,
    '',
    'REGISTRATION',
    '─'.repeat(58),
    `Registered Agent: ${fd.registration.registeredAgent}`,
    `Business Address: ${fd.registration.businessAddress}`,
    '',
    'EIN & TAX',
    '─'.repeat(58),
    `EIN: ${fd.einTax.einNumber}`,
    `Tax Election: ${fd.einTax.taxElection}`,
    '',
    'ACCOUNTING',
    '─'.repeat(58),
    `Software: ${fd.accounting.software}`,
    `CPA/Accountant: ${fd.accounting.accountant}`,
    '',
    'FINANCING',
    '─'.repeat(58),
    `Startup Costs: ${fd.financing.startupCosts}`,
    `Funding Sources: ${fd.financing.fundingSources}`,
    '',
    'MARKETING',
    '─'.repeat(58),
    `Strategy: ${fd.marketing.strategy}`,
    `Channels: ${fd.marketing.channels}`,
    '',
    'WEB PRESENCE',
    '─'.repeat(58),
    `Domain: ${fd.webDesign.domainName}`,
    `Hosting: ${fd.webDesign.hosting}`,
    '',
    '═'.repeat(58),
    'Powered by InsightHunters · Bizforma',
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fd.naming.businessName || 'business'}-formation-summary.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
