import React from "react";
import { 
  BarChart3, 
  Banknote, 
  FileSignature, 
  Phone, 
  LineChart, 
  Search, 
  Layers,
  CheckCircle2,
  ArrowRight
} from "lucide-react";

export function SidebarNav() {
  const modules = [
    {
      name: "Bookkeeping",
      description: "AI-automated ledger & reconciliation.",
      icon: <BarChart3 className="w-5 h-5 text-[#C9A84C]" />
    },
    {
      name: "Payroll",
      description: "Seamless payments & tax compliance.",
      icon: <Banknote className="w-5 h-5 text-[#C9A84C]" />
    },
    {
      name: "BizForma",
      description: "Business formation & compliance.",
      icon: <FileSignature className="w-5 h-5 text-[#C9A84C]" />
    },
    {
      name: "PBX",
      description: "Cloud phone system & routing.",
      icon: <Phone className="w-5 h-5 text-[#C9A84C]" />
    },
    {
      name: "Reports",
      description: "Advanced financial modeling.",
      icon: <LineChart className="w-5 h-5 text-[#C9A84C]" />
    },
    {
      name: "Scout",
      description: "Market intelligence & discovery.",
      icon: <Search className="w-5 h-5 text-[#C9A84C]" />
    },
    {
      name: "White Label",
      description: "Custom branding for agencies.",
      icon: <Layers className="w-5 h-5 text-[#C9A84C]" />
    }
  ];

  return (
    <div className="flex min-h-screen font-sans text-slate-300" style={{ backgroundColor: "#0B1220" }}>
      {/* Sidebar Rail */}
      <div 
        className="w-[220px] fixed top-0 left-0 h-screen flex flex-col border-r border-slate-800 z-10"
        style={{ backgroundColor: "#111827" }}
      >
        {/* Logo */}
        <div className="p-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#C9A84C] flex items-center justify-center">
              <div className="w-2 h-2 bg-[#0B1220] rounded-full" />
            </div>
            <span className="text-white font-bold tracking-tight">InsightHunter</span>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-4 py-4 space-y-1">
          <a href="#" className="block px-3 py-2 text-sm font-medium text-white bg-slate-800/50 rounded-md">
            Features
          </a>
          <a href="#" className="block px-3 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-md transition-colors">
            Pricing
          </a>
          <a href="#" className="block px-3 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-md transition-colors">
            About
          </a>
          <a href="#" className="block px-3 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-md transition-colors">
            Customers
          </a>
        </nav>

        {/* Bottom CTA */}
        <div className="p-4 border-t border-slate-800">
          <button className="w-full py-2 px-4 bg-[#C9A84C] hover:bg-[#b5953e] text-[#0B1220] font-semibold text-sm rounded-full transition-colors flex justify-center items-center gap-2">
            Start Free
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="ml-[220px] flex-1 flex flex-col min-w-0">
        <main className="flex-1">
          {/* Hero Section */}
          <div className="pt-24 pb-16 px-8 max-w-5xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700 text-xs font-medium text-[#C9A84C] mb-6">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>AI-Powered Financial OS</span>
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tight mb-6">
              Stop Flying Blind.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C9A84C] to-amber-200">
                Know Your Numbers.
              </span>
            </h1>
            
            <p className="text-lg text-slate-400 max-w-2xl mb-10 leading-relaxed">
              The unified financial operating system for small businesses. Bookkeeping, payroll, and compliance—automated by AI, visible in real-time.
            </p>
            
            <div className="flex items-center gap-4">
              <button className="px-6 py-3 bg-white text-[#0B1220] font-semibold rounded hover:bg-slate-100 transition-colors">
                Book a Demo
              </button>
              <button className="px-6 py-3 border border-slate-700 text-white font-medium rounded hover:bg-slate-800 transition-colors flex items-center gap-2">
                Explore Platform <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Social Proof */}
            <div className="mt-16 flex flex-wrap items-center gap-6 text-sm text-slate-500 font-medium">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                500+ Businesses
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                Cloudflare-Native
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                SOC 2 Ready
              </div>
            </div>
          </div>

          {/* Modules Section */}
          <div className="px-8 py-16 border-t border-slate-800/50 bg-[#0c1424]">
            <div className="max-w-5xl">
              <h2 className="text-xl font-semibold text-white mb-8">Platform Modules</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {modules.map((mod) => (
                  <div 
                    key={mod.name}
                    className="p-5 rounded-lg border border-slate-800 bg-slate-900/30 hover:bg-slate-800/50 hover:border-slate-700 transition-all cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded bg-[#0B1220] border border-slate-800 flex items-center justify-center mb-4 group-hover:border-[#C9A84C]/30 transition-colors">
                      {mod.icon}
                    </div>
                    <h3 className="text-base font-semibold text-white mb-1">{mod.name}</h3>
                    <p className="text-sm text-slate-400">{mod.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CTA Banner */}
          <div className="px-8 py-20 bg-gradient-to-br from-[#111827] to-[#0B1220] border-t border-slate-800">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-bold text-white mb-4">Ready to take control?</h2>
              <p className="text-slate-400 mb-8 text-lg">Join hundreds of growing businesses that have automated their financial operations with InsightHunter.</p>
              <button className="px-8 py-4 bg-[#C9A84C] text-[#0B1220] font-bold rounded hover:bg-[#b5953e] transition-colors text-lg">
                Start Your Free Trial
              </button>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="px-8 py-8 border-t border-slate-800 text-sm text-slate-500 flex justify-between items-center">
          <p>© 2024 InsightHunter Inc. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-slate-300">Privacy</a>
            <a href="#" className="hover:text-slate-300">Terms</a>
            <a href="#" className="hover:text-slate-300">System Status</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
