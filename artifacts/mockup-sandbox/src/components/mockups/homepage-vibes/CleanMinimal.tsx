import React from "react";
import { 
  BookOpen, 
  Calculator, 
  Building2, 
  Phone, 
  BarChart3, 
  Search, 
  LayoutTemplate, 
  ShieldCheck, 
  Cloud, 
  Users,
  ArrowRight,
  ChevronRight
} from "lucide-react";

const MODULES = [
  {
    name: "Bookkeeping",
    description: "Automated ledger management and reconciliation.",
    icon: BookOpen,
  },
  {
    name: "Payroll",
    description: "Seamless payroll processing and tax compliance.",
    icon: Calculator,
  },
  {
    name: "BizForma",
    description: "Entity formation and ongoing compliance tracking.",
    icon: Building2,
  },
  {
    name: "PBX",
    description: "Cloud-native business phone system and IVR.",
    icon: Phone,
  },
  {
    name: "Reports",
    description: "Real-time financial analytics and forecasting.",
    icon: BarChart3,
  },
  {
    name: "Scout",
    description: "AI-driven insights and anomaly detection.",
    icon: Search,
  },
  {
    name: "White Label",
    description: "Custom branding for accounting firms.",
    icon: LayoutTemplate,
  },
];

export function CleanMinimal() {
  return (
    <div className="min-h-screen bg-white font-['Inter',sans-serif] text-[#1C2333] selection:bg-[#3B5BDB] selection:text-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#1C2333] rounded-sm flex items-center justify-center">
              <div className="w-3 h-3 border-2 border-white rounded-full"></div>
            </div>
            <span className="font-semibold tracking-tight text-lg">InsightHunter</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500">
            <a href="#" className="hover:text-[#1C2333] transition-colors">Features</a>
            <a href="#" className="hover:text-[#1C2333] transition-colors">Pricing</a>
            <a href="#" className="hover:text-[#1C2333] transition-colors">About</a>
          </div>

          <div className="flex items-center gap-4">
            <a href="#" className="text-sm font-medium text-slate-500 hover:text-[#1C2333] transition-colors hidden sm:block">Log in</a>
            <button className="bg-[#3B5BDB] hover:bg-[#2A44A8] text-white text-sm font-medium px-4 py-2 rounded transition-colors">
              Start Free
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-[#1C2333] leading-[1.1] mb-6">
            Stop flying blind.<br />
            <span className="text-[#3B5BDB]">Know your numbers.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            The precise, AI-powered financial platform that gives small businesses absolute clarity over their operations, without the noise.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="w-full sm:w-auto bg-[#3B5BDB] hover:bg-[#2A44A8] text-white font-medium px-6 py-3 rounded flex items-center justify-center gap-2 transition-colors">
              Start your free trial <ArrowRight className="w-4 h-4" />
            </button>
            <button className="w-full sm:w-auto bg-white border border-[#E2E8F0] hover:border-[#1C2333] text-[#1C2333] font-medium px-6 py-3 rounded transition-colors">
              Book a demo
            </button>
          </div>
        </div>
      </section>

      {/* Social Proof Strip */}
      <div className="border-y border-[#E2E8F0] bg-[#F8F9FA] py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 text-sm font-medium text-slate-500">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#3B5BDB]" />
            <span>Trusted by 500+ businesses</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#3B5BDB]" />
            <span>SOC 2 Type II Ready</span>
          </div>
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-[#3B5BDB]" />
            <span>Cloudflare-native infrastructure</span>
          </div>
        </div>
      </div>

      {/* Module Grid */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-[#1C2333] mb-4">Everything you need. Nothing you don't.</h2>
            <p className="text-slate-500 text-lg">Seven powerful modules, unified in one crisp interface.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MODULES.map((module, i) => (
              <div 
                key={i} 
                className="group p-6 rounded-lg border border-[#E2E8F0] bg-white hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:border-[#3B5BDB]/30 transition-all duration-300"
              >
                <div className="w-10 h-10 rounded bg-[#F8F9FA] border border-[#E2E8F0] flex items-center justify-center mb-6 group-hover:bg-[#3B5BDB] group-hover:border-[#3B5BDB] transition-colors">
                  <module.icon className="w-5 h-5 text-[#1C2333] group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-lg font-semibold text-[#1C2333] mb-2">{module.name}</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-6">{module.description}</p>
                <div className="flex items-center text-sm font-medium text-[#3B5BDB] opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                  Explore module <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="py-24 px-6 bg-[#F8F9FA] border-t border-[#E2E8F0]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[#1C2333] mb-6">Ready for clarity?</h2>
          <p className="text-slate-500 mb-10">Join hundreds of businesses that have stopped guessing and started knowing.</p>
          <button className="bg-[#3B5BDB] hover:bg-[#2A44A8] text-white font-medium px-8 py-4 rounded-md transition-colors shadow-sm">
            Start your 14-day free trial
          </button>
          <p className="text-xs text-slate-400 mt-4">No credit card required. Setup takes 3 minutes.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E2E8F0] bg-white py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-[#1C2333] rounded-sm flex items-center justify-center">
              <div className="w-2.5 h-2.5 border-2 border-white rounded-full"></div>
            </div>
            <span className="font-semibold tracking-tight text-sm text-[#1C2333]">InsightHunter</span>
            <span className="text-slate-400 text-sm ml-2">© {new Date().getFullYear()}</span>
          </div>
          
          <div className="flex gap-6 text-sm text-slate-500">
            <a href="#" className="hover:text-[#1C2333]">Terms</a>
            <a href="#" className="hover:text-[#1C2333]">Privacy</a>
            <a href="#" className="hover:text-[#1C2333]">Security</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
