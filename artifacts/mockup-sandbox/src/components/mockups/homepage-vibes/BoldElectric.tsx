import React from "react";
import { 
  Calculator, 
  Users, 
  FileText, 
  Phone, 
  BarChart3, 
  Compass, 
  Building2,
  ChevronRight,
  Shield,
  Zap,
  Globe
} from "lucide-react";

export function BoldElectric() {
  const modules = [
    {
      icon: <Calculator className="w-6 h-6 text-[#00D2FF]" />,
      name: "Bookkeeping",
      description: "Automated ledger sync and AI-driven categorization."
    },
    {
      icon: <Users className="w-6 h-6 text-[#00D2FF]" />,
      name: "Payroll",
      description: "Frictionless team payments and tax compliance."
    },
    {
      icon: <FileText className="w-6 h-6 text-[#00D2FF]" />,
      name: "BizForma",
      description: "Intelligent document assembly and state filings."
    },
    {
      icon: <Phone className="w-6 h-6 text-[#00D2FF]" />,
      name: "PBX",
      description: "Enterprise-grade cloud communications."
    },
    {
      icon: <BarChart3 className="w-6 h-6 text-[#00D2FF]" />,
      name: "Reports",
      description: "Real-time interactive financial intelligence."
    },
    {
      icon: <Compass className="w-6 h-6 text-[#00D2FF]" />,
      name: "Scout",
      description: "Market analytics and competitor tracking."
    },
    {
      icon: <Building2 className="w-6 h-6 text-[#00D2FF]" />,
      name: "White Label",
      description: "Deploy the platform under your own brand."
    }
  ];

  return (
    <div className="min-h-screen bg-[#060B14] text-white font-sans overflow-x-hidden selection:bg-[#00D2FF] selection:text-[#060B14]">
      {/* Background glow effects */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#00D2FF] opacity-[0.05] blur-[150px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#7C3AED] opacity-[0.05] blur-[150px] rounded-full pointer-events-none" />
      
      {/* Dot Grid Texture */}
      <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      {/* Nav */}
      <nav className="relative z-10 border-b border-white/5 bg-[#060B14]/50 backdrop-blur-md sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00D2FF] to-[#0094FF] flex items-center justify-center">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="font-['Space_Grotesk'] font-bold text-xl tracking-tight">InsightHunter</span>
          </div>
          <div className="hidden md:flex items-center gap-8 font-medium text-sm text-[#A8D8FF]">
            <a href="#" className="hover:text-white transition-colors">Features</a>
            <a href="#" className="hover:text-white transition-colors">Pricing</a>
            <a href="#" className="hover:text-white transition-colors">About</a>
          </div>
          <button className="px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium transition-all hover:shadow-[0_0_15px_rgba(0,210,255,0.2)]">
            Start Free
          </button>
        </div>
      </nav>

      <main className="relative z-10">
        {/* Hero */}
        <section className="pt-32 pb-24 px-6 text-center">
          <div className="max-w-4xl mx-auto flex flex-col items-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-[#00D2FF]/30 text-[#00D2FF] text-xs font-semibold mb-8 shadow-[0_0_15px_rgba(0,210,255,0.15)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00D2FF] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00D2FF]"></span>
              </span>
              AI-Powered Financial OS
            </div>
            
            <h1 className="font-['Space_Grotesk'] text-5xl md:text-7xl font-bold leading-[1.1] tracking-tight mb-8">
              Stop Flying Blind. <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00D2FF] to-[#0094FF]">
                Know Your Numbers.
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-[#A8D8FF] max-w-2xl mb-10 leading-relaxed font-light">
              Command your business with real-time intelligence. Unified bookkeeping, payroll, and insights built for the next generation of founders.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-[#00D2FF] to-[#0094FF] text-white font-semibold flex items-center justify-center gap-2 hover:shadow-[0_0_30px_rgba(0,210,255,0.4)] transition-all hover:scale-105">
                Initialize Workspace <ChevronRight className="w-5 h-5" />
              </button>
              <button className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/5 border border-white/10 font-semibold hover:bg-white/10 transition-colors">
                View Architecture
              </button>
            </div>
          </div>
        </section>

        {/* Social Proof Strip */}
        <section className="border-y border-white/5 bg-white/[0.02] py-8">
          <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center gap-12 md:gap-24 opacity-60">
            <div className="flex items-center gap-2 text-sm font-medium tracking-wide">
              <Shield className="w-5 h-5 text-[#7C3AED]" /> Bank-Grade Security
            </div>
            <div className="flex items-center gap-2 text-sm font-medium tracking-wide">
              <Zap className="w-5 h-5 text-[#00D2FF]" /> Real-Time Processing
            </div>
            <div className="flex items-center gap-2 text-sm font-medium tracking-wide">
              <Globe className="w-5 h-5 text-[#A8D8FF]" /> Multi-State Compliance
            </div>
          </div>
        </section>

        {/* Modules Grid */}
        <section className="py-32 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="font-['Space_Grotesk'] text-3xl md:text-5xl font-bold mb-4">Core Systems</h2>
              <p className="text-[#A8D8FF]">Every tool you need, deeply integrated into one unified neural network.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {modules.map((module, i) => (
                <div 
                  key={i} 
                  className="group p-8 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-sm hover:bg-white/[0.05] hover:border-[#00D2FF]/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,210,255,0.1)] relative overflow-hidden flex flex-col"
                >
                  {/* Subtle top border gradient on hover */}
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00D2FF] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="w-14 h-14 rounded-xl bg-[#060B14] border border-white/10 flex items-center justify-center mb-6 group-hover:border-[#00D2FF]/30 group-hover:shadow-[0_0_15px_rgba(0,210,255,0.2)] transition-all">
                    {module.icon}
                  </div>
                  <h3 className="font-['Space_Grotesk'] text-xl font-bold mb-2 group-hover:text-[#00D2FF] transition-colors">{module.name}</h3>
                  <p className="text-[#A8D8FF] text-sm leading-relaxed">{module.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-24 px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#00D2FF]/10 pointer-events-none" />
          <div className="max-w-4xl mx-auto text-center relative z-10 bg-white/[0.02] border border-white/10 rounded-3xl p-12 md:p-20 backdrop-blur-xl">
            <h2 className="font-['Space_Grotesk'] text-3xl md:text-5xl font-bold mb-6">Ready to upgrade your OS?</h2>
            <p className="text-[#A8D8FF] mb-10 max-w-xl mx-auto text-lg">
              Join thousands of businesses running on InsightHunter's intelligent infrastructure.
            </p>
            <button className="px-10 py-4 rounded-full bg-white text-[#060B14] font-bold text-lg hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all hover:scale-105">
              Launch Setup Sequence
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#060B14] relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 opacity-50">
            <Zap className="w-4 h-4" />
            <span className="font-['Space_Grotesk'] font-bold tracking-tight">InsightHunter</span>
          </div>
          <div className="text-sm text-white/40">
            © {new Date().getFullYear()} InsightHunter Technologies. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
