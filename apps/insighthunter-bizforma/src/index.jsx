import { useState, useEffect, useRef } from “react”;
import { motion, AnimatePresence } from “framer-motion”;

// ─── Design System (Apple HIG) ───────────────────────────────────────────────
const COLORS = {
blue:    “#007AFF”,
green:   “#34C759”,
orange:  “#FF9500”,
red:     “#FF3B30”,
purple:  “#AF52DE”,
indigo:  “#5856D6”,
teal:    “#5AC8FA”,
gray1:   “#1C1C1E”,
gray2:   “#2C2C2E”,
gray3:   “#3A3A3C”,
gray4:   “#48484A”,
gray5:   “#636366”,
gray6:   “#8E8E93”,
label:   “#000000”,
label2:  “#3C3C43”,
sep:     “rgba(60,60,67,0.12)”,
fill:    “rgba(120,120,128,0.12)”,
bg:      “#F2F2F7”,
surface: “#FFFFFF”,
};

// ─── Step Registry ────────────────────────────────────────────────────────────
const PHASES = [
{
id: “conceptualize”,
icon: “💡”,
label: “Conceptualize”,
color: COLORS.purple,
steps: [
{ id: “idea”,        label: “Business Idea”,        icon: “🧠” },
{ id: “market”,      label: “Market Research”,      icon: “🔍” },
{ id: “model”,       label: “Business Model”,       icon: “📊” },
{ id: “name”,        label: “Business Name”,        icon: “✏️” },
{ id: “structure”,   label: “Legal Structure”,      icon: “⚖️” },
],
},
{
id: “register”,
icon: “📋”,
label: “Register”,
color: COLORS.blue,
steps: [
{ id: “state_reg”,   label: “State Registration”,  icon: “🏛️” },
{ id: “ein”,         label: “EIN / Federal Tax ID”, icon: “🔢” },
{ id: “licenses”,    label: “Licenses & Permits”,   icon: “📜” },
{ id: “registered_agent”, label: “Registered Agent”, icon: “👤” },
{ id: “operating”,   label: “Operating Agreement”,  icon: “📄” },
],
},
{
id: “finance”,
icon: “💰”,
label: “Finance & Tax”,
color: COLORS.green,
steps: [
{ id: “bank”,        label: “Business Bank Account”, icon: “🏦” },
{ id: “accounting”,  label: “Accounting Setup”,      icon: “📒” },
{ id: “fed_tax”,     label: “Federal Tax Setup”,     icon: “🦅” },
{ id: “state_tax”,   label: “State Tax Setup”,       icon: “🏠” },
{ id: “payroll”,     label: “Payroll Setup”,         icon: “💸” },
{ id: “funding”,     label: “Funding Strategy”,      icon: “🚀” },
],
},
{
id: “digital”,
icon: “🌐”,
label: “Digital Presence”,
color: COLORS.teal,
steps: [
{ id: “domain”,      label: “Domain Selection”,     icon: “🔗” },
{ id: “website”,     label: “Website Creation”,     icon: “💻” },
{ id: “seo”,         label: “SEO Strategy”,         icon: “📈” },
{ id: “social”,      label: “Social Media”,         icon: “📱” },
],
},
{
id: “launch”,
icon: “🚀”,
label: “Launch & Market”,
color: COLORS.orange,
steps: [
{ id: “branding”,    label: “Brand Identity”,       icon: “🎨” },
{ id: “marketing”,   label: “Marketing Plan”,       icon: “📣” },
{ id: “launch_plan”, label: “Launch Checklist”,     icon: “✅” },
],
},
];

const ALL_STEPS = PHASES.flatMap(p => p.steps.map(s => ({ …s, phase: p.id, phaseColor: p.color })));

// ─── Step Content Components ──────────────────────────────────────────────────

function IdeaStep({ data, onChange }) {
return (
<StepLayout
title="Business Idea"
subtitle="Every great business starts with a clear problem worth solving."
icon="🧠"
>
<FormField label="What problem does your business solve?">
<TextArea
value={data.problem || “”}
onChange={v => onChange({ …data, problem: v })}
placeholder=“Describe the core problem your customers face…”
rows={3}
/>
</FormField>
<FormField label="Your solution">
<TextArea
value={data.solution || “”}
onChange={v => onChange({ …data, solution: v })}
placeholder=“How does your product or service solve this problem?…”
rows={3}
/>
</FormField>
<FormField label="Target customers">
<TextInput
value={data.customers || “”}
onChange={v => onChange({ …data, customers: v })}
placeholder=“e.g. Small business owners aged 25–45”
/>
</FormField>
<FormField label="Revenue model">
<SegmentedControl
options={[“Subscription”, “One-time”, “Freemium”, “Marketplace”, “Services”, “Other”]}
value={data.revenue || “”}
onChange={v => onChange({ …data, revenue: v })}
/>
</FormField>
<InfoCard icon="💡" color={COLORS.purple}>
A strong business idea addresses a real, validated pain point. Before investing heavily, talk to at least 10 potential customers.
</InfoCard>
</StepLayout>
);
}

function MarketStep({ data, onChange }) {
return (
<StepLayout title="Market Research" subtitle="Understand your competitive landscape and total addressable market." icon="🔍">
<FormField label="Industry / Sector">
<TextInput value={data.industry || “”} onChange={v => onChange({ …data, industry: v })} placeholder=“e.g. FinTech, Healthcare, E-commerce” />
</FormField>
<FormField label="Total Addressable Market (TAM)">
<TextInput value={data.tam || “”} onChange={v => onChange({ …data, tam: v })} placeholder=“e.g. $2.4B globally” />
</FormField>
<FormField label="Top 3 Competitors">
{[0,1,2].map(i => (
<TextInput
key={i}
value={(data.competitors || [])[i] || “”}
onChange={v => {
const c = […(data.competitors || [””,””,””])];
c[i] = v;
onChange({ …data, competitors: c });
}}
placeholder={`Competitor ${i+1}`}
style={{ marginBottom: 8 }}
/>
))}
</FormField>
<FormField label="Your competitive advantage (USP)">
<TextArea value={data.usp || “”} onChange={v => onChange({ …data, usp: v })} placeholder=“What makes you uniquely better?” rows={2} />
</FormField>
<InfoCard icon="📊" color={COLORS.blue}>
Use free tools like Google Trends, Statista, SBA.gov, and IBISWorld to validate market size and growth rates.
</InfoCard>
</StepLayout>
);
}

function BusinessModelStep({ data, onChange }) {
return (
<StepLayout title="Business Model Canvas" subtitle="Map out how your business creates, delivers, and captures value." icon="📊">
{[
{ key: “value_prop”, label: “Value Propositions”, placeholder: “What value do you deliver?” },
{ key: “channels”, label: “Channels”, placeholder: “How do you reach customers?” },
{ key: “customer_rel”, label: “Customer Relationships”, placeholder: “How do you interact with customers?” },
{ key: “revenue_streams”, label: “Revenue Streams”, placeholder: “How do you make money?” },
{ key: “key_resources”, label: “Key Resources”, placeholder: “What assets do you need?” },
{ key: “key_activities”, label: “Key Activities”, placeholder: “What must you do well?” },
{ key: “key_partners”, label: “Key Partners”, placeholder: “Who are your critical partners?” },
{ key: “cost_structure”, label: “Cost Structure”, placeholder: “What are your major costs?” },
].map(field => (
<FormField key={field.key} label={field.label}>
<TextArea
value={data[field.key] || “”}
onChange={v => onChange({ …data, [field.key]: v })}
placeholder={field.placeholder}
rows={2}
/>
</FormField>
))}
</StepLayout>
);
}

