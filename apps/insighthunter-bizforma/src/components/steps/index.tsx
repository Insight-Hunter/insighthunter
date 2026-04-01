// src/components/steps/index.tsx
import React, { useState } from "react";
import { COLORS } from "../../constants";
import {
  StepLayout, FormField, TextInput, TextArea, SegmentedControl,
  SelectCard, MultiSelectCard, AppleButton, InfoCard, StatusBadge,
  ChecklistSection, ResourceLinks, StateSelect, SectionHeader,
} from "../ui";
import { useNameCheck, useDomainCheck, useDocGeneration } from "../../hooks/useApi";
import type {
  StepComponentProps, IdeaData, MarketData, BusinessModelData, NameData,
  StructureData, StateRegData, EINData, LicensesData, RegisteredAgentData,
  OperatingData, BankData, AccountingData, FedTaxData, StateTaxData,
  PayrollData, FundingData, DomainData, WebsiteData, SEOData, SocialData,
  BrandingData, MarketingData, LaunchData,
} from "../../types";

// ─── 1. Idea ─────────────────────────────────────────────────────────────────
export function IdeaStep({ data, onChange }: StepComponentProps<IdeaData>) {
  return (
    <StepLayout title="Business Idea" subtitle="Every great business starts with a clear problem worth solving." icon="🧠">
      <FormField label="What problem does your business solve?">
        <TextArea value={data.problem ?? ""} onChange={(v) => onChange({ ...data, problem: v })} placeholder="Describe the core problem your customers face…" rows={3} />
      </FormField>
      <FormField label="Your solution">
        <TextArea value={data.solution ?? ""} onChange={(v) => onChange({ ...data, solution: v })} placeholder="How does your product or service solve this?" rows={3} />
      </FormField>
      <FormField label="Target customers">
        <TextInput value={data.customers ?? ""} onChange={(v) => onChange({ ...data, customers: v })} placeholder="e.g. Small business owners aged 25–45" />
      </FormField>
      <FormField label="Revenue model">
        <SegmentedControl
          options={["Subscription", "One-time", "Freemium", "Marketplace", "Services", "Other"]}
          value={data.revenue ?? ""}
          onChange={(v) => onChange({ ...data, revenue: v })}
        />
      </FormField>
      <InfoCard icon="💡" color={COLORS.purple}>
        A strong idea addresses a real, validated pain point. Before investing, talk to at least 10 potential customers.
      </InfoCard>
    </StepLayout>
  );
}

// ─── 2. Market ───────────────────────────────────────────────────────────────
export function MarketStep({ data, onChange }: StepComponentProps<MarketData>) {
  return (
    <StepLayout title="Market Research" subtitle="Understand your competitive landscape and total addressable market." icon="🔍">
      <FormField label="Industry / Sector">
        <TextInput value={data.industry ?? ""} onChange={(v) => onChange({ ...data, industry: v })} placeholder="e.g. FinTech, Healthcare, E-commerce" />
      </FormField>
      <FormField label="Total Addressable Market (TAM)">
        <TextInput value={data.tam ?? ""} onChange={(v) => onChange({ ...data, tam: v })} placeholder="e.g. $2.4B globally" />
      </FormField>
      <FormField label="Top 3 Competitors">
        {[0, 1, 2].map((i) => (
          <TextInput
            key={i}
            value={(data.competitors ?? [])[i] ?? ""}
            onChange={(v) => {
              const c = [...(data.competitors ?? ["", "", ""])];
              c[i] = v;
              onChange({ ...data, competitors: c });
            }}
            placeholder={`Competitor ${i + 1}`}
            style={{ marginBottom: 8 }}
          />
        ))}
      </FormField>
      <FormField label="Competitive advantage (USP)">
        <TextArea value={data.usp ?? ""} onChange={(v) => onChange({ ...data, usp: v })} placeholder="What makes you uniquely better?" rows={2} />
      </FormField>
      <InfoCard icon="📊" color={COLORS.blue}>
        Use Google Trends, Statista, SBA.gov, and IBISWorld to validate market size. Aim for a TAM growing &gt;10% annually.
      </InfoCard>
    </StepLayout>
  );
}

// ─── 3. Business Model ────────────────────────────────────────────────────────
export function BusinessModelStep({ data, onChange }: StepComponentProps<BusinessModelData>) {
  const fields: Array<{ key: keyof BusinessModelData; label: string; placeholder: string }> = [
    { key: "value_prop",      label: "Value Propositions",    placeholder: "What value do you deliver?" },
    { key: "channels",        label: "Channels",              placeholder: "How do you reach customers?" },
    { key: "customer_rel",    label: "Customer Relationships", placeholder: "How do you interact with customers?" },
    { key: "revenue_streams", label: "Revenue Streams",       placeholder: "How do you make money?" },
    { key: "key_resources",   label: "Key Resources",         placeholder: "What assets do you need?" },
    { key: "key_activities",  label: "Key Activities",        placeholder: "What must you do well?" },
    { key: "key_partners",    label: "Key Partners",          placeholder: "Who are your critical partners?" },
    { key: "cost_structure",  label: "Cost Structure",        placeholder: "What are your major costs?" },
  ];
  return (
    <StepLayout title="Business Model Canvas" subtitle="Map out how your business creates, delivers, and captures value." icon="📊">
      {fields.map((f) => (
        <FormField key={f.key} label={f.label}>
          <TextArea value={(data[f.key] as string) ?? ""} onChange={(v) => onChange({ ...data, [f.key]: v })} placeholder={f.placeholder} rows={2} />
        </FormField>
      ))}
      <InfoCard icon="💡" color={COLORS.purple}>
        The Business Model Canvas was created by Alexander Osterwalder. Use it to spot gaps before you invest time and money.
      </InfoCard>
    </StepLayout>
  );
}

