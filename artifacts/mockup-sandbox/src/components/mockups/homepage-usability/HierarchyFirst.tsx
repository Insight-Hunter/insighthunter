import React from 'react';
import { 
  BarChart3, 
  Wallet, 
  Building2, 
  PhoneCall, 
  PieChart, 
  Eye, 
  Tag, 
  ArrowRight,
  ShieldCheck,
  Building,
  CloudCog
} from 'lucide-react';

export function HierarchyFirst() {
  return (
    <div className="min-h-screen bg-[#0B1220] text-gray-300 font-sans selection:bg-[#C9A84C] selection:text-[#0B1220]">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Lato:wght@300;400;700&display=swap');
        
        .font-serif {
          font-family: 'Playfair Display', serif;
        }
        .font-sans {
          font-family: 'Lato', sans-serif;
        }
      `}} />

      {/* Navigation */}
      <nav className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-[#C9A84C] flex items-center justify-center">
              <Eye className="w-5 h-5 text-[#0B1220]" />
            </div>
            <span className="text-white text-xl font-serif tracking-wide font-semibold">InsightHunter</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium tracking-wide">
            <a href="#" className="hover:text-white transition-colors">Features</a>
            <a href="#" className="hover:text-white transition-colors">Pricing</a>
            <a href="#" className="hover:text-white transition-colors">About</a>
          </div>

          <button className="bg-[#C9A84C] hover:bg-[#b5953e] text-[#0B1220] px-6 py-2.5 rounded text-sm font-bold tracking-wide transition-colors">
            Start Free
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#C9A84C]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-white text-6xl md:text-8xl font-serif font-semibold leading-[1.1] mb-8">
            Stop Flying Blind.<br />
            <span className="text-[#C9A84C] italic">Know Your Numbers.</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-400 font-light mb-12 max-w-2xl mx-auto leading-relaxed">
            The AI CFO and financial intelligence platform built specifically for small businesses who demand clarity over chaos.
          </p>

          <button className="bg-[#C9A84C] hover:bg-[#b5953e] text-[#0B1220] px-10 py-4 rounded text-lg font-bold tracking-wide transition-all hover:scale-105 flex items-center gap-3 mx-auto">
            Start Your Free Trial <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Trust Strip */}
      <section className="border-y border-white/5 bg-white/[0.02] py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center gap-12 md:gap-24 opacity-60 grayscale">
          <div className="flex items-center gap-3">
            <Building className="w-5 h-5" />
            <span className="text-sm font-semibold tracking-widest uppercase">500+ Businesses</span>
          </div>
          <div className="flex items-center gap-3">
            <CloudCog className="w-5 h-5" />
            <span className="text-sm font-semibold tracking-widest uppercase">Cloudflare-Native</span>
          </div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-sm font-semibold tracking-widest uppercase">SOC 2 Ready</span>
          </div>
        </div>
      </section>

      {/* Modules Grid */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-20">
            <h2 className="text-4xl md:text-5xl font-serif text-white mb-6">Everything you need.<br/>Nothing you don't.</h2>
            <div className="w-24 h-1 bg-[#C9A84C]" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            <div className="p-8 border border-white/10 rounded-lg hover:border-[#C9A84C]/50 transition-colors bg-white/[0.01]">
              <Wallet className="w-8 h-8 text-[#C9A84C] mb-6" />
              <h3 className="text-xl text-white font-serif mb-3">Bookkeeping</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Automated ledger management and transaction categorization.</p>
            </div>

            <div className="p-8 border border-white/10 rounded-lg hover:border-[#C9A84C]/50 transition-colors bg-white/[0.01]">
              <BarChart3 className="w-8 h-8 text-[#C9A84C] mb-6" />
              <h3 className="text-xl text-white font-serif mb-3">Payroll</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Seamless contractor and employee payments with tax compliance.</p>
            </div>

            <div className="p-8 border border-white/10 rounded-lg hover:border-[#C9A84C]/50 transition-colors bg-white/[0.01]">
              <Building2 className="w-8 h-8 text-[#C9A84C] mb-6" />
              <h3 className="text-xl text-white font-serif mb-3">BizForma</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Business formation, EIN acquisition, and state registrations.</p>
            </div>

            <div className="p-8 border border-white/10 rounded-lg hover:border-[#C9A84C]/50 transition-colors bg-white/[0.01]">
              <PhoneCall className="w-8 h-8 text-[#C9A84C] mb-6" />
              <h3 className="text-xl text-white font-serif mb-3">PBX</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Professional cloud phone system with IVR and call routing.</p>
            </div>

            <div className="p-8 border border-white/10 rounded-lg hover:border-[#C9A84C]/50 transition-colors bg-white/[0.01]">
              <PieChart className="w-8 h-8 text-[#C9A84C] mb-6" />
              <h3 className="text-xl text-white font-serif mb-3">Reports</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Customizable financial statements and board-ready exports.</p>
            </div>

            <div className="p-8 border border-white/10 rounded-lg hover:border-[#C9A84C]/50 transition-colors bg-white/[0.01]">
              <Eye className="w-8 h-8 text-[#C9A84C] mb-6" />
              <h3 className="text-xl text-white font-serif mb-3">Scout</h3>
              <p className="text-gray-400 text-sm leading-relaxed">AI-driven anomaly detection and cash flow forecasting.</p>
            </div>

            <div className="p-8 border border-white/10 rounded-lg hover:border-[#C9A84C]/50 transition-colors bg-white/[0.01]">
              <Tag className="w-8 h-8 text-[#C9A84C] mb-6" />
              <h3 className="text-xl text-white font-serif mb-3">White Label</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Offer InsightHunter under your own agency brand.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6 bg-[#C9A84C] text-[#0B1220]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-serif font-bold mb-8">Ready to take control?</h2>
          <p className="text-xl font-medium mb-12 opacity-80 max-w-xl mx-auto">
            Join the hundreds of businesses that trust InsightHunter for their financial clarity.
          </p>
          <button className="bg-[#0B1220] hover:bg-[#1a263d] text-white px-10 py-4 rounded text-lg font-bold tracking-wide transition-all hover:scale-105">
            Start Your Free Trial
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-[#C9A84C]" />
            <span className="text-white font-serif font-semibold">InsightHunter</span>
          </div>
          <p className="text-sm text-gray-500">© {new Date().getFullYear()} InsightHunter. All rights reserved.</p>
          <div className="flex gap-6 text-sm">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