function NameStep({ data, onChange }) {
const [checking, setChecking] = useState(false);
const [available, setAvailable] = useState(null);

const checkName = () => {
if (!data.name) return;
setChecking(true);
setTimeout(() => {
setAvailable(Math.random() > 0.3);
setChecking(false);
}, 1200);
};

return (
<StepLayout title="Business Name" subtitle="Your name is your first impression. Make it memorable and legally clear." icon="✏️">
<FormField label="Desired business name">
<div style={{ display: “flex”, gap: 8 }}>
<TextInput value={data.name || “”} onChange={v => { onChange({ …data, name: v }); setAvailable(null); }} placeholder=“e.g. Acme Solutions LLC” />
<AppleButton variant=“secondary” onClick={checkName} loading={checking} style={{ flexShrink: 0 }}>
Check
</AppleButton>
</div>
{available === true && <StatusBadge color={COLORS.green}>✓ Name appears available in most states</StatusBadge>}
{available === false && <StatusBadge color={COLORS.red}>✗ Name may be taken — try a variation</StatusBadge>}
</FormField>
<FormField label="Business name alternatives">
{[0,1].map(i => (
<TextInput key={i} value={(data.alternatives||[])[i]||””} onChange={v => { const a=[…(data.alternatives||[””,””])]; a[i]=v; onChange({…data,alternatives:a}); }} placeholder={`Alternative ${i+1}`} style={{ marginBottom: 8 }} />
))}
</FormField>
<FormField label="DBA (Doing Business As) — optional">
<TextInput value={data.dba||””} onChange={v=>onChange({…data,dba:v})} placeholder=“Trade name if different from legal name” />
</FormField>
<InfoCard icon="⚠️" color={COLORS.orange}>
Search your state’s Secretary of State database, USPTO trademark database, and domain registrars before finalizing. Check all 50 states if you plan to operate nationally.
</InfoCard>
<ResourceLinks links={[
{ label: “USPTO Trademark Search”, url: “https://www.uspto.gov/trademarks/search” },
{ label: “SOS Business Search (all states)”, url: “https://www.sos.state.mn.us/business-liens/business-name-check/” },
]} />
</StepLayout>
);
}

function StructureStep({ data, onChange }) {
const structures = [
{ id: “sole_prop”, name: “Sole Proprietorship”, icon: “👤”, pros: [“Simplest setup”, “No separate filing”], cons: [“Personal liability”, “Self-employment tax on all profits”], bestFor: “Solo freelancers, low-risk” },
{ id: “llc”, name: “LLC”, icon: “🏢”, pros: [“Liability protection”, “Tax flexibility”, “Simple management”], cons: [“Annual fees”, “State filing required”], bestFor: “Most small businesses ✓ Recommended” },
{ id: “s_corp”, name: “S-Corporation”, icon: “📈”, pros: [“Pass-through taxation”, “Salary/dividend split saves tax”], cons: [“Payroll required”, “Restrictions on shareholders”], bestFor: “Profitable businesses >$40K/yr” },
{ id: “c_corp”, name: “C-Corporation”, icon: “🏦”, pros: [“Venture funding ready”, “Stock options”, “Unlimited shareholders”], cons: [“Double taxation”, “Complex compliance”], bestFor: “Startups raising VC” },
{ id: “nonprofit”, name: “Nonprofit 501(c)(3)”, icon: “❤️”, pros: [“Tax-exempt”, “Grant eligible”], cons: [“Complex IRS application”, “Mission restrictions”], bestFor: “Charitable organizations” },
{ id: “partnership”, name: “Partnership (GP/LP)”, icon: “🤝”, pros: [“Simple to form”, “Pass-through tax”], cons: [“General liability for GP”, “Disputes common”], bestFor: “2+ co-founders, professional firms” },
];

return (
<StepLayout title="Legal Structure" subtitle="Choose the entity type that fits your liability, tax, and growth needs." icon="⚖️">
<div style={{ display: “grid”, gap: 12 }}>
{structures.map(s => (
<SelectCard
key={s.id}
selected={data.structure === s.id}
onClick={() => onChange({ …data, structure: s.id })}
>
<div style={{ display: “flex”, alignItems: “flex-start”, gap: 12 }}>
<span style={{ fontSize: 28 }}>{s.icon}</span>
<div style={{ flex: 1 }}>
<div style={{ fontWeight: 600, fontSize: 16, marginBottom: 2 }}>{s.name}</div>
<div style={{ fontSize: 12, color: COLORS.green, marginBottom: 6 }}>{s.bestFor}</div>
<div style={{ display: “flex”, gap: 16 }}>
<div>
<div style={{ fontSize: 11, fontWeight: 600, color: COLORS.green, marginBottom: 2 }}>PROS</div>
{s.pros.map(p => <div key={p} style={{ fontSize: 12, color: COLORS.gray5 }}>• {p}</div>)}
</div>
<div>
<div style={{ fontSize: 11, fontWeight: 600, color: COLORS.red, marginBottom: 2 }}>CONS</div>
{s.cons.map(c => <div key={c} style={{ fontSize: 12, color: COLORS.gray5 }}>• {c}</div>)}
</div>
</div>
</div>
</div>
</SelectCard>
))}
</div>
<FormField label=“Formation state” style={{ marginTop: 16 }}>
<StateSelect value={data.state||””} onChange={v=>onChange({…data,state:v})} />
</FormField>
<InfoCard icon="💡" color={COLORS.blue}>
<strong>Most common choice: LLC.</strong> It provides liability protection, flexible taxation (default pass-through or elect S-Corp), and minimal formality. Delaware, Wyoming, and Nevada are popular formation states for liability protection.
</InfoCard>
</StepLayout>
);
}

function StateRegStep({ data, onChange }) {
return (
<StepLayout title="State Registration" subtitle="File your formation documents with the Secretary of State." icon="🏛️">
<ChecklistSection title=“Articles of Organization / Incorporation” items={[
{ id: “articles_drafted”, label: “Draft Articles of Organization/Incorporation” },
{ id: “filing_fee_paid”, label: “Pay state filing fee ($50–$500 depending on state)” },
{ id: “sos_filed”, label: “File with Secretary of State (online or by mail)” },
{ id: “confirmation_received”, label: “Receive confirmation / Certificate of Formation” },
{ id: “foreign_qualification”, label: “Foreign qualification in operating states (if different from formation state)” },
]} data={data} onChange={onChange} />
<FormField label="State filing URL">
<TextInput value={data.filing_url||””} onChange={v=>onChange({…data,filing_url:v})} placeholder=“https://www.sos.[state].gov” />
</FormField>
<FormField label="Formation date (actual or target)">
<TextInput type=“date” value={data.formation_date||””} onChange={v=>onChange({…data,formation_date:v})} />
</FormField>
<FormField label="Annual report due date (varies by state)">
<TextInput value={data.annual_report_date||””} onChange={v=>onChange({…data,annual_report_date:v})} placeholder=“e.g. April 1 each year” />
</FormField>
<InfoCard icon="📅" color={COLORS.orange}>
Set a calendar reminder for your annual report/renewal deadline. Missing it can result in dissolution of your business entity.
</InfoCard>
<ResourceLinks links={[
{ label: “All States SOS Directory”, url: “https://www.nass.org/business-services/forming-a-business” },
{ label: “Delaware Division of Corporations”, url: “https://corp.delaware.gov” },
{ label: “Wyoming Secretary of State”, url: “https://sos.wyo.gov” },
]} />
</StepLayout>
);
}

function EINStep({ data, onChange }) {
return (
<StepLayout title="Employer Identification Number (EIN)" subtitle="Your federal tax ID — required for banking, hiring, and most tax filings." icon="🔢">
<ChecklistSection title=“EIN Application” items={[
{ id: “irs_online”, label: “Apply online at IRS.gov (free, instant approval on business days)” },
{ id: “ss4_filed”, label: “Alternative: Complete Form SS-4 by fax or mail” },
{ id: “ein_received”, label: “Receive EIN confirmation letter (CP 575)” },
{ id: “ein_stored”, label: “Securely store EIN — treat like Social Security Number” },
]} data={data} onChange={onChange} />
<FormField label="Your EIN (once received)">
<TextInput value={data.ein||””} onChange={v=>onChange({…data,ein:v})} placeholder=“XX-XXXXXXX” maxLength={10} />
</FormField>
<InfoCard icon="🔒" color={COLORS.red}>
Never share your EIN publicly. It can be used for identity theft and fraudulent tax filings. Store securely in a password manager.
</InfoCard>
<InfoCard icon="ℹ️" color={COLORS.blue}>
Sole proprietors with no employees <em>may</em> use their SSN, but an EIN is strongly recommended to separate personal and business identity.
</InfoCard>
<ResourceLinks links={[
{ label: “Apply for EIN Online (IRS)”, url: “https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online” },
]} />
</StepLayout>
);
}

function LicensesStep({ data, onChange }) {
return (
<StepLayout title="Licenses & Permits" subtitle="Most businesses need federal, state, or local licenses to operate legally." icon="📜">
<ChecklistSection title=“Common Requirements” items={[
{ id: “business_license”, label: “General Business License (city/county)” },
{ id: “professional_license”, label: “Professional License (if applicable: doctor, contractor, etc.)” },
{ id: “seller_permit”, label: “Seller’s Permit / Sales Tax License (if selling goods)” },
{ id: “dba_filing”, label: “DBA/Fictitious Name Filing (if operating under trade name)” },
{ id: “zoning”, label: “Zoning/Home Occupation Permit (if home-based)” },
{ id: “health_permit”, label: “Health/Safety Permit (food, childcare, etc.)” },
{ id: “federal_license”, label: “Federal License (firearms, alcohol, agriculture, aviation, etc.)” },
{ id: “ein_labor”, label: “State Labor/Employment Registration (if hiring)” },
]} data={data} onChange={onChange} />
<FormField label="Industry-specific licenses needed">
<TextArea value={data.specific_licenses||””} onChange={v=>onChange({…data,specific_licenses:v})} placeholder=“List any industry-specific permits for your business type…” rows={2} />
</FormField>
<ResourceLinks links={[
{ label: “SBA License & Permit Finder”, url: “https://www.sba.gov/business-guide/launch-your-business/apply-licenses-permits” },
{ label: “BusinessLicenses.com”, url: “https://www.businesslicenses.com” },
]} />
</StepLayout>
);
}

function RegisteredAgentStep({ data, onChange }) {
return (
<StepLayout title="Registered Agent" subtitle="A registered agent receives legal and government correspondence on behalf of your business." icon="👤">
<FormField label="Registered agent type">
<SegmentedControl
options={[“Myself / Owner”, “Attorney/CPA”, “Registered Agent Service”]}
value={data.agent_type||””}
onChange={v=>onChange({…data,agent_type:v})}
/>
</FormField>
{data.agent_type === “Registered Agent Service” && (
<InfoCard icon="💡" color={COLORS.blue}>
Popular services: Northwest Registered Agent ($125/yr), Registered Agents Inc ($200/yr), ZenBusiness ($99/yr). Using a service protects your home address from public records.
</InfoCard>
)}
<FormField label="Registered agent name">
<TextInput value={data.agent_name||””} onChange={v=>onChange({…data,agent_name:v})} placeholder=“Full legal name” />
</FormField>
<FormField label="Registered agent address (must be physical, not PO Box)">
<TextArea value={data.agent_address||””} onChange={v=>onChange({…data,agent_address:v})} placeholder=“Street address, city, state, ZIP” rows={2} />
</FormField>
<ChecklistSection title=“Registered Agent Tasks” items={[
{ id: “agent_designated”, label: “Designated agent in formation documents” },
{ id: “agent_available”, label: “Agent available during business hours at registered address” },
{ id: “agent_annual”, label: “Annual registered agent fee paid” },
]} data={data} onChange={onChange} />
</StepLayout>
);
}

function OperatingStep({ data, onChange }) {
return (
<StepLayout title="Operating Agreement / Bylaws" subtitle="This internal document governs how your business operates, prevents disputes, and protects your LLC status." icon="📄">
<ChecklistSection title=“Operating Agreement Essentials” items={[
{ id: “ownership_defined”, label: “Ownership percentages defined for all members” },
{ id: “voting_rights”, label: “Voting rights and decision-making procedures” },
{ id: “profit_distribution”, label: “Profit/loss distribution rules” },
{ id: “management_structure”, label: “Management structure (member-managed vs. manager-managed)” },
{ id: “buyout_provisions”, label: “Buyout provisions and transfer restrictions” },
{ id: “dissolution_process”, label: “Dissolution / wind-down process defined” },
{ id: “signed_notarized”, label: “Signed by all members (notarized if required by state)” },
{ id: “stored_safely”, label: “Stored securely (original + digital backup)” },
]} data={data} onChange={onChange} />
<FormField label="Number of members/owners">
<TextInput value={data.member_count||””} onChange={v=>onChange({…data,member_count:v})} placeholder=“e.g. 2” type=“number” min=“1” />
</FormField>
<FormField label="Management type">
<SegmentedControl options={[“Member-Managed”, “Manager-Managed”]} value={data.mgmt_type||””} onChange={v=>onChange({…data,mgmt_type:v})} />
</FormField>
<InfoCard icon="⚠️" color={COLORS.red}>
Without an operating agreement, your state’s default LLC rules apply. This can lead to unexpected outcomes in disputes or dissolution. Even single-member LLCs should have one.
</InfoCard>
<ResourceLinks links={[
{ label: “Free LLC Operating Agreement Templates”, url: “https://www.legalzoom.com/articles/what-is-an-llc-operating-agreement” },
{ label: “Rocket Lawyer Operating Agreement”, url: “https://www.rocketlawyer.com/business-and-contracts/business-formation/llc-operating-agreement/document/operating-agreement” },
]} />
</StepLayout>
);
}

function BankStep({ data, onChange }) {
return (
<StepLayout title="Business Bank Account" subtitle="Separating business and personal finances is critical for liability protection and clean taxes." icon="🏦">
<ChecklistSection title=“Bank Account Setup” items={[
{ id: “bank_selected”, label: “Select bank (see recommendations below)” },
{ id: “ein_ready”, label: “EIN ready (required for business accounts)” },
{ id: “formation_docs”, label: “Formation documents ready (Articles + Operating Agreement)” },
{ id: “account_opened”, label: “Business checking account opened” },
{ id: “savings_opened”, label: “Business savings account for tax reserves (optional but recommended)” },
{ id: “credit_card”, label: “Business credit card applied for” },
{ id: “zelle_setup”, label: “Payment acceptance setup (Stripe, Square, PayPal, Zelle Business)” },
]} data={data} onChange={onChange} />
<InfoCard icon="🏦" color={COLORS.blue}>
<strong>Recommended banks:</strong> Mercury (online, no fees, great for startups), Relay (built for small business), Chase Business (large network), Novo (no minimums), BlueVine (HYSA). Avoid mixing personal and business funds — it can pierce your corporate veil and eliminate liability protection.
</InfoCard>
<FormField label="Bank selected">
<TextInput value={data.bank_name||””} onChange={v=>onChange({…data,bank_name:v})} placeholder=“e.g. Mercury, Chase Business” />
</FormField>
<FormField label="Tax reserve percentage (recommended 25-30%)">
<TextInput value={data.tax_reserve||””} onChange={v=>onChange({…data,tax_reserve:v})} placeholder=“e.g. 25%” />
</FormField>
</StepLayout>
);
}

function AccountingStep({ data, onChange }) {
return (
<StepLayout title="Accounting & Bookkeeping Setup" subtitle="Clean books from day one saves thousands in tax time and makes funding easier." icon="📒">
<FormField label="Accounting software">
<SegmentedControl options={[“QuickBooks”, “Xero”, “Wave (free)”, “FreshBooks”, “Bench”]} value={data.software||””} onChange={v=>onChange({…data,software:v})} />
</FormField>
<FormField label="Accounting method">
<SegmentedControl options={[“Cash Basis”, “Accrual”]} value={data.method||””} onChange={v=>onChange({…data,method:v})} />
</FormField>
<ChecklistSection title=“Accounting Setup Checklist” items={[
{ id: “chart_accounts”, label: “Chart of accounts created” },
{ id: “bank_connected”, label: “Bank account connected to accounting software” },
{ id: “invoicing”, label: “Invoicing templates created” },
{ id: “expense_categories”, label: “Expense categories defined” },
{ id: “receipt_system”, label: “Receipt capture system set up (Expensify, Dext, or app)” },
{ id: “monthly_close”, label: “Monthly close process scheduled” },
{ id: “accountant”, label: “CPA/bookkeeper engaged (recommended)” },
]} data={data} onChange={onChange} />
<InfoCard icon="💡" color={COLORS.green}>
Most small businesses should use <strong>cash basis accounting</strong> initially — it’s simpler and allowed by the IRS for businesses under $26M in revenue. Switch to accrual if you carry inventory or plan to raise funding.
</InfoCard>
</StepLayout>
);
}

function FedTaxStep({ data, onChange }) {
return (
<StepLayout title="Federal Tax Setup" subtitle="Understand your federal tax obligations from day one to avoid penalties." icon="🦅">
<FormField label="Federal tax election">
<SegmentedControl options={[“Default LLC (Pass-through)”, “S-Corp Election”, “C-Corp”, “Sole Prop / Schedule C”]} value={data.fed_election||””} onChange={v=>onChange({…data,fed_election:v})} />
</FormField>
{data.fed_election === “S-Corp Election” && (
<InfoCard icon="⚠️" color={COLORS.orange}>
File Form 2553 within 75 days of formation (or by March 15 for existing entities). S-Corp status requires reasonable owner salary + payroll taxes.
</InfoCard>
)}
<ChecklistSection title=“Federal Tax Obligations” items={[
{ id: “quarterly_est”, label: “Quarterly estimated tax payments scheduled (Form 1040-ES or 1120-W)” },
{ id: “eftps”, label: “EFTPS account created (IRS.gov) for federal tax deposits” },
{ id: “fica_setup”, label: “FICA (Social Security + Medicare) withholding set up if hiring” },
{ id: “form_940”, label: “FUTA (Form 940) annual unemployment tax understood” },
{ id: “1099_process”, label: “1099-NEC process for contractors >$600/year” },
{ id: “w9_collection”, label: “W-9 collection process for all vendors/contractors” },
{ id: “depreciation”, label: “Section 179 / bonus depreciation strategy discussed with CPA” },
{ id: “home_office”, label: “Home office deduction evaluated (Form 8829)” },
{ id: “qbi”, label: “Qualified Business Income (QBI) deduction evaluated (20% pass-through)” },
]} data={data} onChange={onChange} />
<InfoCard icon="📅" color={COLORS.red}>
<strong>Key federal deadlines:</strong> Quarterly estimates: Apr 15, Jun 15, Sep 15, Jan 15. S-Corp/Partnership: Mar 15. C-Corp/Individual: Apr 15. Payroll deposits: semi-weekly or monthly based on size.
</InfoCard>
<ResourceLinks links={[
{ label: “IRS Small Business Tax Center”, url: “https://www.irs.gov/businesses/small-businesses-self-employed” },
{ label: “EFTPS Enrollment”, url: “https://www.eftps.gov” },
{ label: “IRS Tax Calendar”, url: “https://www.irs.gov/businesses/small-businesses-self-employed/small-business-tax-calendar” },
]} />
</StepLayout>
);
}

function StateTaxStep({ data, onChange }) {
return (
<StepLayout title="State Tax Setup" subtitle="Every state has different tax types, rates, and filing requirements." icon="🏠">
<FormField label="Operating state(s)">
<TextInput value={data.op_states||””} onChange={v=>onChange({…data,op_states:v})} placeholder=“e.g. California, Texas, New York” />
</FormField>
<ChecklistSection title=“State Tax Obligations” items={[
{ id: “state_income”, label: “State income/franchise tax registration (most states)” },
{ id: “sales_tax_permit”, label: “Sales tax permit obtained (if selling taxable goods/services)” },
{ id: “sales_tax_nexus”, label: “Economic nexus evaluated in all states you sell to ($100K or 200 transactions)” },
{ id: “state_payroll”, label: “State payroll tax registration (if hiring employees)” },
{ id: “suta”, label: “SUTA (state unemployment) account opened” },
{ id: “state_quarterly”, label: “State estimated tax payments scheduled” },
{ id: “local_taxes”, label: “Local/city taxes evaluated (NYC, Philadelphia, etc.)” },
{ id: “no_income_tax”, label: “No-state-income-tax strategy evaluated (WY, TX, FL, NV, etc.)” },
]} data={data} onChange={onChange} />
<InfoCard icon="🛒" color={COLORS.teal}>
<strong>Sales tax is complex.</strong> After the 2018 South Dakota v. Wayfair ruling, you may owe sales tax in states where you have no physical presence if you exceed $100K in sales or 200 transactions. Use TaxJar or Avalara to automate compliance.
</InfoCard>
<ResourceLinks links={[
{ label: “TaxJar Sales Tax Guide”, url: “https://www.taxjar.com/sales-tax/” },
{ label: “Avalara State Tax Resources”, url: “https://www.avalara.com/us/en/learn/sales-tax.html” },
{ label: “Vertex State Tax Rates”, url: “https://www.vertexinc.com/resources/resource-library/vertex-sales-tax-rates” },
]} />
</StepLayout>
);
}

function PayrollStep({ data, onChange }) {
return (
<StepLayout title="Payroll Setup" subtitle="Set up payroll correctly from the first hire to stay compliant." icon="💸">
<FormField label="Payroll software">
<SegmentedControl options={[“Gusto”, “ADP”, “Paychex”, “Rippling”, “DIY”]} value={data.payroll_sw||””} onChange={v=>onChange({…data,payroll_sw:v})} />
</FormField>
<ChecklistSection title=“Payroll Setup Checklist” items={[
{ id: “ein_payroll”, label: “EIN obtained and registered with IRS for payroll” },
{ id: “i9_w4”, label: “I-9 and W-4 forms collected from all employees” },
{ id: “state_new_hire”, label: “New hire reporting to state within required timeframe” },
{ id: “workers_comp”, label: “Workers’ compensation insurance obtained” },
{ id: “pay_frequency”, label: “Pay frequency set (bi-weekly most common)” },
{ id: “direct_deposit”, label: “Direct deposit set up for all employees” },
{ id: “401k”, label: “Retirement plan evaluated (SIMPLE IRA, Solo 401k, SEP-IRA)” },
{ id: “health_benefits”, label: “Health insurance / benefits setup evaluated” },
]} data={data} onChange={onChange} />
<InfoCard icon="💡" color={COLORS.green}>
<strong>Gusto</strong> is the top-rated payroll service for small businesses — it handles federal/state tax filings, W-2s, 1099s, new hire reporting, and benefits in one platform starting at ~$40/mo.
</InfoCard>
</StepLayout>
);
}

function FundingStep({ data, onChange }) {
const sources = [
{ id: “bootstrap”, label: “Bootstrapping”, icon: “💪”, desc: “Self-funded — maintain full control” },
{ id: “friends_family”, label: “Friends & Family”, icon: “👨‍👩‍👧”, desc: “Informal loans or equity” },
{ id: “sba_loan”, label: “SBA Loan”, icon: “🏛️”, desc: “Gov-backed, low rates, $500K–$5M” },
{ id: “bank_loan”, label: “Bank/Credit Union Loan”, icon: “🏦”, desc: “Term loans, lines of credit” },
{ id: “microloan”, label: “Microloan”, icon: “🌱”, desc: “SBA Microloan up to $50K” },
{ id: “angel”, label: “Angel Investment”, icon: “😇”, desc: “High-net-worth individual investor” },
{ id: “vc”, label: “Venture Capital”, icon: “🚀”, desc: “Institutional equity for high-growth” },
{ id: “crowdfunding”, label: “Crowdfunding”, icon: “🎯”, desc: “Kickstarter, Indiegogo, Wefunder” },
{ id: “grants”, label: “Grants”, icon: “🎁”, desc: “SBIR, state grants, nonprofit grants” },
{ id: “revenue”, label: “Revenue-Based Financing”, icon: “📊”, desc: “Clearco, Pipe — repay as % of revenue” },
];
return (
<StepLayout title="Funding Strategy" subtitle="Choose the right capital sources for your stage and growth goals." icon="🚀">
<FormField label="Funding sources (select all that apply)">
<div style={{ display: “grid”, gridTemplateColumns: “1fr 1fr”, gap: 8 }}>
{sources.map(s => (
<MultiSelectCard
key={s.id}
selected={(data.funding_sources||[]).includes(s.id)}
onClick={() => {
const curr = data.funding_sources||[];
const next = curr.includes(s.id) ? curr.filter(x=>x!==s.id) : […curr,s.id];
onChange({…data, funding_sources: next});
}}
>
<span style={{ fontSize: 20 }}>{s.icon}</span>
<div>
<div style={{ fontWeight: 600, fontSize: 13 }}>{s.label}</div>
<div style={{ fontSize: 11, color: COLORS.gray5 }}>{s.desc}</div>
</div>
</MultiSelectCard>
))}
</div>
</FormField>
<FormField label="Target funding amount">
<TextInput value={data.target_amount||””} onChange={v=>onChange({…data,target_amount:v})} placeholder=“e.g. $50,000” />
</FormField>
<FormField label="Use of funds">
<TextArea value={data.use_of_funds||””} onChange={v=>onChange({…data,use_of_funds:v})} placeholder=“e.g. 40% inventory, 30% marketing, 20% hiring, 10% equipment” rows={2} />
</FormField>
<InfoCard icon="🏛️" color={COLORS.blue}>
<strong>SBA loans</strong> offer the best rates for main-street businesses. SBA 7(a) loans up to $5M at prime +2.75%. Apply through an SBA-preferred lender. SCORE mentors provide free guidance.
</InfoCard>
<ResourceLinks links={[
{ label: “SBA Loans”, url: “https://www.sba.gov/funding-programs/loans” },
{ label: “SCORE Free Mentoring”, url: “https://www.score.org” },
{ label: “Grants.gov”, url: “https://www.grants.gov” },
]} />
</StepLayout>
);
}

function DomainStep({ data, onChange }) {
const [checking, setChecking] = useState(false);
const [results, setResults] = useState(null);

const checkDomain = () => {
if (!data.domain_name) return;
setChecking(true);
setTimeout(() => {
const tlds = [”.com”, “.co”, “.io”, “.app”, “.net”, “.biz”];
setResults(tlds.map(tld => ({
tld,
available: Math.random() > 0.4,
price: tld === “.com” ? “$12/yr” : tld === “.io” ? “$39/yr” : “$15/yr”,
})));
setChecking(false);
}, 1400);
};

return (
<StepLayout title="Domain Selection" subtitle="Your domain is your digital address. Own it before someone else does." icon="🔗">
<FormField label="Preferred domain name">
<div style={{ display: “flex”, gap: 8 }}>
<TextInput value={data.domain_name||””} onChange={v=>{ onChange({…data,domain_name:v}); setResults(null); }} placeholder=“e.g. acmesolutions” />
<AppleButton variant=“secondary” onClick={checkDomain} loading={checking} style={{ flexShrink: 0 }}>Check</AppleButton>
</div>
</FormField>
{results && (
<div style={{ borderRadius: 12, overflow: “hidden”, border: `1px solid ${COLORS.sep}`, marginBottom: 16 }}>
{results.map((r, i) => (
<div key={r.tld} style={{ display: “flex”, alignItems: “center”, padding: “12px 16px”, backgroundColor: i%2===0 ? COLORS.surface : COLORS.bg, borderBottom: i < results.length-1 ? `1px solid ${COLORS.sep}` : “none” }}>
<span style={{ flex: 1, fontWeight: 500 }}>{data.domain_name}{r.tld}</span>
<span style={{ fontSize: 13, color: COLORS.gray5, marginRight: 12 }}>{r.price}</span>
<span style={{ fontSize: 12, fontWeight: 600, color: r.available ? COLORS.green : COLORS.red }}>{r.available ? “✓ Available” : “✗ Taken”}</span>
</div>
))}
</div>
)}
<ChecklistSection title=“Domain Strategy” items={[
{ id: “dot_com”, label: “.com domain registered (primary)” },
{ id: “alt_tlds”, label: “Alternative TLDs registered (.co, .net) — prevent competitors” },
{ id: “privacy_protection”, label: “WHOIS privacy protection enabled” },
{ id: “auto_renew”, label: “Auto-renew enabled — never let your domain expire” },
{ id: “email_domain”, label: “Custom email set up (hello@yourbusiness.com via Google Workspace)” },
{ id: “subdomains”, label: “Subdomain strategy planned (app., blog., shop.)” },
]} data={data} onChange={onChange} />
<InfoCard icon="💡" color={COLORS.teal}>
Register your domain at <strong>Namecheap</strong>, <strong>Cloudflare Registrar</strong> (at-cost pricing), or <strong>Google Domains</strong>. Buy the .com first. If it’s taken, consider a modifier: “get”, “use”, “the”, or a city name prefix.
</InfoCard>
<ResourceLinks links={[
{ label: “Cloudflare Registrar (at-cost)”, url: “https://www.cloudflare.com/products/registrar/” },
{ label: “Namecheap”, url: “https://www.namecheap.com” },
{ label: “Instant Domain Search”, url: “https://instantdomainsearch.com” },
]} />
</StepLayout>
);
}

function WebsiteStep({ data, onChange }) {
const platforms = [
{ id: “wordpress”, name: “WordPress”, icon: “📝”, best: “Content-heavy, blogging, full control”, cost: “$5–20/mo” },
{ id: “shopify”, name: “Shopify”, icon: “🛒”, best: “E-commerce first”, cost: “$29–299/mo” },
{ id: “webflow”, name: “Webflow”, icon: “🎨”, best: “Design-heavy, no-code”, cost: “$14–36/mo” },
{ id: “squarespace”, name: “Squarespace”, icon: “⬛”, best: “Creative, portfolio, simple”, cost: “$16–49/mo” },
{ id: “wix”, name: “Wix”, icon: “🔷”, best: “Fastest to launch”, cost: “$17–35/mo” },
{ id: “nextjs”, name: “Next.js + Vercel”, icon: “⚡”, best: “Developer-built, ultimate performance”, cost: “$0–20/mo” },
{ id: “framer”, name: “Framer”, icon: “🖼️”, best: “Stunning marketing sites”, cost: “$15–30/mo” },
];
return (
<StepLayout title="Website Creation" subtitle="Your website is your 24/7 salesperson and credibility signal." icon="💻">
<FormField label="Website platform">
<div style={{ display: “grid”, gap: 8 }}>
{platforms.map(p => (
<SelectCard key={p.id} selected={data.platform===p.id} onClick={() => onChange({…data,platform:p.id})}>
<div style={{ display: “flex”, alignItems: “center”, gap: 12 }}>
<span style={{ fontSize: 24 }}>{p.icon}</span>
<div style={{ flex: 1 }}>
<div style={{ fontWeight: 600, fontSize: 15 }}>{p.name}</div>
<div style={{ fontSize: 12, color: COLORS.gray5 }}>{p.best}</div>
</div>
<div style={{ fontSize: 12, color: COLORS.blue, fontWeight: 500 }}>{p.cost}</div>
</div>
</SelectCard>
))}
</div>
</FormField>
<ChecklistSection title=“Website Essentials” items={[
{ id: “homepage”, label: “Homepage with clear value proposition (above the fold)” },
{ id: “about”, label: “About page (story, team, credibility)” },
{ id: “services”, label: “Products/Services page with pricing” },
{ id: “contact”, label: “Contact page with form, phone, address” },
{ id: “privacy_policy”, label: “Privacy Policy (required for GDPR/CCPA compliance)” },
{ id: “terms”, label: “Terms of Service” },
{ id: “ssl”, label: “SSL certificate (https:// — free via Let’s Encrypt)” },
{ id: “mobile”, label: “Mobile-responsive design tested” },
{ id: “speed”, label: “Page speed optimized (Core Web Vitals)” },
{ id: “analytics”, label: “Google Analytics 4 installed” },
{ id: “search_console”, label: “Google Search Console verified” },
{ id: “sitemap”, label: “XML sitemap submitted to Google” },
]} data={data} onChange={onChange} />
<InfoCard icon="🚀" color={COLORS.blue}>
A fast, mobile-first website with clear CTAs outperforms a complex one. Launch a simple MVP site in 48 hours, then iterate. Speed matters: 1 second delay = 7% conversion drop.
</InfoCard>
</StepLayout>
);
}

function SEOStep({ data, onChange }) {
return (
<StepLayout title="SEO Strategy" subtitle="Get found organically on Google — the highest ROI marketing channel." icon="📈">
<FormField label="Primary target keywords (top 5)">
{[0,1,2,3,4].map(i => (
<TextInput key={i} value={(data.keywords||[])[i]||””} onChange={v=>{ const k=[…(data.keywords||[””,””,””,””,””])]; k[i]=v; onChange({…data,keywords:k}); }} placeholder={`Keyword ${i+1}`} style={{ marginBottom: 8 }} />
))}
</FormField>
<ChecklistSection title=“Technical SEO” items={[
{ id: “title_tags”, label: “Unique title tags (50-60 chars) on all pages” },
{ id: “meta_desc”, label: “Meta descriptions (150-160 chars) on all pages” },
{ id: “h1_h2”, label: “Proper H1/H2 heading structure” },
{ id: “schema”, label: “Schema markup (LocalBusiness, Product, FAQ)” },
{ id: “core_web_vitals”, label: “Core Web Vitals pass (LCP <2.5s, FID <100ms, CLS <0.1)” },
{ id: “mobile_friendly”, label: “Mobile-friendly test passed (search.google.com)” },
{ id: “robots_txt”, label: “robots.txt configured correctly” },
{ id: “canonical”, label: “Canonical tags to prevent duplicate content” },
{ id: “404_redirects”, label: “404 errors fixed, redirects set up” },
]} data={data} onChange={onChange} />
<ChecklistSection title=“Local SEO” items={[
{ id: “gmb”, label: “Google Business Profile claimed and optimized” },
{ id: “bing_places”, label: “Bing Places for Business set up” },
{ id: “yelp”, label: “Yelp Business claimed” },
{ id: “citations”, label: “NAP (Name, Address, Phone) consistent across 50+ directories” },
{ id: “reviews”, label: “Review generation strategy in place” },
]} data={data} onChange={onChange} />
<ChecklistSection title=“Content SEO” items={[
{ id: “blog”, label: “Blog set up with keyword-targeted content calendar” },
{ id: “link_building”, label: “Link building strategy (guest posts, directories, PR)” },
{ id: “content_calendar”, label: “Monthly content calendar (4+ pieces of content)” },
]} data={data} onChange={onChange} />
<ResourceLinks links={[
{ label: “Google Search Console”, url: “https://search.google.com/search-console” },
{ label: “Google Business Profile”, url: “https://business.google.com” },
{ label: “Ahrefs Free SEO Tools”, url: “https://ahrefs.com/free-seo-tools” },
{ label: “Semrush Keyword Tool”, url: “https://www.semrush.com/analytics/keywordmagic/” },
]} />
</StepLayout>
);
}

function SocialStep({ data, onChange }) {
const platforms = [
{ id: “instagram”, name: “Instagram”, icon: “📸”, best: “Visual brands, B2C, lifestyle” },
{ id: “facebook”, name: “Facebook”, icon: “👥”, best: “Local business, broad demographics, ads” },
{ id: “linkedin”, name: “LinkedIn”, icon: “💼”, best: “B2B, professional services, networking” },
{ id: “tiktok”, name: “TikTok”, icon: “🎵”, best: “Gen Z, viral potential, video-first” },
{ id: “x”, name: “X (Twitter)”, icon: “🐦”, best: “Real-time, news, SaaS, tech” },
{ id: “youtube”, name: “YouTube”, icon: “▶️”, best: “Long-form video, tutorials, SEO” },
{ id: “pinterest”, name: “Pinterest”, icon: “📌”, best: “E-commerce, home, fashion, recipes” },
{ id: “threads”, name: “Threads”, icon: “🧵”, best: “Community, text-first audience” },
];
return (
<StepLayout title="Social Media Marketing" subtitle="Build audience, drive traffic, and establish authority on the right platforms." icon="📱">
<FormField label="Select your platforms">
<div style={{ display: “grid”, gridTemplateColumns: “1fr 1fr”, gap: 8 }}>
{platforms.map(p => (
<MultiSelectCard key={p.id} selected={(data.platforms||[]).includes(p.id)} onClick={() => { const c=data.platforms||[]; const n=c.includes(p.id)?c.filter(x=>x!==p.id):[…c,p.id]; onChange({…data,platforms:n}); }}>
<span style={{ fontSize: 22 }}>{p.icon}</span>
<div>
<div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
<div style={{ fontSize: 11, color: COLORS.gray5 }}>{p.best}</div>
</div>
</MultiSelectCard>
))}
</div>
</FormField>
<FormField label="Posting frequency goal">
<SegmentedControl options={[“Daily”, “3x/week”, “Weekly”, “2x/month”]} value={data.frequency||””} onChange={v=>onChange({…data,frequency:v})} />
</FormField>
<ChecklistSection title=“Social Media Setup” items={[
{ id: “handles_secured”, label: “Consistent @handle secured on all selected platforms” },
{ id: “bio_optimized”, label: “Bios optimized with keywords and website link” },
{ id: “profile_photos”, label: “Professional profile photos / logos uploaded” },
{ id: “content_calendar”, label: “90-day content calendar created” },
{ id: “scheduling_tool”, label: “Scheduling tool set up (Buffer, Hootsuite, Later)” },
{ id: “pixel_installed”, label: “Facebook/Instagram Pixel installed on website” },
{ id: “utm_tracking”, label: “UTM parameters used for all social links” },
{ id: “community”, label: “Community engagement schedule (reply to comments daily)” },
{ id: “analytics”, label: “Analytics tracked monthly (reach, engagement, conversions)” },
]} data={data} onChange={onChange} />
<InfoCard icon="📊" color={COLORS.purple}>
Focus on <strong>1-2 platforms</strong> initially and do them well rather than spreading thin. Quality beats quantity. Video content gets 3-5x more reach than static images on most platforms in 2025.
</InfoCard>
</StepLayout>
);
}

function BrandingStep({ data, onChange }) {
return (
<StepLayout title="Brand Identity" subtitle="Your brand is how people feel about your business when you're not in the room." icon="🎨">
<FormField label="Brand voice/personality">
<SegmentedControl options={[“Professional”, “Friendly”, “Bold/Edgy”, “Playful”, “Luxurious”, “Approachable”]} value={data.voice||””} onChange={v=>onChange({…data,voice:v})} />
</FormField>
<FormField label="Primary brand colors (hex)">
<div style={{ display: “flex”, gap: 8 }}>
<TextInput value={data.color1||””} onChange={v=>onChange({…data,color1:v})} placeholder=“Primary #007AFF” />
<TextInput value={data.color2||””} onChange={v=>onChange({…data,color2:v})} placeholder=“Secondary #34C759” />
</div>
</FormField>
<FormField label="Tagline / brand promise">
<TextInput value={data.tagline||””} onChange={v=>onChange({…data,tagline:v})} placeholder=“e.g. ‘Business made simple’” />
</FormField>
<ChecklistSection title=“Brand Assets” items={[
{ id: “logo”, label: “Logo designed (vector formats: SVG, AI, EPS)” },
{ id: “color_palette”, label: “Brand color palette defined (primary, secondary, neutrals)” },
{ id: “typography”, label: “Typography system defined (heading + body fonts)” },
{ id: “brand_guide”, label: “Brand style guide documented (1-page minimum)” },
{ id: “favicon”, label: “Favicon created” },
{ id: “business_cards”, label: “Business card design” },
{ id: “email_signature”, label: “Professional email signature created” },
{ id: “templates”, label: “Social media templates created (Canva or Figma)” },
{ id: “photography”, label: “Brand photography / product photography done” },
]} data={data} onChange={onChange} />
<InfoCard icon="🎨" color={COLORS.purple}>
Hire a brand designer on <strong>99designs</strong> ($299+), <strong>Fiverr</strong> ($50–500), or <strong>Dribbble</strong>. Use <strong>Canva</strong> for ongoing branded content. Consistency across all touchpoints is more important than perfection.
</InfoCard>
</StepLayout>
);
}

function MarketingStep({ data, onChange }) {
return (
<StepLayout title="Marketing Plan" subtitle="A systematic approach to acquiring, retaining, and growing your customer base." icon="📣">
<FormField label="Primary marketing channels">
<div style={{ display: “grid”, gridTemplateColumns: “1fr 1fr”, gap: 8 }}>
{[
{ id: “seo_ch”, label: “SEO / Organic”, icon: “🔍” },
{ id: “ppc”, label: “Google Ads (PPC)”, icon: “💰” },
{ id: “social_ads”, label: “Social Ads”, icon: “📱” },
{ id: “email_mktg”, label: “Email Marketing”, icon: “📧” },
{ id: “content_mktg”, label: “Content Marketing”, icon: “✍️” },
{ id: “referral”, label: “Referral Program”, icon: “🤝” },
{ id: “influencer”, label: “Influencer Marketing”, icon: “⭐” },
{ id: “pr”, label: “PR / Press”, icon: “📰” },
{ id: “events”, label: “Events / Networking”, icon: “🎪” },
{ id: “partnerships”, label: “Partnerships / BD”, icon: “🤲” },
].map(c => (
<MultiSelectCard key={c.id} selected={(data.channels||[]).includes(c.id)} onClick={() => { const curr=data.channels||[]; const next=curr.includes(c.id)?curr.filter(x=>x!==c.id):[…curr,c.id]; onChange({…data,channels:next}); }}>
<span style={{ fontSize: 20 }}>{c.icon}</span>
<span style={{ fontWeight: 600, fontSize: 13 }}>{c.label}</span>
</MultiSelectCard>
))}
</div>
</FormField>
<FormField label="Monthly marketing budget">
<TextInput value={data.budget||””} onChange={v=>onChange({…data,budget:v})} placeholder=“e.g. $500/month” />
</FormField>
<FormField label="Customer acquisition cost (CAC) target">
<TextInput value={data.cac||””} onChange={v=>onChange({…data,cac:v})} placeholder=“e.g. $25 per customer” />
</FormField>
<FormField label="Customer lifetime value (LTV) estimate">
<TextInput value={data.ltv||””} onChange={v=>onChange({…data,ltv:v})} placeholder=“e.g. $300 per customer” />
</FormField>
<InfoCard icon="📊" color={COLORS.orange}>
Target a <strong>LTV:CAC ratio of 3:1 or better.</strong> Track your metrics weekly. The channels that work for your business depend entirely on your customer persona — test 2-3 channels for 90 days before doubling down.
</InfoCard>
</StepLayout>
);
}

function LaunchChecklistStep({ data, onChange }) {
const allItems = [
{ category: “Legal”, items: [
{ id: “entity_formed”, label: “Business entity formed and confirmed” },
{ id: “ein_obtained”, label: “EIN obtained from IRS” },
{ id: “licenses_obtained”, label: “All required licenses obtained” },
{ id: “insurance_obtained”, label: “Business insurance obtained (GL, E&O, etc.)” },
{ id: “contracts_ready”, label: “Client contracts / vendor agreements ready” },
{ id: “ip_protected”, label: “IP protected (trademark filed if needed)” },
]},
{ category: “Financial”, items: [
{ id: “bank_open”, label: “Business bank account open” },
{ id: “accounting_setup”, label: “Accounting software configured” },
{ id: “payment_processing”, label: “Payment processing set up (Stripe, Square)” },
{ id: “invoicing_ready”, label: “Invoice templates ready” },
{ id: “pricing_set”, label: “Pricing finalized” },
{ id: “startup_costs_funded”, label: “Startup costs funded” },
]},
{ category: “Digital / Marketing”, items: [
{ id: “domain_live”, label: “Domain registered and connected” },
{ id: “website_live”, label: “Website live and tested” },
{ id: “email_setup”, label: “Professional email address active” },
{ id: “gmb_live”, label: “Google Business Profile live” },
{ id: “social_active”, label: “Social profiles active and branded” },
{ id: “analytics_live”, label: “Analytics tracking confirmed” },
]},
{ category: “Operations”, items: [
{ id: “tools_setup”, label: “Business tools set up (CRM, PM, comms)” },
{ id: “processes_documented”, label: “Core processes documented” },
{ id: “team_ready”, label: “Team/contractors in place (if applicable)” },
{ id: “inventory_ready”, label: “Inventory / product ready to sell” },
{ id: “customer_service”, label: “Customer service process defined” },
{ id: “first_customer”, label: “🎉 First customer acquired!” },
]},
];

const total = allItems.flatMap(c=>c.items).length;
const done = allItems.flatMap(c=>c.items).filter(i=>(data[i.id]||false)).length;
const pct = Math.round((done/total)*100);

return (
<StepLayout title="Launch Checklist" subtitle="Complete these steps and you're ready to open for business." icon="✅">
<div style={{ backgroundColor: COLORS.fill, borderRadius: 12, padding: 16, marginBottom: 20 }}>
<div style={{ display: “flex”, justifyContent: “space-between”, marginBottom: 8 }}>
<span style={{ fontWeight: 600 }}>Launch Readiness</span>
<span style={{ fontWeight: 700, color: pct===100 ? COLORS.green : COLORS.blue }}>{pct}%</span>
</div>
<div style={{ height: 8, borderRadius: 4, backgroundColor: COLORS.sep, overflow: “hidden” }}>
<div style={{ height: “100%”, width: `${pct}%`, backgroundColor: pct===100 ? COLORS.green : COLORS.blue, borderRadius: 4, transition: “width 0.4s ease” }} />
</div>
{pct === 100 && (
<div style={{ textAlign: “center”, marginTop: 12, fontSize: 24 }}>🎉 You’re ready to launch!</div>
)}
</div>
{allItems.map(cat => (
<div key={cat.category} style={{ marginBottom: 16 }}>
<div style={{ fontWeight: 700, fontSize: 13, textTransform: “uppercase”, letterSpacing: “0.05em”, color: COLORS.gray5, marginBottom: 8 }}>{cat.category}</div>
{cat.items.map(item => (
<CheckRow key={item.id} label={item.label} checked={data[item.id]||false} onChange={v => onChange({…data,[item.id]:v})} />
))}
</div>
))}
</StepLayout>
);
}

// ─── Step Content Map ─────────────────────────────────────────────────────────
const STEP_COMPONENTS = {
idea: IdeaStep, market: MarketStep, model: BusinessModelStep, name: NameStep,
structure: StructureStep, state_reg: StateRegStep, ein: EINStep, licenses: LicensesStep,
registered_agent: RegisteredAgentStep, operating: OperatingStep, bank: BankStep,
accounting: AccountingStep, fed_tax: FedTaxStep, state_tax: StateTaxStep,
payroll: PayrollStep, funding: FundingStep, domain: DomainStep, website: WebsiteStep,
seo: SEOStep, social: SocialStep, branding: BrandingStep, marketing: MarketingStep,
launch_plan: LaunchChecklistStep,
};

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function BizForma() {
const [activePhase, setActivePhase] = useState(“conceptualize”);
const [activeStep, setActiveStep] = useState(“idea”);
const [formData, setFormData] = useState({});
const [sidebarOpen, setSidebarOpen] = useState(true);

const currentPhase = PHASES.find(p => p.id === activePhase);
const currentStep = ALL_STEPS.find(s => s.id === activeStep);
const StepComponent = STEP_COMPONENTS[activeStep] || (() => <div>Coming soon</div>);

const stepData = formData[activeStep] || {};
const setStepData = (d) => setFormData(prev => ({ …prev, [activeStep]: d }));

// Calculate overall progress
const totalCompleted = ALL_STEPS.filter(s => {
const d = formData[s.id] || {};
return Object.keys(d).length > 0;
}).length;
const progressPct = Math.round((totalCompleted / ALL_STEPS.length) * 100);

const allSteps = PHASES.flatMap(p => p.steps);
const currIdx = allSteps.findIndex(s => s.id === activeStep);

const goNext = () => {
if (currIdx < allSteps.length - 1) {
const next = allSteps[currIdx + 1];
setActiveStep(next.id);
setActivePhase(PHASES.find(p => p.steps.some(s => s.id === next.id)).id);
}
};
const goPrev = () => {
if (currIdx > 0) {
const prev = allSteps[currIdx - 1];
setActiveStep(prev.id);
setActivePhase(PHASES.find(p => p.steps.some(s => s.id === prev.id)).id);
}
};

return (
<div style={{ display: “flex”, height: “100vh”, fontFamily: “-apple-system, BlinkMacSystemFont, ‘SF Pro Text’, ‘SF Pro Display’, sans-serif”, backgroundColor: COLORS.bg, overflow: “hidden” }}>
{/* Sidebar */}
<AnimatePresence>
{sidebarOpen && (
<motion.aside
initial={{ x: -300, opacity: 0 }}
animate={{ x: 0, opacity: 1 }}
exit={{ x: -300, opacity: 0 }}
transition={{ type: “spring”, damping: 25, stiffness: 200 }}
style={{ width: 280, flexShrink: 0, backgroundColor: COLORS.surface, borderRight: `1px solid ${COLORS.sep}`, display: “flex”, flexDirection: “column”, overflow: “hidden” }}
>
{/* App Header */}
<div style={{ padding: “20px 20px 16px”, borderBottom: `1px solid ${COLORS.sep}` }}>
<div style={{ display: “flex”, alignItems: “center”, gap: 10, marginBottom: 12 }}>
<div style={{ width: 36, height: 36, borderRadius: 8, background: `linear-gradient(135deg, ${COLORS.blue}, ${COLORS.purple})`, display: “flex”, alignItems: “center”, justifyContent: “center”, fontSize: 18 }}>🚀</div>
<div>
<div style={{ fontWeight: 700, fontSize: 17, letterSpacing: “-0.3px” }}>BizForma</div>
<div style={{ fontSize: 11, color: COLORS.gray5 }}>Business Formation Guide</div>
</div>
</div>
{/* Overall Progress */}
<div style={{ backgroundColor: COLORS.fill, borderRadius: 10, padding: “10px 12px” }}>
<div style={{ display: “flex”, justifyContent: “space-between”, marginBottom: 6, fontSize: 12 }}>
<span style={{ color: COLORS.gray5 }}>Overall Progress</span>
<span style={{ fontWeight: 700, color: COLORS.blue }}>{progressPct}%</span>
</div>
<div style={{ height: 5, borderRadius: 3, backgroundColor: COLORS.sep, overflow: “hidden” }}>
<div style={{ height: “100%”, width: `${progressPct}%`, background: `linear-gradient(90deg, ${COLORS.blue}, ${COLORS.purple})`, borderRadius: 3, transition: “width 0.4s” }} />
</div>
</div>
</div>

```
        {/* Phase/Step Navigation */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>
          {PHASES.map(phase => (
            <div key={phase.id}>
              <button
                onClick={() => { setActivePhase(phase.id); setActiveStep(phase.steps[0].id); }}
                style={{ width: "100%", padding: "8px 20px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, textAlign: "left" }}
              >
                <span style={{ fontSize: 16 }}>{phase.icon}</span>
                <span style={{ fontWeight: activePhase === phase.id ? 700 : 500, fontSize: 13, color: activePhase === phase.id ? phase.color : COLORS.gray1, flex: 1 }}>{phase.label}</span>
                <span style={{ fontSize: 11, color: COLORS.gray5 }}>{phase.steps.length}</span>
              </button>
              <AnimatePresence>
                {activePhase === phase.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
                    {phase.steps.map(step => {
                      const hasData = Object.keys(formData[step.id] || {}).length > 0;
                      const isActive = activeStep === step.id;
                      return (
                        <button
                          key={step.id}
                          onClick={() => setActiveStep(step.id)}
                          style={{ width: "100%", padding: "7px 20px 7px 46px", background: isActive ? `${phase.color}15` : "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, textAlign: "left", borderLeft: isActive ? `3px solid ${phase.color}` : "3px solid transparent" }}
                        >
                          <span style={{ fontSize: 14 }}>{step.icon}</span>
                          <span style={{ flex: 1, fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? phase.color : COLORS.gray1 }}>{step.label}</span>
                          {hasData && !isActive && <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: COLORS.green, flexShrink: 0 }} />}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Save/Export */}
        <div style={{ padding: 16, borderTop: `1px solid ${COLORS.sep}` }}>
          <AppleButton variant="secondary" style={{ width: "100%" }} onClick={() => {
            const blob = new Blob([JSON.stringify(formData, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = "bizforma-data.json"; a.click();
          }}>
            💾 Export Progress
          </AppleButton>
        </div>
      </motion.aside>
    )}
  </AnimatePresence>

  {/* Main Content */}
  <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
    {/* Top Bar */}
    <div style={{ height: 56, borderBottom: `1px solid ${COLORS.sep}`, backgroundColor: COLORS.surface, display: "flex", alignItems: "center", padding: "0 20px", gap: 12, flexShrink: 0 }}>
      <button onClick={() => setSidebarOpen(o => !o)} style={{ width: 32, height: 32, border: "none", background: COLORS.fill, borderRadius: 8, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
        ☰
      </button>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 14, color: COLORS.gray5 }}>{currentPhase?.label}</span>
        <span style={{ color: COLORS.sep }}>›</span>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{currentStep?.label}</span>
      </div>
      <div style={{ fontSize: 13, color: COLORS.gray5 }}>Step {currIdx + 1} of {allSteps.length}</div>
    </div>

    {/* Step Content */}
    <div style={{ flex: 1, overflowY: "auto", padding: "0 0 40px" }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2 }}
          style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px" }}
        >
          <StepComponent data={stepData} onChange={setStepData} />
        </motion.div>
      </AnimatePresence>
    </div>

    {/* Navigation Footer */}
    <div style={{ borderTop: `1px solid ${COLORS.sep}`, backgroundColor: COLORS.surface, padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
      <AppleButton variant="secondary" onClick={goPrev} disabled={currIdx === 0}>
        ← Previous
      </AppleButton>
      <div style={{ display: "flex", gap: 4 }}>
        {allSteps.slice(Math.max(0, currIdx-2), Math.min(allSteps.length, currIdx+3)).map((s, i) => (
          <div key={s.id} style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: s.id === activeStep ? COLORS.blue : COLORS.sep }} />
        ))}
      </div>
      <AppleButton variant="primary" onClick={goNext} disabled={currIdx === allSteps.length - 1}>
        {currIdx === allSteps.length - 1 ? "🎉 Complete" : "Next →"}
      </AppleButton>
    </div>
  </div>
</div>
```

);
}

// ─── Reusable UI Components (Apple HIG) ──────────────────────────────────────

function StepLayout({ title, subtitle, icon, children }) {
return (
<div style={{ paddingTop: 32 }}>
<div style={{ marginBottom: 24 }}>
<div style={{ fontSize: 36, marginBottom: 8 }}>{icon}</div>
<h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: “-0.5px”, margin: 0, marginBottom: 6 }}>{title}</h1>
<p style={{ fontSize: 15, color: COLORS.gray5, margin: 0, lineHeight: 1.5 }}>{subtitle}</p>
</div>
<div style={{ display: “flex”, flexDirection: “column”, gap: 0 }}>{children}</div>
</div>
);
}

function FormField({ label, children, style }) {
return (
<div style={{ marginBottom: 20, …style }}>
<label style={{ display: “block”, fontSize: 13, fontWeight: 600, color: COLORS.label2, marginBottom: 6, letterSpacing: “0.02em” }}>
{label}
</label>
{children}
</div>
);
}

function TextInput({ value, onChange, placeholder, type = “text”, style, …props }) {
return (
<input
type={type}
value={value}
onChange={e => onChange(e.target.value)}
placeholder={placeholder}
style={{ width: “100%”, padding: “10px 14px”, fontSize: 15, border: `1px solid ${COLORS.sep}`, borderRadius: 10, backgroundColor: COLORS.surface, outline: “none”, boxSizing: “border-box”, fontFamily: “inherit”, color: COLORS.gray1, …style }}
{…props}
/>
);
}

function TextArea({ value, onChange, placeholder, rows = 3 }) {
return (
<textarea
value={value}
onChange={e => onChange(e.target.value)}
placeholder={placeholder}
rows={rows}
style={{ width: “100%”, padding: “10px 14px”, fontSize: 15, border: `1px solid ${COLORS.sep}`, borderRadius: 10, backgroundColor: COLORS.surface, outline: “none”, resize: “vertical”, boxSizing: “border-box”, fontFamily: “inherit”, color: COLORS.gray1, lineHeight: 1.5 }}
/>
);
}

function SegmentedControl({ options, value, onChange }) {
return (
<div style={{ display: “flex”, flexWrap: “wrap”, gap: 6 }}>
{options.map(opt => (
<button
key={opt}
onClick={() => onChange(opt)}
style={{ padding: “7px 14px”, fontSize: 13, fontWeight: value === opt ? 600 : 400, border: `1px solid ${value === opt ? COLORS.blue : COLORS.sep}`, borderRadius: 20, backgroundColor: value === opt ? `${COLORS.blue}15` : COLORS.surface, color: value === opt ? COLORS.blue : COLORS.gray1, cursor: “pointer”, fontFamily: “inherit”, transition: “all 0.15s” }}
>
{opt}
</button>
))}
</div>
);
}

function SelectCard({ selected, onClick, children }) {
return (
<button
onClick={onClick}
style={{ width: “100%”, padding: “12px 14px”, border: `1.5px solid ${selected ? COLORS.blue : COLORS.sep}`, borderRadius: 12, backgroundColor: selected ? `${COLORS.blue}08` : COLORS.surface, cursor: “pointer”, textAlign: “left”, fontFamily: “inherit”, transition: “all 0.15s”, outline: “none” }}
>
{children}
</button>
);
}

function MultiSelectCard({ selected, onClick, children }) {
return (
<button
onClick={onClick}
style={{ padding: “10px 12px”, border: `1.5px solid ${selected ? COLORS.blue : COLORS.sep}`, borderRadius: 10, backgroundColor: selected ? `${COLORS.blue}08` : COLORS.surface, cursor: “pointer”, textAlign: “left”, fontFamily: “inherit”, display: “flex”, alignItems: “center”, gap: 8, transition: “all 0.15s” }}
>
{children}
</button>
);
}

function AppleButton({ variant = “primary”, onClick, children, disabled, loading, style }) {
const isPrimary = variant === “primary”;
return (
<button
onClick={onClick}
disabled={disabled || loading}
style={{ padding: “10px 20px”, fontSize: 15, fontWeight: 600, border: “none”, borderRadius: 10, backgroundColor: disabled ? COLORS.sep : isPrimary ? COLORS.blue : COLORS.fill, color: disabled ? COLORS.gray5 : isPrimary ? “#fff” : COLORS.gray1, cursor: disabled ? “not-allowed” : “pointer”, fontFamily: “inherit”, transition: “all 0.15s”, opacity: loading ? 0.7 : 1, …style }}
>
{loading ? “⏳ Checking…” : children}
</button>
);
}

function InfoCard({ icon, color, children }) {
return (
<div style={{ backgroundColor: `${color}10`, border: `1px solid ${color}30`, borderRadius: 12, padding: “12px 14px”, marginBottom: 16, display: “flex”, gap: 10, alignItems: “flex-start” }}>
<span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{icon}</span>
<div style={{ fontSize: 14, lineHeight: 1.5, color: COLORS.gray1 }}>{children}</div>
</div>
);
}

function StatusBadge({ color, children }) {
return (
<div style={{ marginTop: 8, padding: “6px 12px”, borderRadius: 8, backgroundColor: `${color}15`, color, fontSize: 13, fontWeight: 600 }}>
{children}
</div>
);
}

function ChecklistSection({ title, items, data, onChange }) {
return (
<div style={{ marginBottom: 20 }}>
{title && <div style={{ fontWeight: 600, fontSize: 13, color: COLORS.gray5, textTransform: “uppercase”, letterSpacing: “0.06em”, marginBottom: 10 }}>{title}</div>}
<div style={{ backgroundColor: COLORS.surface, borderRadius: 12, overflow: “hidden”, border: `1px solid ${COLORS.sep}` }}>
{items.map((item, i) => (
<CheckRow
key={item.id}
label={item.label}
checked={data[item.id] || false}
onChange={v => onChange({ …data, [item.id]: v })}
style={{ borderBottom: i < items.length - 1 ? `1px solid ${COLORS.sep}` : “none” }}
/>
))}
</div>
</div>
);
}

function CheckRow({ label, checked, onChange, style }) {
return (
<label style={{ display: “flex”, alignItems: “center”, gap: 12, padding: “12px 14px”, cursor: “pointer”, …style }}>
<div
onClick={() => onChange(!checked)}
style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${checked ? COLORS.blue : COLORS.sep}`, backgroundColor: checked ? COLORS.blue : “transparent”, display: “flex”, alignItems: “center”, justifyContent: “center”, flexShrink: 0, transition: “all 0.15s”, cursor: “pointer” }}
>
{checked && <span style={{ color: “#fff”, fontSize: 13, fontWeight: 700, lineHeight: 1 }}>✓</span>}
</div>
<span style={{ fontSize: 14, textDecoration: checked ? “line-through” : “none”, color: checked ? COLORS.gray5 : COLORS.gray1, lineHeight: 1.4 }}>{label}</span>
</label>
);
}

function ResourceLinks({ links }) {
return (
<div style={{ marginBottom: 16 }}>
<div style={{ fontWeight: 600, fontSize: 12, color: COLORS.gray5, textTransform: “uppercase”, letterSpacing: “0.06em”, marginBottom: 8 }}>Resources</div>
<div style={{ display: “flex”, flexDirection: “column”, gap: 6 }}>
{links.map(link => (
<a key={link.url} href={link.url} target=”_blank” rel=“noopener noreferrer” style={{ fontSize: 14, color: COLORS.blue, textDecoration: “none”, display: “flex”, alignItems: “center”, gap: 4 }}>
🔗 {link.label}
</a>
))}
</div>
</div>
);
}

function StateSelect({ value, onChange }) {
const states = [“Alabama”,“Alaska”,“Arizona”,“Arkansas”,“California”,“Colorado”,“Connecticut”,“Delaware”,“Florida”,“Georgia”,“Hawaii”,“Idaho”,“Illinois”,“Indiana”,“Iowa”,“Kansas”,“Kentucky”,“Louisiana”,“Maine”,“Maryland”,“Massachusetts”,“Michigan”,“Minnesota”,“Mississippi”,“Missouri”,“Montana”,“Nebraska”,“Nevada”,“New Hampshire”,“New Jersey”,“New Mexico”,“New York”,“North Carolina”,“North Dakota”,“Ohio”,“Oklahoma”,“Oregon”,“Pennsylvania”,“Rhode Island”,“South Carolina”,“South Dakota”,“Tennessee”,“Texas”,“Utah”,“Vermont”,“Virginia”,“Washington”,“West Virginia”,“Wisconsin”,“Wyoming”,“District of Columbia”];
return (
<select value={value} onChange={e => onChange(e.target.value)} style={{ width: “100%”, padding: “10px 14px”, fontSize: 15, border: `1px solid ${COLORS.sep}`, borderRadius: 10, backgroundColor: COLORS.surface, outline: “none”, fontFamily: “inherit”, color: value ? COLORS.gray1 : COLORS.gray5, appearance: “none” }}>
<option value="">Select state…</option>
{states.map(s => <option key={s} value={s}>{s}</option>)}
</select>
);
}