// ─── 4. Name ─────────────────────────────────────────────────────────────────
export function NameStep({ data, onChange }: StepComponentProps<NameData>) {
  const { check, loading, result, reset } = useNameCheck();

  return (
    <StepLayout title="Business Name" subtitle="Your name is your first impression. Make it memorable and legally clear." icon="✏️">
      <FormField label="Desired business name">
        <div style={{ display: "flex", gap: 8 }}>
          <TextInput
            value={data.name ?? ""}
            onChange={(v) => { onChange({ ...data, name: v }); reset(); }}
            placeholder="e.g. Acme Solutions LLC"
          />
          <AppleButton
            variant="secondary"
            onClick={() => check(data.name ?? "")}
            loading={loading}
            disabled={!data.name || data.name.length < 2}
            style={{ flexShrink: 0 }}
          >
            Check
          </AppleButton>
        </div>
        {result && (
          <StatusBadge color={result.available ? COLORS.green : COLORS.red}>
            {result.available ? "✓ Name appears available" : "✗ Name may be taken"}
          </StatusBadge>
        )}
        {result && result.similarNames.length > 0 && !result.available && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, color: COLORS.gray5, marginBottom: 6 }}>AI Suggestions:</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {result.similarNames.map((n) => (
                <button
                  key={n}
                  onClick={() => onChange({ ...data, name: n })}
                  style={{ padding: "4px 10px", fontSize: 13, border: `1px solid ${COLORS.blue}`, borderRadius: 16, backgroundColor: `${COLORS.blue}10`, color: COLORS.blue, cursor: "pointer", fontFamily: "inherit" }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}
      </FormField>
      <FormField label="Alternatives (in case primary is taken)">
        {[0, 1].map((i) => (
          <TextInput
            key={i}
            value={(data.alternatives ?? [])[i] ?? ""}
            onChange={(v) => {
              const a = [...(data.alternatives ?? ["", ""])];
              a[i] = v;
              onChange({ ...data, alternatives: a });
            }}
            placeholder={`Alternative ${i + 1}`}
            style={{ marginBottom: 8 }}
          />
        ))}
      </FormField>
      <FormField label="DBA / Trade Name (optional)">
        <TextInput value={data.dba ?? ""} onChange={(v) => onChange({ ...data, dba: v })} placeholder="Doing Business As — if different from legal name" />
      </FormField>
      <InfoCard icon="⚠️" color={COLORS.orange}>
        Search USPTO trademarks, your state SOS database, and domain registrars before finalizing. Secure social handles too.
      </InfoCard>
      <ResourceLinks links={[
        { label: "USPTO Trademark Search", url: "https://www.uspto.gov/trademarks/search" },
        { label: "NASS State Business Search Directory", url: "https://www.nass.org/business-services/forming-a-business" },
        { label: "Namechk — Social Handle Availability", url: "https://namechk.com" },
      ]} />
    </StepLayout>
  );
}

// ─── 5. Structure ────────────────────────────────────────────────────────────
export function StructureStep({ data, onChange }: StepComponentProps<StructureData>) {
  const structures = [
    { id: "sole_prop",   name: "Sole Proprietorship", icon: "👤",  pros: ["Simplest setup", "No separate filing"],                     cons: ["Personal liability", "SE tax on all profits"],            bestFor: "Solo freelancers, low-risk" },
    { id: "llc",         name: "LLC",                 icon: "🏢",  pros: ["Liability protection", "Tax flexibility"],                   cons: ["Annual fees", "State filing required"],                    bestFor: "Most small businesses ✓ Recommended" },
    { id: "s_corp",      name: "S-Corporation",       icon: "📈",  pros: ["Salary/dividend tax savings", "Pass-through tax"],           cons: ["Payroll required", "Shareholder restrictions"],            bestFor: "Profitable businesses >$40K/yr" },
    { id: "c_corp",      name: "C-Corporation",       icon: "🏦",  pros: ["VC-ready", "Stock options", "Unlimited shareholders"],       cons: ["Double taxation", "Complex compliance"],                   bestFor: "Startups raising venture capital" },
    { id: "nonprofit",   name: "Nonprofit 501(c)(3)", icon: "❤️",  pros: ["Tax-exempt status", "Grant eligible"],                      cons: ["Complex IRS application", "Mission restrictions"],         bestFor: "Charitable organizations" },
    { id: "partnership", name: "Partnership (GP/LP)", icon: "🤝",  pros: ["Simple to form", "Pass-through taxation"],                  cons: ["General liability for GP", "Dispute-prone"],               bestFor: "2+ co-founders, law/medical firms" },
  ] as const;

  return (
    <StepLayout title="Legal Structure" subtitle="Choose the entity type that fits your liability, tax, and growth needs." icon="⚖️">
      <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
        {structures.map((s) => (
          <SelectCard key={s.id} selected={data.structure === s.id} onClick={() => onChange({ ...data, structure: s.id })}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ fontSize: 26, flexShrink: 0 }}>{s.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{s.name}</div>
                <div style={{ fontSize: 12, color: COLORS.green, marginBottom: 6, fontWeight: 500 }}>{s.bestFor}</div>
                <div style={{ display: "flex", gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.green, marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}>Pros</div>
                    {s.pros.map((p) => <div key={p} style={{ fontSize: 12, color: COLORS.gray5 }}>• {p}</div>)}
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.red, marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}>Cons</div>
                    {s.cons.map((c) => <div key={c} style={{ fontSize: 12, color: COLORS.gray5 }}>• {c}</div>)}
                  </div>
                </div>
              </div>
            </div>
          </SelectCard>
        ))}
      </div>
      <FormField label="Formation state">
        <StateSelect value={data.state ?? ""} onChange={(v) => onChange({ ...data, state: v })} />
      </FormField>
      <InfoCard icon="💡" color={COLORS.blue}>
        <strong>Most common choice: LLC.</strong> It provides liability protection, flexible taxation (default pass-through or elect S-Corp), and minimal formality. Delaware, Wyoming, and Nevada offer strong protections.
      </InfoCard>
    </StepLayout>
  );
}

// ─── 6. State Registration ────────────────────────────────────────────────────
export function StateRegStep({ data, onChange }: StepComponentProps<StateRegData>) {
  return (
    <StepLayout title="State Registration" subtitle="File your formation documents with the Secretary of State." icon="🏛️">
      <ChecklistSection
        title="Articles of Organization / Incorporation"
        items={[
          { id: "articles_drafted",       label: "Draft Articles of Organization/Incorporation" },
          { id: "filing_fee_paid",         label: "Pay state filing fee ($50–$500 depending on state)" },
          { id: "sos_filed",               label: "File with Secretary of State (online or by mail)" },
          { id: "confirmation_received",   label: "Receive confirmation / Certificate of Formation" },
          { id: "foreign_qualification",   label: "Foreign qualification in operating states (if different)" },
        ]}
        data={data}
        onChange={onChange}
      />
      <FormField label="Secretary of State filing URL">
        <TextInput value={data.filing_url ?? ""} onChange={(v) => onChange({ ...data, filing_url: v })} placeholder="https://www.sos.[state].gov" />
      </FormField>
      <FormField label="Formation date (actual or target)">
        <TextInput type="date" value={data.formation_date ?? ""} onChange={(v) => onChange({ ...data, formation_date: v })} />
      </FormField>
      <FormField label="Annual report due date">
        <TextInput value={data.annual_report_date ?? ""} onChange={(v) => onChange({ ...data, annual_report_date: v })} placeholder="e.g. April 1 each year" />
      </FormField>
      <InfoCard icon="📅" color={COLORS.orange}>
        Set calendar reminders for your annual report. Missing it can result in dissolution and loss of liability protection.
      </InfoCard>
      <ResourceLinks links={[
        { label: "All States SOS Directory", url: "https://www.nass.org/business-services/forming-a-business" },
        { label: "Delaware Division of Corporations", url: "https://corp.delaware.gov" },
        { label: "Wyoming SOS", url: "https://sos.wyo.gov/Business/" },
      ]} />
    </StepLayout>
  );
}

// ─── 7. EIN ──────────────────────────────────────────────────────────────────
export function EINStep({ data, onChange }: StepComponentProps<EINData>) {
  return (
    <StepLayout title="EIN / Federal Tax ID" subtitle="Your federal tax ID — required for banking, hiring, and most tax filings." icon="🔢">
      <ChecklistSection
        title="EIN Application"
        items={[
          { id: "irs_online",    label: "Apply online at IRS.gov (free, instant on business days)" },
          { id: "ss4_filed",     label: "Alternative: Form SS-4 via fax or mail (4–6 weeks)" },
          { id: "ein_received",  label: "EIN confirmation letter (CP 575) received" },
          { id: "ein_stored",    label: "EIN securely stored (password manager)" },
        ]}
        data={data}
        onChange={onChange}
      />
      <FormField label="Your EIN (once received)">
        <TextInput value={data.ein ?? ""} onChange={(v) => onChange({ ...data, ein: v })} placeholder="XX-XXXXXXX" maxLength={10} />
      </FormField>
      <InfoCard icon="🔒" color={COLORS.red}>
        Treat your EIN like a Social Security Number. Never post it publicly — it can be used for identity theft and fraudulent tax filings.
      </InfoCard>
      <ResourceLinks links={[
        { label: "Apply for EIN Online (IRS.gov)", url: "https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online" },
        { label: "IRS Form SS-4", url: "https://www.irs.gov/forms-pubs/about-form-ss-4" },
      ]} />
    </StepLayout>
  );
}

// ─── 8. Licenses ─────────────────────────────────────────────────────────────
export function LicensesStep({ data, onChange }: StepComponentProps<LicensesData>) {
  return (
    <StepLayout title="Licenses & Permits" subtitle="Most businesses need federal, state, or local licenses to operate legally." icon="📜">
      <ChecklistSection
        title="Common Requirements"
        items={[
          { id: "business_license",    label: "General Business License (city/county)" },
          { id: "professional_license", label: "Professional License (doctor, contractor, CPA, etc.)" },
          { id: "seller_permit",        label: "Seller's Permit / Sales Tax License (if selling goods)" },
          { id: "dba_filing",           label: "DBA / Fictitious Name Filing (if using trade name)" },
          { id: "zoning",               label: "Zoning / Home Occupation Permit (if home-based)" },
          { id: "health_permit",        label: "Health / Safety Permit (food, childcare, etc.)" },
          { id: "federal_license",      label: "Federal License (firearms, alcohol, aviation, agriculture)" },
          { id: "ein_labor",            label: "State Labor / Employment Registration (if hiring)" },
        ]}
        data={data}
        onChange={onChange}
      />
      <FormField label="Industry-specific licenses needed">
        <TextArea value={data.specific_licenses ?? ""} onChange={(v) => onChange({ ...data, specific_licenses: v })} placeholder="List any industry-specific permits for your business…" rows={2} />
      </FormField>
      <ResourceLinks links={[
        { label: "SBA License & Permit Finder", url: "https://www.sba.gov/business-guide/launch-your-business/apply-licenses-permits" },
        { label: "BusinessLicenses.com", url: "https://www.businesslicenses.com" },
      ]} />
    </StepLayout>
  );
}

// ─── 9. Registered Agent ─────────────────────────────────────────────────────
export function RegisteredAgentStep({ data, onChange }: StepComponentProps<RegisteredAgentData>) {
  return (
    <StepLayout title="Registered Agent" subtitle="A registered agent receives legal and government correspondence on behalf of your business." icon="👤">
      <FormField label="Registered agent type">
        <SegmentedControl
          options={["Myself / Owner", "Attorney/CPA", "Registered Agent Service"]}
          value={data.agent_type ?? ""}
          onChange={(v) => onChange({ ...data, agent_type: v as RegisteredAgentData["agent_type"] })}
        />
      </FormField>
      {data.agent_type === "Registered Agent Service" && (
        <InfoCard icon="💡" color={COLORS.blue}>
          Popular services: Northwest Registered Agent ($125/yr), ZenBusiness ($99/yr), Registered Agents Inc ($200/yr). Using a service keeps your home address out of public records.
        </InfoCard>
      )}
      <FormField label="Registered agent name">
        <TextInput value={data.agent_name ?? ""} onChange={(v) => onChange({ ...data, agent_name: v })} placeholder="Full legal name" />
      </FormField>
      <FormField label="Registered address (physical — no PO Boxes)">
        <TextArea value={data.agent_address ?? ""} onChange={(v) => onChange({ ...data, agent_address: v })} placeholder="Street address, city, state, ZIP" rows={2} />
      </FormField>
      <ChecklistSection
        title="Registered Agent Checklist"
        items={[
          { id: "agent_designated", label: "Agent designated in formation documents" },
          { id: "agent_available",  label: "Agent available during business hours at registered address" },
          { id: "agent_annual",     label: "Annual registered agent fee paid / renewed" },
        ]}
        data={data}
        onChange={onChange}
      />
    </StepLayout>
  );
}

// ─── 10. Operating Agreement ──────────────────────────────────────────────────
export function OperatingStep({ data, onChange }: StepComponentProps<OperatingData>) {
  const { generate, loading, result } = useDocGeneration();
  return (
    <StepLayout title="Operating Agreement" subtitle="This internal document governs how your business operates and protects your LLC status." icon="📄">
      <FormField label="Number of members/owners">
        <TextInput type="number" min="1" value={data.member_count ?? ""} onChange={(v) => onChange({ ...data, member_count: v })} placeholder="e.g. 2" />
      </FormField>
      <FormField label="Management type">
        <SegmentedControl options={["Member-Managed", "Manager-Managed"]} value={data.mgmt_type ?? ""} onChange={(v) => onChange({ ...data, mgmt_type: v as OperatingData["mgmt_type"] })} />
      </FormField>
      <ChecklistSection
        title="Operating Agreement Essentials"
        items={[
          { id: "ownership_defined",    label: "Ownership percentages defined for all members" },
          { id: "voting_rights",        label: "Voting rights and decision-making procedures" },
          { id: "profit_distribution",  label: "Profit/loss distribution rules" },
          { id: "management_structure", label: "Management structure documented" },
          { id: "buyout_provisions",    label: "Buyout provisions and transfer restrictions" },
          { id: "dissolution_process",  label: "Dissolution / wind-down process defined" },
          { id: "signed_notarized",     label: "Signed by all members (notarized if required)" },
          { id: "stored_safely",        label: "Original + digital copy stored securely" },
        ]}
        data={data}
        onChange={onChange}
      />
      <AppleButton
        variant="secondary"
        loading={loading}
        onClick={() => generate("operating_agreement", { ...data })}
        style={{ marginBottom: 16 }}
      >
        🤖 Generate AI Outline
      </AppleButton>
      {result && (
        <div style={{ backgroundColor: COLORS.bg, borderRadius: 10, padding: 14, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "monospace", marginBottom: 16 }}>
          {result.content}
        </div>
      )}
      <InfoCard icon="⚠️" color={COLORS.red}>
        Without an operating agreement, your state's default LLC rules apply — which may not align with your intentions. Even single-member LLCs need one.
      </InfoCard>
    </StepLayout>
  );
}

// ─── 11. Bank ────────────────────────────────────────────────────────────────
export function BankStep({ data, onChange }: StepComponentProps<BankData>) {
  return (
    <StepLayout title="Business Bank Account" subtitle="Separating business and personal finances is critical for liability protection and clean taxes." icon="🏦">
      <FormField label="Bank selected">
        <TextInput value={data.bank_name ?? ""} onChange={(v) => onChange({ ...data, bank_name: v })} placeholder="e.g. Mercury, Chase Business, Relay" />
      </FormField>
      <FormField label="Tax reserve % (set aside from every deposit)">
        <SegmentedControl options={["20%", "25%", "30%", "35%"]} value={data.tax_reserve ?? ""} onChange={(v) => onChange({ ...data, tax_reserve: v })} />
      </FormField>
      <ChecklistSection
        title="Account Setup"
        items={[
          { id: "bank_selected",    label: "Bank selected (see recommendations below)" },
          { id: "ein_ready",        label: "EIN ready — required for business accounts" },
          { id: "formation_docs",   label: "Formation docs ready (Articles + Operating Agreement)" },
          { id: "account_opened",   label: "Business checking account opened" },
          { id: "savings_opened",   label: "Separate savings for tax reserves" },
          { id: "credit_card",      label: "Business credit card applied for" },
          { id: "zelle_setup",      label: "Payment acceptance set up (Stripe, Square, Zelle)" },
        ]}
        data={data}
        onChange={onChange}
      />
      <InfoCard icon="🏦" color={COLORS.blue}>
        <strong>Recommended banks:</strong> Mercury (online, no fees, great API), Relay (multi-account), Novo (no minimums), Chase Business (large network), BlueVine (HYSA). <em>Never mix personal and business funds — it can pierce your corporate veil.</em>
      </InfoCard>
    </StepLayout>
  );
}

// ─── 12. Accounting ───────────────────────────────────────────────────────────
export function AccountingStep({ data, onChange }: StepComponentProps<AccountingData>) {
  return (
    <StepLayout title="Accounting Setup" subtitle="Clean books from day one saves thousands at tax time and makes funding easier." icon="📒">
      <FormField label="Accounting software">
        <SegmentedControl options={["QuickBooks", "Xero", "Wave (free)", "FreshBooks", "Bench"]} value={data.software ?? ""} onChange={(v) => onChange({ ...data, software: v as AccountingData["software"] })} />
      </FormField>
      <FormField label="Accounting method">
        <SegmentedControl options={["Cash Basis", "Accrual"]} value={data.method ?? ""} onChange={(v) => onChange({ ...data, method: v as AccountingData["method"] })} />
      </FormField>
      <ChecklistSection
        title="Accounting Setup Checklist"
        items={[
          { id: "chart_accounts",    label: "Chart of accounts created" },
          { id: "bank_connected",    label: "Bank account connected to accounting software" },
          { id: "invoicing",         label: "Invoice templates created" },
          { id: "expense_categories", label: "Expense categories defined" },
          { id: "receipt_system",    label: "Receipt capture set up (Expensify, Dext)" },
          { id: "monthly_close",     label: "Monthly close process scheduled" },
          { id: "accountant",        label: "CPA / bookkeeper engaged" },
        ]}
        data={data}
        onChange={onChange}
      />
      <InfoCard icon="💡" color={COLORS.green}>
        Most small businesses use <strong>cash basis accounting</strong> — simpler and allowed by the IRS for businesses under $26M revenue. Switch to accrual if you carry inventory or plan to raise funding.
      </InfoCard>
    </StepLayout>
  );
}

// ─── 13. Federal Tax ──────────────────────────────────────────────────────────
export function FedTaxStep({ data, onChange }: StepComponentProps<FedTaxData>) {
  return (
    <StepLayout title="Federal Tax Setup" subtitle="Understand your federal tax obligations from day one to avoid penalties." icon="🦅">
      <FormField label="Federal tax election">
        <SegmentedControl
          options={["Default LLC (Pass-through)", "S-Corp Election", "C-Corp", "Sole Prop / Schedule C"]}
          value={data.fed_election ?? ""}
          onChange={(v) => onChange({ ...data, fed_election: v as FedTaxData["fed_election"] })}
        />
      </FormField>
      {data.fed_election === "S-Corp Election" && (
        <InfoCard icon="⚠️" color={COLORS.orange}>
          File Form 2553 within 75 days of formation (or by March 15 for existing entities). S-Corp requires a reasonable owner salary and running payroll.
        </InfoCard>
      )}
      <ChecklistSection
        title="Federal Tax Obligations"
        items={[
          { id: "quarterly_est", label: "Quarterly estimated payments scheduled (Apr 15, Jun 16, Sep 15, Jan 15)" },
          { id: "eftps",         label: "EFTPS account created at IRS.gov for tax deposits" },
          { id: "fica_setup",    label: "FICA (SS + Medicare) withholding set up (if hiring)" },
          { id: "form_940",      label: "FUTA (Form 940) annual unemployment tax understood" },
          { id: "1099_process",  label: "1099-NEC process for contractors >$600/year" },
          { id: "w9_collection", label: "W-9 collection process for all vendors/contractors" },
          { id: "depreciation",  label: "Section 179 / bonus depreciation strategy with CPA" },
          { id: "home_office",   label: "Home office deduction evaluated (Form 8829)" },
          { id: "qbi",           label: "QBI deduction evaluated (20% pass-through deduction)" },
        ]}
        data={data}
        onChange={onChange}
      />
      <InfoCard icon="📅" color={COLORS.red}>
        <strong>Key deadlines:</strong> Quarterly estimates: Apr 15, Jun 16, Sep 15, Jan 15. S-Corp/Partnership: Mar 15. C-Corp/Individual: Apr 15. Failure-to-pay penalty: 0.5%/month.
      </InfoCard>
      <ResourceLinks links={[
        { label: "IRS Small Business Tax Center", url: "https://www.irs.gov/businesses/small-businesses-self-employed" },
        { label: "EFTPS Enrollment", url: "https://www.eftps.gov" },
        { label: "IRS Tax Calendar for Businesses", url: "https://www.irs.gov/businesses/small-businesses-self-employed/small-business-tax-calendar" },
      ]} />
    </StepLayout>
  );
}

// ─── 14. State Tax ────────────────────────────────────────────────────────────
export function StateTaxStep({ data, onChange }: StepComponentProps<StateTaxData>) {
  return (
    <StepLayout title="State Tax Setup" subtitle="Every state has different tax types, rates, and filing requirements." icon="🏠">
      <FormField label="Operating state(s)">
        <TextInput value={data.op_states ?? ""} onChange={(v) => onChange({ ...data, op_states: v })} placeholder="e.g. California, Texas, New York" />
      </FormField>
      <ChecklistSection
        title="State Tax Obligations"
        items={[
          { id: "state_income",     label: "State income / franchise tax registration" },
          { id: "sales_tax_permit", label: "Sales tax permit obtained (if selling taxable goods/services)" },
          { id: "sales_tax_nexus",  label: "Economic nexus evaluated in all states you sell into ($100K or 200 transactions)" },
          { id: "state_payroll",    label: "State payroll tax registration (if hiring)" },
          { id: "suta",             label: "SUTA (state unemployment) account opened" },
          { id: "state_quarterly",  label: "State estimated tax payments scheduled" },
          { id: "local_taxes",      label: "Local / city taxes evaluated (NYC, Philadelphia, etc.)" },
          { id: "no_income_tax",    label: "No-state-income-tax strategy evaluated (WY, TX, FL, NV, WA, SD)" },
        ]}
        data={data}
        onChange={onChange}
      />
      <InfoCard icon="🛒" color={COLORS.teal}>
        <strong>Sales tax is complex.</strong> After <em>South Dakota v. Wayfair (2018)</em>, you may owe sales tax in states where you exceed $100K in sales OR 200 transactions — even with no physical presence.
      </InfoCard>
      <ResourceLinks links={[
        { label: "TaxJar Sales Tax Guide by State", url: "https://www.taxjar.com/states/" },
        { label: "Avalara Economic Nexus Guide", url: "https://www.avalara.com/us/en/learn/sales-tax/economic-nexus.html" },
        { label: "Streamlined Sales Tax Project", url: "https://www.streamlinedsalestax.org" },
      ]} />
    </StepLayout>
  );
}

// ─── 15. Payroll ─────────────────────────────────────────────────────────────
export function PayrollStep({ data, onChange }: StepComponentProps<PayrollData>) {
  return (
    <StepLayout title="Payroll Setup" subtitle="Set up payroll correctly from the first hire to stay compliant." icon="💸">
      <FormField label="Payroll software">
        <SegmentedControl options={["Gusto", "ADP", "Paychex", "Rippling", "DIY"]} value={data.payroll_sw ?? ""} onChange={(v) => onChange({ ...data, payroll_sw: v as PayrollData["payroll_sw"] })} />
      </FormField>
      <ChecklistSection
        title="Payroll Setup Checklist"
        items={[
          { id: "ein_payroll",      label: "EIN registered with IRS for payroll deposits" },
          { id: "i9_w4",            label: "I-9 and W-4 forms collected from all employees" },
          { id: "state_new_hire",   label: "New hire reporting to state (required within days of hire)" },
          { id: "workers_comp",     label: "Workers' compensation insurance obtained" },
          { id: "pay_frequency",    label: "Pay frequency set (bi-weekly is most common)" },
          { id: "direct_deposit",   label: "Direct deposit set up for all employees" },
          { id: "401k",             label: "Retirement plan evaluated (SIMPLE IRA, Solo 401k, SEP-IRA)" },
          { id: "health_benefits",  label: "Health insurance / benefits evaluated" },
        ]}
        data={data}
        onChange={onChange}
      />
      <InfoCard icon="💡" color={COLORS.green}>
        <strong>Gusto</strong> handles federal/state tax filings, W-2s, 1099s, new hire reporting, and benefits starting at ~$40/mo. It's the top-rated payroll service for small businesses in the US.
      </InfoCard>
    </StepLayout>
  );
}

// ─── 16. Funding ─────────────────────────────────────────────────────────────
export function FundingStep({ data, onChange }: StepComponentProps<FundingData>) {
  const sources = [
    { id: "bootstrap",      label: "Bootstrapping",        icon: "💪", desc: "Self-funded — full control" },
    { id: "friends_family", label: "Friends & Family",     icon: "👨‍👩‍👧", desc: "Informal loans or equity" },
    { id: "sba_loan",       label: "SBA Loan",             icon: "🏛️", desc: "Gov-backed, low rates, up to $5M" },
    { id: "bank_loan",      label: "Bank / Credit Union",  icon: "🏦", desc: "Term loans, lines of credit" },
    { id: "microloan",      label: "Microloan",            icon: "🌱", desc: "SBA up to $50K, community lenders" },
    { id: "angel",          label: "Angel Investment",     icon: "😇", desc: "High-net-worth individual equity" },
    { id: "vc",             label: "Venture Capital",      icon: "🚀", desc: "Institutional equity for high-growth" },
    { id: "crowdfunding",   label: "Crowdfunding",         icon: "🎯", desc: "Kickstarter, Wefunder, Republic" },
    { id: "grants",         label: "Grants",               icon: "🎁", desc: "SBIR, state grants, nonprofit grants" },
    { id: "revenue",        label: "Revenue-Based",        icon: "📊", desc: "Clearco, Pipe — repay as % of revenue" },
  ] as const;

  return (
    <StepLayout title="Funding Strategy" subtitle="Choose the right capital sources for your stage and growth goals." icon="🚀">
      <FormField label="Funding sources (select all that apply)">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {sources.map((s) => (
            <MultiSelectCard
              key={s.id}
              selected={(data.funding_sources ?? []).includes(s.id)}
              onClick={() => {
                const curr = data.funding_sources ?? [];
                const next = curr.includes(s.id)
                  ? curr.filter((x) => x !== s.id)
                  : [...curr, s.id];
                onChange({ ...data, funding_sources: next });
              }}
            >
              <span style={{ fontSize: 20, flexShrink: 0 }}>{s.icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: COLORS.gray5 }}>{s.desc}</div>
              </div>
            </MultiSelectCard>
          ))}
        </div>
      </FormField>
      <FormField label="Target funding amount">
        <TextInput value={data.target_amount ?? ""} onChange={(v) => onChange({ ...data, target_amount: v })} placeholder="e.g. $50,000" />
      </FormField>
      <FormField label="Use of funds">
        <TextArea value={data.use_of_funds ?? ""} onChange={(v) => onChange({ ...data, use_of_funds: v })} placeholder="e.g. 40% inventory, 30% marketing, 20% hiring, 10% equipment" rows={2} />
      </FormField>
      <InfoCard icon="🏛️" color={COLORS.blue}>
        SBA 7(a) loans offer the best rates for main-street businesses — prime +2.75%, up to $5M. Apply through an SBA preferred lender. SCORE provides free mentoring to navigate the process.
      </InfoCard>
      <ResourceLinks links={[
        { label: "SBA Loan Programs", url: "https://www.sba.gov/funding-programs/loans" },
        { label: "SCORE Free Mentoring", url: "https://www.score.org" },
        { label: "Grants.gov Federal Grants", url: "https://www.grants.gov" },
        { label: "AngelList / Wellfound", url: "https://www.wellfound.com" },
      ]} />
    </StepLayout>
  );
}

