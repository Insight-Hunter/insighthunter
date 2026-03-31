// src/types/index.ts
// ─── Core Domain Types ────────────────────────────────────────────────────────

export interface Phase {
  id: string;
  icon: string;
  label: string;
  color: string;
  steps: StepMeta[];
}

export interface StepMeta {
  id: string;
  label: string;
  icon: string;
}

export interface StepWithPhase extends StepMeta {
  phase: string;
  phaseColor: string;
}

// ─── Form Data Types (per step) ───────────────────────────────────────────────

export interface IdeaData {
  problem?: string;
  solution?: string;
  customers?: string;
  revenue?: string;
}

export interface MarketData {
  industry?: string;
  tam?: string;
  competitors?: string[];
  usp?: string;
}

export interface BusinessModelData {
  value_prop?: string;
  channels?: string;
  customer_rel?: string;
  revenue_streams?: string;
  key_resources?: string;
  key_activities?: string;
  key_partners?: string;
  cost_structure?: string;
}

export interface NameData {
  name?: string;
  alternatives?: string[];
  dba?: string;
}

export interface StructureData {
  structure?: EntityType;
  state?: string;
}

export interface StateRegData {
  articles_drafted?: boolean;
  filing_fee_paid?: boolean;
  sos_filed?: boolean;
  confirmation_received?: boolean;
  foreign_qualification?: boolean;
  filing_url?: string;
  formation_date?: string;
  annual_report_date?: string;
}

export interface EINData {
  irs_online?: boolean;
  ss4_filed?: boolean;
  ein_received?: boolean;
  ein_stored?: boolean;
  ein?: string;
}

export interface LicensesData {
  business_license?: boolean;
  professional_license?: boolean;
  seller_permit?: boolean;
  dba_filing?: boolean;
  zoning?: boolean;
  health_permit?: boolean;
  federal_license?: boolean;
  ein_labor?: boolean;
  specific_licenses?: string;
}

export interface RegisteredAgentData {
  agent_type?: AgentType;
  agent_name?: string;
  agent_address?: string;
  agent_designated?: boolean;
  agent_available?: boolean;
  agent_annual?: boolean;
}

export interface OperatingData {
  ownership_defined?: boolean;
  voting_rights?: boolean;
  profit_distribution?: boolean;
  management_structure?: boolean;
  buyout_provisions?: boolean;
  dissolution_process?: boolean;
  signed_notarized?: boolean;
  stored_safely?: boolean;
  member_count?: string;
  mgmt_type?: ManagementType;
}

export interface BankData {
  bank_selected?: boolean;
  ein_ready?: boolean;
  formation_docs?: boolean;
  account_opened?: boolean;
  savings_opened?: boolean;
  credit_card?: boolean;
  zelle_setup?: boolean;
  bank_name?: string;
  tax_reserve?: string;
}

export interface AccountingData {
  software?: AccountingSoftware;
  method?: AccountingMethod;
  chart_accounts?: boolean;
  bank_connected?: boolean;
  invoicing?: boolean;
  expense_categories?: boolean;
  receipt_system?: boolean;
  monthly_close?: boolean;
  accountant?: boolean;
}

export interface FedTaxData {
  fed_election?: FedTaxElection;
  quarterly_est?: boolean;
  eftps?: boolean;
  fica_setup?: boolean;
  form_940?: boolean;
  "1099_process"?: boolean;
  w9_collection?: boolean;
  depreciation?: boolean;
  home_office?: boolean;
  qbi?: boolean;
}

export interface StateTaxData {
  op_states?: string;
  state_income?: boolean;
  sales_tax_permit?: boolean;
  sales_tax_nexus?: boolean;
  state_payroll?: boolean;
  suta?: boolean;
  state_quarterly?: boolean;
  local_taxes?: boolean;
  no_income_tax?: boolean;
}

export interface PayrollData {
  payroll_sw?: PayrollSoftware;
  ein_payroll?: boolean;
  i9_w4?: boolean;
  state_new_hire?: boolean;
  workers_comp?: boolean;
  pay_frequency?: boolean;
  direct_deposit?: boolean;
  "401k"?: boolean;
  health_benefits?: boolean;
}

export interface FundingData {
  funding_sources?: FundingSource[];
  target_amount?: string;
  use_of_funds?: string;
}

export interface DomainData {
  domain_name?: string;
  dot_com?: boolean;
  alt_tlds?: boolean;
  privacy_protection?: boolean;
  auto_renew?: boolean;
  email_domain?: boolean;
  subdomains?: boolean;
}

export interface WebsiteData {
  platform?: WebsitePlatform;
  homepage?: boolean;
  about?: boolean;
  services?: boolean;
  contact?: boolean;
  privacy_policy?: boolean;
  terms?: boolean;
  ssl?: boolean;
  mobile?: boolean;
  speed?: boolean;
  analytics?: boolean;
  search_console?: boolean;
  sitemap?: boolean;
}

export interface SEOData {
  keywords?: string[];
  title_tags?: boolean;
  meta_desc?: boolean;
  h1_h2?: boolean;
  schema?: boolean;
  core_web_vitals?: boolean;
  mobile_friendly?: boolean;
  robots_txt?: boolean;
  canonical?: boolean;
  "404_redirects"?: boolean;
  gmb?: boolean;
  bing_places?: boolean;
  yelp?: boolean;
  citations?: boolean;
  reviews?: boolean;
  blog?: boolean;
  link_building?: boolean;
  content_calendar?: boolean;
}

