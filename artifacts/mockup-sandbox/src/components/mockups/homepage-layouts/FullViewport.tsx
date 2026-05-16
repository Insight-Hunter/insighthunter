import React from "react";
import { ArrowRight, ChevronDown, CheckCircle2, Shield, Zap, BookOpen, Banknote, Building2, Phone, BarChart3, Search, LayoutTemplate } from "lucide-react";

export function FullViewport() {
  const modules = [
    {
      name: "Bookkeeping",
      icon: <BookOpen className="w-8 h-8 text-[#C9A84C]" />,
      desc: "Automated ledger management and reconciliation powered by AI. Never fall behind on your books again."
    },
    {
      name: "Payroll",
      icon: <Banknote className="w-8 h-8 text-[#C9A84C]" />,
      desc: "Seamless employee and contractor payments, tax filings, and compliance tracking built right in."
    },
    {
      name: "BizForma",
      icon: <Building2 className="w-8 h-8 text-[#C9A84C]" />,
      desc: "Entity formation, compliance calendars, and legal document generation for modern businesses."
    },
    {
      name: "PBX",
      icon: <Phone className="w-8 h-8 text-[#C9A84C]" />,
      desc: "Enterprise-grade cloud phone system with IVR, call routing, and integrated communication logs."
    },
    {
      name: "Reports",
      icon: <BarChart3 className="w-8 h-8 text-[#C9A84C]" />,
      desc: "Real-time financial dashboards, cash flow forecasting, and custom board-ready reporting."
    },
    {
      name: "Scout",
      icon: <Search className="w-8 h-8 text-[#C9A84C]" />,
      desc: "AI-driven anomaly detection and financial opportunity scouting to optimize your bottom line."
    },
    {
      name: "White Label",
      icon: <LayoutTemplate className="w-8 h-8 text-[#C9A84C]" />,
      desc: "Fully brandable tenant experiences for agencies and fractional CFOs managing multiple clients."
    }
  ];

  return (
    <div className="bg-[#0B1220] text-slate-200 min-h-screen font-sans selection:bg-[#C9A84C] selection:text-[#0B1220]">
      {/* Chapter 1: Hero */}
      <section className="relative min-h-[100svh] flex flex-col items-center justify-center overflow-hidden">
        {/* Glow */}
        <div 
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(201, 168, 76, 0.15) 0%, rgba(11, 18, 32, 0) 50%)'
          }}
        />

        {/* Nav */}
        <nav className="absolute top-0 left-0 w-full px-8 py-6 flex justify-between items-center z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-[#C9A84C] to-amber-700 flex items-center justify-center">
              <span className="text-[#0B1220] font-bold text-lg">IH</span>
            </div>
            <span className="text-white font-semibold text-xl tracking-tight">InsightHunter</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#" className="hover:text-white transition-colors">Platform</a>
            <a href="#" className="hover:text-white transition-colors">Solutions</a>
            <a href="#" className="hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-4">
            <a href="#" className="text-sm font-medium text-slate-300 hover:text-white transition-colors hidden sm:block">Sign In</a>
            <button className="bg-[#C9A84C] hover:bg-[#b8953b] text-[#0B1220] px-5 py-2.5 rounded-full font-semibold text-sm transition-all duration-300 transform hover:scale-105">
              Get Started
            </button>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-5xl mx-auto mt-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-[#C9A84C] animate-pulse"></span>
            <span className="text-xs font-medium text-[#C9A84C] uppercase tracking-wider">AI CFO Intelligence</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white tracking-tight mb-8 leading-[1.1]">
            Stop Flying Blind.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C9A84C] to-amber-600">
              Know Your Numbers.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12 font-light leading-relaxed">
            The definitive financial platform for modern small businesses. Bookkeeping, payroll, compliance, and insights—unified under one intelligent roof.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <button className="w-full sm:w-auto bg-[#C9A84C] hover:bg-[#b8953b] text-[#0B1220] px-8 py-4 rounded-full font-bold text-base transition-all duration-300 flex items-center justify-center gap-2 group">
              Start Your Journey
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="w-full sm:w-auto bg-white/5 hover:bg-white/10 text-white border border-white/10 px-8 py-4 rounded-full font-bold text-base transition-all duration-300">
              Explore Modules
            </button>
          </div>
        </div>

        {/* Scroll Hint */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-60">
          <span className="text-xs tracking-widest uppercase font-medium text-slate-400">Explore Platform</span>
          <ChevronDown className="w-5 h-5 text-[#C9A84C] animate-bounce" />
        </div>
      </section>

      {/* Chapter 2: Social Proof */}
      <section className="min-h-[50svh] bg-[#0d1627] flex flex-col items-center justify-center px-8 py-24 border-y border-white/5">
        <div className="max-w-6xl w-full mx-auto grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-white/10">
          <div className="flex flex-col items-center pt-8 md:pt-0">
            <span className="text-5xl md:text-7xl font-bold text-white mb-4">500+</span>
            <span className="text-slate-400 text-lg font-light">businesses trust InsightHunter</span>
          </div>
          <div className="flex flex-col items-center pt-16 md:pt-0">
            <span className="text-5xl md:text-7xl font-bold text-white mb-4">7</span>
            <span className="text-slate-400 text-lg font-light">integrated platform modules</span>
          </div>
          <div className="flex flex-col items-center pt-16 md:pt-0">
            <span className="text-5xl md:text-7xl font-bold text-[#C9A84C] mb-4">AI</span>
            <span className="text-slate-400 text-lg font-light">CFO intelligence built right in</span>
          </div>
        </div>
      </section>

      {/* Chapter 3: Platform Modules */}
      <section className="py-32 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="mb-24">
          <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight">Platform Modules</h2>
          <div className="w-24 h-1 bg-[#C9A84C] mt-8"></div>
        </div>

        <div className="flex flex-col gap-8">
          {modules.map((mod, i) => (
            <React.Fragment key={mod.name}>
              <div className="flex flex-col md:flex-row items-start md:items-center gap-8 md:gap-16 py-12 group hover:bg-white/[0.02] transition-colors rounded-3xl px-8 -mx-8">
                <div className="flex-shrink-0 flex items-center gap-6 md:w-1/3">
                  <div className="w-16 h-16 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-[#C9A84C]/20 transition-all duration-500">
                    {mod.icon}
                  </div>
                  <h3 className="text-3xl font-bold text-white group-hover:text-[#C9A84C] transition-colors">{mod.name}</h3>
                </div>
                <div className="md:w-2/3">
                  <p className="text-xl text-slate-400 font-light leading-relaxed">
                    {mod.desc}
                  </p>
                </div>
              </div>
              {i < modules.length - 1 && (
                <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
              )}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* Chapter 4: Closing CTA */}
      <section className="min-h-[60svh] bg-[#C9A84C] flex flex-col items-center justify-center px-6 py-24 text-center relative overflow-hidden">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%230B1220\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}></div>
        
        <div className="relative z-10 max-w-4xl mx-auto">
          <h2 className="text-5xl md:text-7xl font-bold text-[#0B1220] tracking-tight mb-8">
            Ready to know your numbers?
          </h2>
          <p className="text-xl md:text-2xl text-[#0B1220]/80 mb-12 font-medium">
            Join the businesses that have stopped flying blind and started growing with confidence.
          </p>
          <button className="bg-[#0B1220] hover:bg-[#16233d] text-white px-10 py-5 rounded-full font-bold text-lg transition-all duration-300 shadow-2xl hover:shadow-[#0B1220]/50 transform hover:-translate-y-1 flex items-center justify-center gap-3 mx-auto group">
            Get Started Now
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#060a14] py-12 px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3 opacity-80 hover:opacity-100 transition-opacity">
            <div className="w-6 h-6 rounded bg-[#C9A84C] flex items-center justify-center">
              <span className="text-[#0B1220] font-bold text-xs">IH</span>
            </div>
            <span className="text-white font-semibold text-lg">InsightHunter</span>
          </div>
          
          <div className="flex gap-8 text-sm text-slate-500 font-medium">
            <a href="#" className="hover:text-[#C9A84C] transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-[#C9A84C] transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-[#C9A84C] transition-colors">Contact</a>
          </div>
          
          <div className="text-slate-600 text-sm">
            © {new Date().getFullYear()} InsightHunter. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
