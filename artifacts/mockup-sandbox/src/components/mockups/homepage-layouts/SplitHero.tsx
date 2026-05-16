import React, { useEffect, useState } from 'react';
import { ArrowRight, BarChart3, Building2, Calculator, CheckCircle2, ChevronRight, FileText, HeadphonesIcon, LineChart, PieChart, PlayCircle, ShieldCheck, Zap } from 'lucide-react';

export function SplitHero() {
  return (
    <div className="min-h-screen bg-[#0B1220] text-slate-200 font-sans selection:bg-[#C9A84C] selection:text-white">
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap" rel="stylesheet" />
      
      <style dangerouslySetInline={{__html: `
        :root {
          --navy: #0B1220;
          --navy-light: #162032;
          --navy-lighter: #1E293B;
          --gold: #C9A84C;
          --gold-light: #E0C477;
        }
        .font-display {
          font-family: 'Playfair Display', serif;
        }
        .font-sans {
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
          opacity: 0;
          transform: translateY(20px);
        }
        .delay-100 { animation-delay: 100ms; }
        .delay-200 { animation-delay: 200ms; }
        .delay-300 { animation-delay: 300ms; }
        
        @keyframes fadeInUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}} />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#0B1220]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#C9A84C] to-yellow-600 flex items-center justify-center shadow-lg shadow-[#C9A84C]/20">
              <LineChart className="w-5 h-5 text-[#0B1220]" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">InsightHunter</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#" className="hover:text-white transition-colors">Platform</a>
            <a href="#" className="hover:text-white transition-colors">Solutions</a>
            <a href="#" className="hover:text-white transition-colors">Pricing</a>
            <a href="#" className="hover:text-white transition-colors">Resources</a>
          </div>

          <div className="flex items-center gap-4">
            <a href="#" className="text-sm font-medium text-slate-300 hover:text-white hidden sm:block">Log in</a>
            <button className="bg-[#C9A84C] hover:bg-[#E0C477] text-[#0B1220] px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-[0_0_20px_rgba(201,168,76,0.3)] hover:shadow-[0_0_30px_rgba(201,168,76,0.5)]">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section (Above Fold) */}
      <section className="pt-20 min-h-screen flex items-center relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#C9A84C]/10 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-blue-500/10 blur-[100px] rounded-full"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 w-full relative z-10 grid lg:grid-cols-2 gap-12 lg:gap-8 items-center py-12 lg:py-0">
          
          {/* Left Column: Narrative */}
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-[#C9A84C] mb-8 animate-fade-in-up">
              <Zap className="w-3.5 h-3.5" />
              <span>Meet your new AI CFO</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-white mb-6 leading-[1.1] animate-fade-in-up delay-100">
              Stop Flying Blind.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C9A84C] to-[#E0C477] font-display italic font-semibold">Know Your Numbers.</span>
            </h1>
            
            <p className="text-lg lg:text-xl text-slate-400 mb-10 leading-relaxed animate-fade-in-up delay-200">
              The all-in-one financial operating system that replaces your bookkeeper, payroll provider, and financial analyst with autonomous AI.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up delay-300">
              <button className="bg-[#C9A84C] hover:bg-[#E0C477] text-[#0B1220] px-8 py-4 rounded-full text-base font-semibold transition-all flex items-center justify-center gap-2 group">
                Start Free Trial
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-8 py-4 rounded-full text-base font-semibold transition-all flex items-center justify-center gap-2">
                <PlayCircle className="w-5 h-5 text-slate-400" />
                See How It Works
              </button>
            </div>
            
            <div className="mt-12 flex items-center gap-6 text-sm text-slate-500 animate-fade-in-up delay-300">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Bank-grade security</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>No credit card required</span>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Proof Panel */}
          <div className="relative lg:h-[600px] flex items-center justify-center animate-fade-in-up delay-200">
            {/* Main Panel */}
            <div className="w-full max-w-lg bg-[#162032] border border-white/10 rounded-2xl p-6 shadow-2xl relative z-10">
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
                <div>
                  <h3 className="text-lg font-semibold text-white">Platform Overview</h3>
                  <p className="text-xs text-slate-400 mt-1">Live autonomous operations</p>
                </div>
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <div className="text-[10px] font-bold text-emerald-500 tracking-wider uppercase">Online</div>
                </div>
              </div>

              {/* Stat Tiles Mini-Grid */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-[#0B1220] rounded-xl p-4 border border-white/5 relative overflow-hidden group hover:border-[#C9A84C]/30 transition-colors">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-[#C9A84C]/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
                  <Building2 className="w-5 h-5 text-[#C9A84C] mb-3" />
                  <div className="text-2xl font-bold text-white mb-1">500+</div>
                  <div className="text-xs font-medium text-slate-400">Active Businesses</div>
                </div>
                
                <div className="bg-[#0B1220] rounded-xl p-4 border border-white/5 relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
                  <Zap className="w-5 h-5 text-blue-400 mb-3" />
                  <div className="text-2xl font-bold text-white mb-1">24/7</div>
                  <div className="text-xs font-medium text-slate-400">AI Processing</div>
                </div>
              </div>

              {/* Module Preview List */}
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Active Modules</h4>
                <div className="space-y-3">
                  {[
                    { name: 'Bookkeeping', color: 'bg-emerald-400', value: 'Synced' },
                    { name: 'Payroll', color: 'bg-blue-400', value: 'Running' },
                    { name: 'BizForma', color: 'bg-purple-400', value: 'Compliant' },
                    { name: 'Reports', color: 'bg-[#C9A84C]', value: 'Generated' }
                  ].map((mod, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[#0B1220] border border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${mod.color}`}></div>
                        <span className="text-sm font-medium text-slate-200">{mod.name}</span>
                      </div>
                      <span className="text-xs font-medium text-slate-500 bg-white/5 px-2 py-1 rounded">{mod.value}</span>
                    </div>
                  ))}
                  <div className="text-center pt-2">
                    <span className="text-xs text-[#C9A84C] font-medium cursor-pointer hover:underline">+ 3 more modules</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Decorative Elements */}
            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-[#C9A84C]/20 rounded-full blur-3xl z-0"></div>
          </div>
        </div>
      </section>

      {/* Platform Modules Grid (Below Fold) */}
      <section className="py-24 bg-[#0B1220] relative border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-4">Platform Modules</h2>
              <p className="text-slate-400 max-w-2xl">Everything you need to run your business finances, integrated seamlessly into one powerful platform.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { id: 'bookkeeping', name: 'Bookkeeping', icon: <Calculator className="w-6 h-6" />, desc: 'AI auto-categorization and real-time ledger.' },
              { id: 'payroll', name: 'Payroll', icon: <FileText className="w-6 h-6" />, desc: 'Automated salary runs and tax filings.' },
              { id: 'bizforma', name: 'BizForma', icon: <Building2 className="w-6 h-6" />, desc: 'Entity formation and compliance.' },
              { id: 'pbx', name: 'PBX', icon: <HeadphonesIcon className="w-6 h-6" />, desc: 'Virtual phone system for your team.' },
              { id: 'reports', name: 'Reports', icon: <PieChart className="w-6 h-6" />, desc: 'Board-ready financial statements.' },
              { id: 'scout', name: 'Scout', icon: <BarChart3 className="w-6 h-6" />, desc: 'Market intelligence and benchmarking.' },
              { id: 'whitelabel', name: 'White Label', icon: <ShieldCheck className="w-6 h-6" />, desc: 'For agencies and accounting firms.' },
            ].map((module) => (
              <div key={module.id} className="group p-6 rounded-2xl bg-[#162032] border border-white/5 hover:border-[#C9A84C]/30 hover:bg-[#1E293B] transition-all cursor-pointer">
                <div className="w-12 h-12 rounded-xl bg-[#0B1220] border border-white/10 flex items-center justify-center text-[#C9A84C] mb-4 group-hover:scale-110 group-hover:bg-[#C9A84C] group-hover:text-[#0B1220] transition-all">
                  {module.icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{module.name}</h3>
                <p className="text-sm text-slate-400 line-clamp-2">{module.desc}</p>
              </div>
            ))}
            
            {/* View All Slot */}
            <div className="group p-6 rounded-2xl border border-dashed border-white/20 hover:border-[#C9A84C]/50 transition-all cursor-pointer flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white mb-4 group-hover:bg-[#C9A84C] group-hover:text-[#0B1220] transition-all">
                <ChevronRight className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">View Full Capabilities</h3>
              <p className="text-xs text-slate-400">Explore all features</p>
            </div>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="py-20 bg-gradient-to-b from-[#162032] to-[#0B1220] border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">Ready to see clearly?</h2>
          <p className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto">
            Join hundreds of modern businesses using InsightHunter to automate their financial operations.
          </p>
          <button className="bg-[#C9A84C] hover:bg-[#E0C477] text-[#0B1220] px-8 py-4 rounded-full text-base font-semibold transition-all inline-flex items-center gap-2">
            Start Your Free Trial
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="py-8 bg-[#0B1220] border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 opacity-50 grayscale">
            <LineChart className="w-4 h-4 text-white" />
            <span className="text-sm font-bold tracking-tight text-white">InsightHunter</span>
          </div>
          <p className="text-sm text-slate-500">© 2024 InsightHunter Inc. All rights reserved.</p>
          <div className="flex gap-6 text-sm text-slate-500">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
