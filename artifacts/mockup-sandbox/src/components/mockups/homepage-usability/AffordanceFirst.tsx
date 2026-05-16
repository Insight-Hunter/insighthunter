import React from 'react';
import { ArrowRight, ChevronRight, CheckCircle2, Shield, TrendingUp, Users, BookOpen, CreditCard, Building2, Phone, BarChart3, Search, Globe } from 'lucide-react';

export function AffordanceFirst() {
  const modules = [
    { title: "Bookkeeping", icon: BookOpen, desc: "Automated categorization and reconciliation." },
    { title: "Payroll", icon: CreditCard, desc: "One-click payroll and tax compliance." },
    { title: "BizForma", icon: Building2, desc: "Business formation and compliance made easy." },
    { title: "PBX", icon: Phone, desc: "Cloud phone system for your team." },
    { title: "Reports", icon: BarChart3, desc: "Real-time financial intelligence." },
    { title: "Scout", icon: Search, desc: "Market insights and competitor analysis." },
    { title: "White Label", icon: Globe, desc: "Custom branding for your clients." },
  ];

  return (
    <div className="min-h-screen bg-[#0B1220] text-slate-100 font-sans selection:bg-[#C9A84C] selection:text-[#0B1220]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-[#0B1220]/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#C9A84C] to-yellow-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
              <TrendingUp className="w-5 h-5 text-[#0B1220]" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white group-hover:text-[#C9A84C] transition-colors duration-300">InsightHunter</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            {['Products', 'Solutions', 'Pricing', 'Resources'].map((item) => (
              <a key={item} href="#" className="text-sm font-medium text-slate-300 hover:text-white relative group py-2">
                {item}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#C9A84C] transition-all duration-300 group-hover:w-full"></span>
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <a href="#" className="text-sm font-medium text-slate-300 hover:text-white transition-colors duration-200">Log in</a>
            <button className="h-10 px-6 rounded-full bg-[#C9A84C] hover:bg-[#d4b55c] text-[#0B1220] font-semibold text-sm transition-all duration-300 flex items-center gap-2 shadow-[0_0_20px_rgba(201,168,76,0.3)] hover:shadow-[0_0_30px_rgba(201,168,76,0.5)] hover:-translate-y-0.5 active:translate-y-0">
              Start Free <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative pt-32 pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#1a2942] via-[#0B1220] to-[#0B1220] -z-10"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700 text-sm font-medium text-[#C9A84C] mb-8 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C9A84C] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C9A84C]"></span>
              </span>
              Meet your new AI CFO
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-8 leading-[1.1]">
              Stop Flying Blind.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C9A84C] to-yellow-600">Know Your Numbers.</span>
            </h1>
            <p className="text-xl text-slate-400 mb-10 leading-relaxed max-w-2xl">
              The all-in-one financial intelligence platform for small businesses. Bookkeeping, payroll, and insights—automated by AI so you can focus on growth.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="h-14 px-8 rounded-full bg-[#C9A84C] hover:bg-[#d4b55c] text-[#0B1220] font-bold text-base transition-all duration-300 flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(201,168,76,0.3)] hover:shadow-[0_0_40px_rgba(201,168,76,0.5)] hover:-translate-y-1 active:translate-y-0 group">
                Start your 14-day free trial
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="h-14 px-8 rounded-full bg-transparent border-2 border-slate-700 hover:border-slate-500 text-white font-semibold text-base transition-all duration-300 flex items-center justify-center gap-2 hover:bg-slate-800/50 hover:-translate-y-1 active:translate-y-0 group">
                View interactive demo
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
              </button>
            </div>
            <p className="mt-4 text-sm text-slate-500 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> No credit card required to start
            </p>
          </div>
        </div>
      </header>

      {/* Social Proof */}
      <section className="border-y border-slate-800 bg-[#0c1627] py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-around items-center gap-8 opacity-70">
          <div className="flex items-center gap-3 font-semibold text-lg text-slate-300">
            <Shield className="w-6 h-6 text-[#C9A84C]" /> Bank-grade Security
          </div>
          <div className="flex items-center gap-3 font-semibold text-lg text-slate-300">
            <Users className="w-6 h-6 text-[#C9A84C]" /> 10,000+ Businesses
          </div>
          <div className="flex items-center gap-3 font-semibold text-lg text-slate-300">
            <TrendingUp className="w-6 h-6 text-[#C9A84C]" /> $2B+ Processed
          </div>
        </div>
      </section>

      {/* Modules Grid */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Everything you need to run your business</h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">One unified platform replacing half a dozen disparate tools.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {modules.map((mod, i) => (
              <a key={i} href="#" className="group block relative p-6 rounded-2xl bg-[#111a2e] border border-slate-800 hover:border-[#C9A84C]/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_10px_40px_-10px_rgba(201,168,76,0.15)] overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mb-6 group-hover:bg-[#C9A84C]/10 transition-colors duration-300">
                  <mod.icon className="w-6 h-6 text-slate-400 group-hover:text-[#C9A84C] transition-colors duration-300" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#C9A84C] transition-colors">{mod.title}</h3>
                <p className="text-slate-400 mb-6 line-clamp-2">{mod.desc}</p>
                <div className="flex items-center text-sm font-semibold text-[#C9A84C] opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                  Explore module <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </a>
            ))}
            
            {/* View All Card */}
            <a href="#" className="group block relative p-6 rounded-2xl bg-gradient-to-br from-[#1a2942] to-[#0B1220] border border-slate-700 hover:border-slate-500 transition-all duration-300 hover:-translate-y-2 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-4 group-hover:bg-slate-700 transition-colors duration-300 group-hover:scale-110">
                <ArrowRight className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white">View all features</h3>
            </a>
          </div>
        </div>
      </section>

      {/* Feature Highlight */}
      <section className="py-24 bg-[#0c1627] border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">Financial clarity, <br /><span className="text-[#C9A84C]">finally.</span></h2>
              <p className="text-lg text-slate-400 mb-8">Stop guessing your runway. InsightHunter connects to your banks and tools to provide real-time, actionable financial intelligence.</p>
              
              <ul className="space-y-6">
                {[
                  "Automated categorization saves 10+ hours a month",
                  "AI detects anomalies and flags potential cash flow gaps",
                  "One-click reports ready for your board or investors"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-4 p-4 rounded-xl hover:bg-[#111a2e] transition-colors border border-transparent hover:border-slate-800 cursor-default">
                    <div className="mt-1 w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <span className="text-slate-300 font-medium text-lg">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex-1 w-full relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#C9A84C]/20 to-transparent blur-3xl rounded-full -z-10"></div>
              <div className="bg-[#111a2e] border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="bg-white/10 hover:bg-white/20 p-2 rounded-lg backdrop-blur-sm transition-colors">
                        <ArrowRight className="w-4 h-4 text-white" />
                    </button>
                 </div>
                <div className="h-64 bg-slate-800/50 rounded-xl border border-slate-700 flex flex-col justify-end p-4 gap-2 relative group-hover:border-slate-600 transition-colors">
                  <div className="text-slate-400 text-sm font-medium mb-4">Cash Flow Forecast</div>
                  <div className="flex items-end gap-2 h-32">
                    {[40, 70, 45, 90, 65, 100].map((h, i) => (
                      <div key={i} className="flex-1 bg-gradient-to-t from-[#C9A84C]/80 to-[#C9A84C] rounded-t-sm transition-all duration-1000 group-hover:from-yellow-500/80 group-hover:to-yellow-400" style={{ height: `${h}%` }}></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-[#C9A84C] opacity-5"></div>
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-8 tracking-tight">Ready to master your finances?</h2>
          <p className="text-xl text-slate-400 mb-12">Join thousands of founders who trust InsightHunter to run their back office.</p>
          <button className="h-16 px-10 rounded-full bg-[#C9A84C] hover:bg-[#d4b55c] text-[#0B1220] font-bold text-lg transition-all duration-300 inline-flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(201,168,76,0.4)] hover:shadow-[0_0_60px_rgba(201,168,76,0.6)] hover:-translate-y-1 active:translate-y-0 group">
            Start your free trial today
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1.5 transition-transform" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0B1220] border-t border-slate-800 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-[#C9A84C]" />
              <span className="text-xl font-bold text-white">InsightHunter</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-8">
              {['About', 'Blog', 'Careers', 'Terms', 'Privacy'].map((item) => (
                <a key={item} href="#" className="text-slate-400 hover:text-[#C9A84C] font-medium transition-colors duration-200 relative group">
                  {item}
                  <span className="absolute -bottom-1 left-0 w-0 h-px bg-[#C9A84C] transition-all duration-300 group-hover:w-full"></span>
                </a>
              ))}
            </div>
          </div>
          <div className="mt-12 text-center text-slate-600 text-sm">
            © {new Date().getFullYear()} InsightHunter Inc. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