export interface SocialData {
  platforms?: SocialPlatform[];
  frequency?: PostingFrequency;
  handles_secured?: boolean;
  bio_optimized?: boolean;
  profile_photos?: boolean;
  content_calendar?: boolean;
  scheduling_tool?: boolean;
  pixel_installed?: boolean;
  utm_tracking?: boolean;
  community?: boolean;
  analytics_tracked?: boolean;
}

export interface BrandingData {
  voice?: BrandVoice;
  color1?: string;
  color2?: string;
  tagline?: string;
  logo?: boolean;
  color_palette?: boolean;
  typography?: boolean;
  brand_guide?: boolean;
  favicon?: boolean;
  business_cards?: boolean;
  email_signature?: boolean;
  templates?: boolean;
  photography?: boolean;
}

export interface MarketingData {
  channels?: MarketingChannel[];
  budget?: string;
  cac?: string;
  ltv?: string;
}

export interface LaunchData {
  [key: string]: boolean | undefined;
}

export type StepData =
  | IdeaData | MarketData | BusinessModelData | NameData | StructureData
  | StateRegData | EINData | LicensesData | RegisteredAgentData | OperatingData
  | BankData | AccountingData | FedTaxData | StateTaxData | PayrollData | FundingData
  | DomainData | WebsiteData | SEOData | SocialData | BrandingData | MarketingData | LaunchData;

export type FormData = Record<string, StepData>;

// ─── Enum-like String Unions ──────────────────────────────────────────────────

export type EntityType =
  | "sole_prop" | "llc" | "s_corp" | "c_corp" | "nonprofit" | "partnership";

export type AgentType =
  | "Myself / Owner" | "Attorney/CPA" | "Registered Agent Service";

export type ManagementType = "Member-Managed" | "Manager-Managed";

export type AccountingSoftware =
  | "QuickBooks" | "Xero" | "Wave (free)" | "FreshBooks" | "Bench";

export type AccountingMethod = "Cash Basis" | "Accrual";

export type FedTaxElection =
  | "Default LLC (Pass-through)" | "S-Corp Election" | "C-Corp" | "Sole Prop / Schedule C";

export type PayrollSoftware = "Gusto" | "ADP" | "Paychex" | "Rippling" | "DIY";

export type FundingSource =
  | "bootstrap" | "friends_family" | "sba_loan" | "bank_loan" | "microloan"
  | "angel" | "vc" | "crowdfunding" | "grants" | "revenue";

export type WebsitePlatform =
  | "wordpress" | "shopify" | "webflow" | "squarespace" | "wix" | "nextjs" | "framer";

export type SocialPlatform =
  | "instagram" | "facebook" | "linkedin" | "tiktok" | "x" | "youtube" | "pinterest" | "threads";

export type PostingFrequency = "Daily" | "3x/week" | "Weekly" | "2x/month";

export type BrandVoice =
  | "Professional" | "Friendly" | "Bold/Edgy" | "Playful" | "Luxurious" | "Approachable";

export type MarketingChannel =
  | "seo_ch" | "ppc" | "social_ads" | "email_mktg" | "content_mktg"
  | "referral" | "influencer" | "pr" | "events" | "partnerships";

// ─── API Types ────────────────────────────────────────────────────────────────

export interface NameCheckResponse {
  name: string;
  available: boolean;
  similarNames: string[];
  cached: boolean;
}

export interface DomainResult {
  domain: string;
  tld: string;
  available: boolean | null;
  registrar: string;
  price: string;
}

export interface DomainCheckResponse {
  baseDomain: string;
  results: DomainResult[];
}

export interface TaxDeadline {
  date: string;
  label: string;
  category: "federal" | "payroll" | "state";
  form: string;
  priority: "critical" | "high" | "medium" | "low";
}

export interface GeneratedDoc {
  docType: string;
  content: string;
}

export interface ProgressResponse {
  found: boolean;
  sessionId?: string;
  businessName?: string;
  data?: FormData;
  updatedAt?: string;
}

export interface Resource {
  label: string;
  url: string;
  type: string;
}

// ─── UI Component Prop Types ──────────────────────────────────────────────────

export interface StepLayoutProps {
  title: string;
  subtitle: string;
  icon: string;
  children: React.ReactNode;
}

export interface FormFieldProps {
  label: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  style?: React.CSSProperties;
  maxLength?: number;
  min?: string;
  disabled?: boolean;
}

export interface TextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

export interface SegmentedControlProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

export interface SelectCardProps {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export interface AppleButtonProps {
  variant?: "primary" | "secondary" | "destructive";
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  style?: React.CSSProperties;
}

export interface InfoCardProps {
  icon: string;
  color: string;
  children: React.ReactNode;
}

export interface ChecklistItem {
  id: string;
  label: string;
}

export interface ChecklistSectionProps {
  title?: string;
  items: ChecklistItem[];
  data: Record<string, boolean | undefined>;
  onChange: (data: Record<string, boolean | undefined>) => void;
}

export interface CheckRowProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  style?: React.CSSProperties;
}

export interface ResourceLinksProps {
  links: Array<{ label: string; url: string }>;
}

export interface StateSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export interface StepComponentProps<T extends StepData = StepData> {
  data: T;
  onChange: (data: T) => void;
}

export interface StatusBadgeProps {
  color: string;
  children: React.ReactNode;
}