// ─── 17. Domain ──────────────────────────────────────────────────────────────
export function DomainStep({ data, onChange }: StepComponentProps<DomainData>) {
  const { check, loading, result, reset } = useDomainCheck();

  return (
    <StepLayout title="Domain Selection" subtitle="Your domain is your digital address. Own it before someone else does." icon="🔗">
      <FormField label="Preferred domain name">
        <div style={{ display: "flex", gap: 8 }}>
          <TextInput
            value={data.domain_name ?? ""}
            onChange={(v) => { onChange({ ...data, domain_name: v }); reset(); }}
            placeholder="e.g. acmesolutions (no .com needed)"
          />
          <AppleButton
            variant="secondary"
            onClick={() => check(data.domain_name ?? "")}
            loading={loading}
            disabled={!data.domain_name || data.domain_name.length < 2}
            style={{ flexShrink: 0 }}
          >
            Check
          </AppleButton>
        </div>
      </FormField>

      {result && (
        <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${COLORS.sep}`, marginBottom: 16 }}>
          {result.results.map((r, i) => (
            <div
              key={r.tld}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "11px 14px",
                backgroundColor: i % 2 === 0 ? COLORS.surface : COLORS.bg,
                borderBottom: i < result.results.length - 1 ? `1px solid ${COLORS.sep}` : "none",
              }}
            >
              <span style={{ flex: 1, fontWeight: 500, fontSize: 14 }}>
                {result.baseDomain}{r.tld}
              </span>
              <span style={{ fontSize: 12, color: COLORS.gray5, marginRight: 12 }}>{r.price}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: r.available ? COLORS.green : r.available === null ? COLORS.gray5 : COLORS.red }}>
                {r.available === null ? "Unknown" : r.available ? "✓ Available" : "✗ Taken"}
              </span>
            </div>
          ))}
        </div>
      )}

      <ChecklistSection
        title="Domain Strategy"
        items={[
          { id: "dot_com",           label: ".com registered (primary — most trusted TLD)" },
          { id: "alt_tlds",          label: "Alternative TLDs registered (.co, .net) to block competitors" },
          { id: "privacy_protection", label: "WHOIS privacy protection enabled" },
          { id: "auto_renew",        label: "Auto-renew ON — never let your domain expire" },
          { id: "email_domain",      label: "Custom email set up (you@yourbusiness.com via Google Workspace)" },
          { id: "subdomains",        label: "Subdomain strategy planned (app., shop., blog.)" },
        ]}
        data={data}
        onChange={onChange}
      />
      <InfoCard icon="💡" color={COLORS.teal}>
        Register at <strong>Cloudflare Registrar</strong> (at-cost, no markup) or <strong>Namecheap</strong>. If your .com is taken, try adding: "get", "use", "the", "hq", your city, or an industry suffix.
      </InfoCard>
      <ResourceLinks links={[
        { label: "Cloudflare Registrar (at-cost)", url: "https://www.cloudflare.com/products/registrar/" },
        { label: "Namecheap", url: "https://www.namecheap.com" },
        { label: "Instant Domain Search", url: "https://instantdomainsearch.com" },
        { label: "Lean Domain Search", url: "https://leandomainsearch.com" },
      ]} />
    </StepLayout>
  );
}

// ─── 18. Website ─────────────────────────────────────────────────────────────
export function WebsiteStep({ data, onChange }: StepComponentProps<WebsiteData>) {
  const platforms = [
    { id: "wordpress",  name: "WordPress",        icon: "📝", best: "Content-heavy, full control, plugins",  cost: "$5–20/mo hosting" },
    { id: "shopify",    name: "Shopify",           icon: "🛒", best: "E-commerce first",                      cost: "$29–299/mo" },
    { id: "webflow",    name: "Webflow",           icon: "🎨", best: "Design-heavy, no-code CMS",             cost: "$14–36/mo" },
    { id: "squarespace", name: "Squarespace",      icon: "⬛", best: "Creative, portfolio, easy setup",        cost: "$16–49/mo" },
    { id: "wix",        name: "Wix",               icon: "🔷", best: "Fastest to launch, drag & drop",        cost: "$17–35/mo" },
    { id: "nextjs",     name: "Next.js + Vercel",  icon: "⚡", best: "Developer-built, ultimate performance", cost: "$0–20/mo" },
    { id: "framer",     name: "Framer",            icon: "🖼️", best: "Stunning marketing sites, animations",  cost: "$15–30/mo" },
  ] as const;

  return (
    <StepLayout title="Website Creation" subtitle="Your website is your 24/7 salesperson and primary credibility signal." icon="💻">
      <FormField label="Website platform">
        <div style={{ display: "grid", gap: 8, marginBottom: 4 }}>
          {platforms.map((p) => (
            <SelectCard key={p.id} selected={data.platform === p.id} onClick={() => onChange({ ...data, platform: p.id })}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{p.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: COLORS.gray5 }}>{p.best}</div>
                </div>
                <div style={{ fontSize: 12, color: COLORS.blue, fontWeight: 600, flexShrink: 0 }}>{p.cost}</div>
              </div>
            </SelectCard>
          ))}
        </div>
      </FormField>
      <ChecklistSection
        title="Website Launch Essentials"
        items={[
          { id: "homepage",       label: "Homepage with clear value proposition (above fold)" },
          { id: "about",          label: "About page (story, team, credibility)" },
          { id: "services",       label: "Products/Services page with pricing" },
          { id: "contact",        label: "Contact page (form, phone, address, map)" },
          { id: "privacy_policy", label: "Privacy Policy (required for GDPR/CCPA compliance)" },
          { id: "terms",          label: "Terms of Service" },
          { id: "ssl",            label: "SSL certificate active (https:// — free via Let's Encrypt)" },
          { id: "mobile",         label: "Mobile-responsive design tested on real devices" },
          { id: "speed",          label: "Core Web Vitals passing (LCP, FID, CLS)" },
          { id: "analytics",      label: "Google Analytics 4 installed and verified" },
          { id: "search_console", label: "Google Search Console verified" },
          { id: "sitemap",        label: "XML sitemap submitted to Google" },
        ]}
        data={data}
        onChange={onChange}
      />
      <InfoCard icon="🚀" color={COLORS.blue}>
        Launch a simple MVP in 48 hours and iterate. A 1-second page load delay reduces conversions by 7%. Prioritize speed, mobile, and a single clear call-to-action.
      </InfoCard>
    </StepLayout>
  );
}

// ─── 19. SEO ─────────────────────────────────────────────────────────────────
export function SEOStep({ data, onChange }: StepComponentProps<SEOData>) {
  return (
    <StepLayout title="SEO Strategy" subtitle="Get found organically on Google — the highest long-term ROI marketing channel." icon="📈">
      <FormField label="Primary target keywords (top 5)">
        {[0, 1, 2, 3, 4].map((i) => (
          <TextInput
            key={i}
            value={(data.keywords ?? [])[i] ?? ""}
            onChange={(v) => {
              const k = [...(data.keywords ?? ["", "", "", "", ""])];
              k[i] = v;
              onChange({ ...data, keywords: k });
            }}
            placeholder={`Keyword ${i + 1} — e.g. "best accounting software for startups"`}
            style={{ marginBottom: 8 }}
          />
        ))}
      </FormField>
      <ChecklistSection title="Technical SEO" items={[
        { id: "title_tags",       label: "Unique title tags (50–60 chars) on all pages" },
        { id: "meta_desc",        label: "Meta descriptions (150–160 chars) on all pages" },
        { id: "h1_h2",            label: "Proper H1/H2 heading hierarchy" },
        { id: "schema",           label: "Schema markup (LocalBusiness, Product, FAQ)" },
        { id: "core_web_vitals",  label: "Core Web Vitals pass (LCP <2.5s, INP <200ms, CLS <0.1)" },
        { id: "mobile_friendly",  label: "Mobile-friendly test passed (search.google.com)" },
        { id: "robots_txt",       label: "robots.txt configured correctly" },
        { id: "canonical",        label: "Canonical tags to prevent duplicate content" },
        { id: "404_redirects",    label: "404 errors fixed, redirects (301) in place" },
      ]} data={data} onChange={onChange} />
      <ChecklistSection title="Local SEO" items={[
        { id: "gmb",       label: "Google Business Profile claimed and fully optimized" },
        { id: "bing_places", label: "Bing Places for Business set up" },
        { id: "yelp",      label: "Yelp Business claimed" },
        { id: "citations", label: "NAP (Name, Address, Phone) consistent across 50+ directories" },
        { id: "reviews",   label: "Review generation strategy in place (email, QR code)" },
      ]} data={data} onChange={onChange} />
      <ChecklistSection title="Content SEO" items={[
        { id: "blog",             label: "Blog with keyword-targeted content calendar" },
        { id: "link_building",    label: "Link building strategy (guest posts, PR, directories)" },
        { id: "content_calendar", label: "Monthly content calendar (4+ pieces/month)" },
      ]} data={data} onChange={onChange} />
      <ResourceLinks links={[
        { label: "Google Search Console", url: "https://search.google.com/search-console" },
        { label: "Google Business Profile", url: "https://business.google.com" },
        { label: "Ahrefs Free SEO Tools", url: "https://ahrefs.com/free-seo-tools" },
        { label: "Google PageSpeed Insights", url: "https://pagespeed.web.dev" },
        { label: "Semrush Keyword Research", url: "https://www.semrush.com/analytics/keywordmagic/" },
      ]} />
    </StepLayout>
  );
}

// ─── 20. Social Media ─────────────────────────────────────────────────────────
export function SocialStep({ data, onChange }: StepComponentProps<SocialData>) {
  const platforms = [
    { id: "instagram", name: "Instagram", icon: "📸", best: "Visual brands, B2C, lifestyle, products" },
    { id: "facebook",  name: "Facebook",  icon: "👥", best: "Local business, broad demographics, paid ads" },
    { id: "linkedin",  name: "LinkedIn",  icon: "💼", best: "B2B, professional services, recruiting" },
    { id: "tiktok",    name: "TikTok",    icon: "🎵", best: "Gen Z/Millennial, viral potential, video-first" },
    { id: "x",         name: "X (Twitter)", icon: "🐦", best: "Real-time, tech, SaaS, news commentary" },
    { id: "youtube",   name: "YouTube",   icon: "▶️", best: "Long-form video, tutorials, SEO value" },
    { id: "pinterest", name: "Pinterest", icon: "📌", best: "E-commerce, home, fashion, food, crafts" },
    { id: "threads",   name: "Threads",   icon: "🧵", best: "Community, text-first, Instagram audience" },
  ] as const;

  return (
    <StepLayout title="Social Media" subtitle="Build audience, drive traffic, and establish authority on the right platforms." icon="📱">
      <FormField label="Select your platforms">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {platforms.map((p) => (
            <MultiSelectCard
              key={p.id}
              selected={(data.platforms ?? []).includes(p.id)}
              onClick={() => {
                const curr = data.platforms ?? [];
                const next = curr.includes(p.id)
                  ? curr.filter((x) => x !== p.id)
                  : [...curr, p.id];
                onChange({ ...data, platforms: next });
              }}
            >
              <span style={{ fontSize: 20, flexShrink: 0 }}>{p.icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: COLORS.gray5 }}>{p.best}</div>
              </div>
            </MultiSelectCard>
          ))}
        </div>
      </FormField>
      <FormField label="Posting frequency goal">
        <SegmentedControl options={["Daily", "3x/week", "Weekly", "2x/month"]} value={data.frequency ?? ""} onChange={(v) => onChange({ ...data, frequency: v as SocialData["frequency"] })} />
      </FormField>
      <ChecklistSection title="Social Media Setup" items={[
        { id: "handles_secured",  label: "Consistent @handle secured on all selected platforms" },
        { id: "bio_optimized",    label: "Bios optimized with keywords and website link" },
        { id: "profile_photos",   label: "Professional profile photos / logos uploaded" },
        { id: "content_calendar", label: "90-day content calendar created" },
        { id: "scheduling_tool",  label: "Scheduling tool configured (Buffer, Hootsuite, Later)" },
        { id: "pixel_installed",  label: "Meta Pixel installed on website for retargeting" },
        { id: "utm_tracking",     label: "UTM parameters used for all social links" },
        { id: "community",        label: "Daily community engagement scheduled (reply to comments)" },
        { id: "analytics_tracked", label: "Monthly analytics review (reach, engagement, conversions)" },
      ]} data={data} onChange={onChange} />
      <InfoCard icon="📊" color={COLORS.purple}>
        Focus on <strong>1–2 platforms</strong> and do them well before expanding. Video content gets 3–5× more organic reach than static images in 2025. Consistency beats virality.
      </InfoCard>
    </StepLayout>
  );
}

// ─── 21. Branding ─────────────────────────────────────────────────────────────
export function BrandingStep({ data, onChange }: StepComponentProps<BrandingData>) {
  return (
    <StepLayout title="Brand Identity" subtitle="Your brand is how people feel about your business when you're not in the room." icon="🎨">
      <FormField label="Brand voice / personality">
        <SegmentedControl
          options={["Professional", "Friendly", "Bold/Edgy", "Playful", "Luxurious", "Approachable"]}
          value={data.voice ?? ""}
          onChange={(v) => onChange({ ...data, voice: v as BrandingData["voice"] })}
        />
      </FormField>
      <FormField label="Primary brand color (hex)">
        <TextInput value={data.color1 ?? ""} onChange={(v) => onChange({ ...data, color1: v })} placeholder="#007AFF" />
      </FormField>
      <FormField label="Secondary brand color (hex)">
        <TextInput value={data.color2 ?? ""} onChange={(v) => onChange({ ...data, color2: v })} placeholder="#34C759" />
      </FormField>
      <FormField label="Tagline / brand promise">
        <TextInput value={data.tagline ?? ""} onChange={(v) => onChange({ ...data, tagline: v })} placeholder='e.g. "Business made simple"' />
      </FormField>
      <ChecklistSection title="Brand Assets" items={[
        { id: "logo",           label: "Logo designed (vector: SVG, AI, EPS)" },
        { id: "color_palette",  label: "Brand color palette defined (primary, secondary, neutrals)" },
        { id: "typography",     label: "Typography system defined (heading + body fonts)" },
        { id: "brand_guide",    label: "Brand style guide documented (1-page minimum)" },
        { id: "favicon",        label: "Favicon created (32×32 and 180×180 for Apple)" },
        { id: "business_cards", label: "Business card design" },
        { id: "email_signature", label: "Professional email signature created" },
        { id: "templates",      label: "Social media templates created (Canva / Figma)" },
        { id: "photography",    label: "Brand / product photography completed" },
      ]} data={data} onChange={onChange} />
      <InfoCard icon="🎨" color={COLORS.purple}>
        Hire on <strong>99designs</strong> ($299+), <strong>Fiverr</strong> ($50–500), or <strong>Dribbble</strong>. Use <strong>Canva</strong> for ongoing content. Brand consistency across touchpoints is more important than perfection at launch.
      </InfoCard>
    </StepLayout>
  );
}

// ─── 22. Marketing ────────────────────────────────────────────────────────────
export function MarketingStep({ data, onChange }: StepComponentProps<MarketingData>) {
  const channels = [
    { id: "seo_ch",       label: "SEO / Organic",      icon: "🔍" },
    { id: "ppc",          label: "Google Ads (PPC)",   icon: "💰" },
    { id: "social_ads",   label: "Social Ads",         icon: "📱" },
    { id: "email_mktg",   label: "Email Marketing",    icon: "📧" },
    { id: "content_mktg", label: "Content Marketing",  icon: "✍️" },
    { id: "referral",     label: "Referral Program",   icon: "🤝" },
    { id: "influencer",   label: "Influencer",         icon: "⭐" },
    { id: "pr",           label: "PR / Press",         icon: "📰" },
    { id: "events",       label: "Events",             icon: "🎪" },
    { id: "partnerships", label: "Partnerships",       icon: "🤲" },
  ] as const;

  const { generate, loading, result } = useDocGeneration();

  return (
    <StepLayout title="Marketing Plan" subtitle="A systematic approach to acquiring, retaining, and growing your customer base." icon="📣">
      <FormField label="Primary marketing channels">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {channels.map((c) => (
            <MultiSelectCard
              key={c.id}
              selected={(data.channels ?? []).includes(c.id)}
              onClick={() => {
                const curr = data.channels ?? [];
                const next = curr.includes(c.id)
                  ? curr.filter((x) => x !== c.id)
                  : [...curr, c.id];
                onChange({ ...data, channels: next });
              }}
            >
              <span style={{ fontSize: 18, flexShrink: 0 }}>{c.icon}</span>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{c.label}</span>
            </MultiSelectCard>
          ))}
        </div>
      </FormField>
      <FormField label="Monthly marketing budget">
        <TextInput value={data.budget ?? ""} onChange={(v) => onChange({ ...data, budget: v })} placeholder="e.g. $500/month" />
      </FormField>
      <FormField label="Customer Acquisition Cost (CAC) target">
        <TextInput value={data.cac ?? ""} onChange={(v) => onChange({ ...data, cac: v })} placeholder="e.g. $25 per customer" />
      </FormField>
      <FormField label="Customer Lifetime Value (LTV) estimate">
        <TextInput value={data.ltv ?? ""} onChange={(v) => onChange({ ...data, ltv: v })} placeholder="e.g. $300 per customer" />
      </FormField>
      <AppleButton variant="secondary" loading={loading} onClick={() => generate("marketing_strategy", { ...data })} style={{ marginBottom: 16 }}>
        🤖 Generate AI Marketing Strategy
      </AppleButton>
      {result && (
        <div style={{ backgroundColor: COLORS.bg, borderRadius: 10, padding: 14, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: 16 }}>
          {result.content}
        </div>
      )}
      <InfoCard icon="📊" color={COLORS.orange}>
        Target a <strong>LTV:CAC ratio of 3:1 or higher.</strong> Test 2–3 channels for 90 days before doubling down. The winning channel depends entirely on your customer persona — don't assume.
      </InfoCard>
    </StepLayout>
  );
}

// ─── 23. Launch Checklist ─────────────────────────────────────────────────────
export function LaunchChecklistStep({ data, onChange }: StepComponentProps<LaunchData>) {
  const categories = [
    { name: "Legal", items: [
      { id: "entity_formed",     label: "Business entity formed and confirmed" },
      { id: "ein_obtained",      label: "EIN obtained from IRS" },
      { id: "licenses_obtained", label: "All required licenses obtained" },
      { id: "insurance",         label: "Business insurance obtained (GL, E&O, BOP)" },
      { id: "contracts_ready",   label: "Client contracts / vendor agreements ready" },
      { id: "ip_protected",      label: "IP protected (trademark filed if needed)" },
    ]},
    { name: "Financial", items: [
      { id: "bank_open",           label: "Business bank account open" },
      { id: "accounting_active",   label: "Accounting software configured and active" },
      { id: "payment_processing",  label: "Payment processing live (Stripe, Square, etc.)" },
      { id: "invoicing_ready",     label: "Invoice templates ready and tested" },
      { id: "pricing_set",         label: "Pricing finalized and published" },
      { id: "startup_funded",      label: "Startup costs funded" },
    ]},
    { name: "Digital & Marketing", items: [
      { id: "domain_live",      label: "Domain registered and DNS configured" },
      { id: "website_live",     label: "Website live, tested on mobile + desktop" },
      { id: "email_active",     label: "Professional email address active" },
      { id: "gmb_live",         label: "Google Business Profile live" },
      { id: "social_active",    label: "Social profiles active, branded, and first posts published" },
      { id: "analytics_live",   label: "Analytics tracking confirmed" },
    ]},
    { name: "Operations", items: [
      { id: "tools_setup",       label: "Core tools set up (CRM, PM, communication)" },
      { id: "processes_docs",    label: "Core processes documented (SOPs)" },
      { id: "team_ready",        label: "Team / contractors in place (if applicable)" },
      { id: "product_ready",     label: "Product / inventory ready to sell" },
      { id: "customer_service",  label: "Customer service process defined" },
      { id: "first_customer",    label: "🎉 First customer acquired!" },
    ]},
  ];

  const allItems = categories.flatMap((c) => c.items);
  const doneCount = allItems.filter((i) => data[i.id]).length;
  const pct = Math.round((doneCount / allItems.length) * 100);

  return (
    <StepLayout title="Launch Checklist" subtitle="Complete these steps and you're officially ready to open for business." icon="✅">
      {/* Progress */}
      <div style={{ backgroundColor: COLORS.fill, borderRadius: 14, padding: "16px 18px", marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>Launch Readiness</span>
          <span style={{ fontWeight: 800, fontSize: 20, color: pct === 100 ? COLORS.green : COLORS.blue }}>{pct}%</span>
        </div>
        <div style={{ height: 10, borderRadius: 5, backgroundColor: COLORS.sep, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? COLORS.green : `linear-gradient(90deg, ${COLORS.blue}, ${COLORS.purple})`, borderRadius: 5, transition: "width 0.4s ease" }} />
        </div>
        <div style={{ fontSize: 13, color: COLORS.gray5, marginTop: 8 }}>
          {doneCount} of {allItems.length} items complete
        </div>
        {pct === 100 && (
          <div style={{ textAlign: "center", marginTop: 16, fontSize: 28 }}>🎉 You're ready to launch!</div>
        )}
      </div>

      {categories.map((cat) => (
        <div key={cat.name} style={{ marginBottom: 20 }}>
          <SectionHeader>{cat.name}</SectionHeader>
          <div style={{ backgroundColor: COLORS.surface, borderRadius: 12, overflow: "hidden", border: `1px solid ${COLORS.sep}` }}>
            {cat.items.map((item, i) => (
              <div
                key={item.id}
                onClick={() => onChange({ ...data, [item.id]: !data[item.id] })}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  cursor: "pointer",
                  borderBottom: i < cat.items.length - 1 ? `1px solid ${COLORS.sep}` : "none",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = COLORS.bg; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${data[item.id] ? COLORS.blue : COLORS.sep}`, backgroundColor: data[item.id] ? COLORS.blue : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                  {data[item.id] && <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>✓</span>}
                </div>
                <span style={{ fontSize: 14, textDecoration: data[item.id] ? "line-through" : "none", color: data[item.id] ? COLORS.gray5 : COLORS.gray1 }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </StepLayout>
  );
}
