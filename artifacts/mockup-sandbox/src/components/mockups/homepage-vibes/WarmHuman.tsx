import React from "react";
import { 
  BookOpen, 
  Calculator, 
  FileText, 
  PhoneCall, 
  BarChart3, 
  Search, 
  Building,
  CheckCircle2,
  ArrowRight,
  Menu
} from "lucide-react";

export function WarmHuman() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A120A] font-['DM_Sans',sans-serif] selection:bg-[#E8A838] selection:text-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 px-6 py-4 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-[#E8A838]/10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#E8A838] rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-[0_4px_14px_rgba(232,168,56,0.3)]">
              IH
            </div>
            <span className="text-xl font-bold tracking-tight">InsightHunter</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 font-medium text-[15px]">
            <a href="#" className="text-[#1A120A]/80 hover:text-[#E07A5F] transition-colors">Features</a>
            <a href="#" className="text-[#1A120A]/80 hover:text-[#E07A5F] transition-colors">Pricing</a>
            <a href="#" className="text-[#1A120A]/80 hover:text-[#E07A5F] transition-colors">About</a>
          </div>

          <div className="flex items-center gap-4">
            <button className="hidden md:block font-medium text-[15px] text-[#1A120A]/80 hover:text-[#1A120A] transition-colors">
              Log in
            </button>
            <button className="bg-[#E8A838] hover:bg-[#D99A2A] text-white px-6 py-2.5 rounded-full font-semibold transition-all shadow-[0_4px_14px_rgba(232,168,56,0.3)] hover:shadow-[0_6px_20px_rgba(232,168,56,0.4)] transform hover:-translate-y-0.5">
              Start Free
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-32 px-6 overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-[#E8A838]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-[#E07A5F]/10 rounded-full blur-3xl" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6 text-[#1A120A]">
            Stop Flying Blind.<br />
            <span className="text-[#E07A5F]">Know Your Numbers.</span>
          </h1>
          <p className="text-xl md:text-2xl text-[#1A120A]/70 mb-10 max-w-2xl mx-auto leading-relaxed">
            The friendly, all-in-one financial platform that helps small business owners breathe easier and grow smarter.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="w-full sm:w-auto bg-[#E8A838] hover:bg-[#D99A2A] text-white px-8 py-4 rounded-full font-bold text-lg transition-all shadow-[0_4px_14px_rgba(232,168,56,0.3)] hover:shadow-[0_6px_20px_rgba(232,168,56,0.4)] transform hover:-translate-y-0.5 flex items-center justify-center gap-2">
              Start Your Free Trial <ArrowRight className="w-5 h-5" />
            </button>
            <button className="w-full sm:w-auto bg-white hover:bg-[#F5ECD7] text-[#1A120A] px-8 py-4 rounded-full font-bold text-lg transition-all shadow-[0_4px_14px_rgba(26,18,10,0.05)] flex items-center justify-center gap-2">
              See How It Works
            </button>
          </div>
        </div>
      </section>

      {/* Social Proof Strip */}
      <section className="border-y border-[#E8A838]/10 bg-[#F5ECD7]/50 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 opacity-80">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-5 h-5 text-[#E07A5F]" />
            <span>Trusted by 5,000+ businesses</span>
          </div>
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-5 h-5 text-[#E07A5F]" />
            <span>No accounting degree required</span>
          </div>
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-5 h-5 text-[#E07A5F]" />
            <span>5-star rated support team</span>
          </div>
        </div>
      </section>

      {/* Modules Grid */}
      <section className="py-24 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need, in one friendly place</h2>
            <p className="text-lg text-[#1A120A]/70 max-w-2xl mx-auto">
              Say goodbye to juggling ten different tools. We've brought your entire back-office together.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Bookkeeping */}
            <div className="bg-white p-8 rounded-[24px] shadow-[0_8px_30px_rgba(232,168,56,0.08)] hover:shadow-[0_12px_40px_rgba(232,168,56,0.12)] transition-all hover:-translate-y-1 group">
              <div className="w-14 h-14 bg-[#E8A838]/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BookOpen className="w-7 h-7 text-[#E8A838]" />
              </div>
              <h3 className="text-xl font-bold mb-3">Bookkeeping</h3>
              <p className="text-[#1A120A]/70 leading-relaxed">
                Automated tracking and categorization that keeps your books perfectly balanced without the headache.
              </p>
            </div>

            {/* Payroll */}
            <div className="bg-white p-8 rounded-[24px] shadow-[0_8px_30px_rgba(232,168,56,0.08)] hover:shadow-[0_12px_40px_rgba(232,168,56,0.12)] transition-all hover:-translate-y-1 group">
              <div className="w-14 h-14 bg-[#E8A838]/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Calculator className="w-7 h-7 text-[#E8A838]" />
              </div>
              <h3 className="text-xl font-bold mb-3">Payroll</h3>
              <p className="text-[#1A120A]/70 leading-relaxed">
                Pay your team on time, every time. We handle the tax calculations and filings automatically.
              </p>
            </div>

            {/* BizForma */}
            <div className="bg-white p-8 rounded-[24px] shadow-[0_8px_30px_rgba(232,168,56,0.08)] hover:shadow-[0_12px_40px_rgba(232,168,56,0.12)] transition-all hover:-translate-y-1 group">
              <div className="w-14 h-14 bg-[#E8A838]/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <FileText className="w-7 h-7 text-[#E8A838]" />
              </div>
              <h3 className="text-xl font-bold mb-3">BizForma</h3>
              <p className="text-[#1A120A]/70 leading-relaxed">
                Form your business, stay compliant, and manage all your important legal documents easily.
              </p>
            </div>

            {/* PBX */}
            <div className="bg-white p-8 rounded-[24px] shadow-[0_8px_30px_rgba(232,168,56,0.08)] hover:shadow-[0_12px_40px_rgba(232,168,56,0.12)] transition-all hover:-translate-y-1 group">
              <div className="w-14 h-14 bg-[#E8A838]/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <PhoneCall className="w-7 h-7 text-[#E8A838]" />
              </div>
              <h3 className="text-xl font-bold mb-3">PBX</h3>
              <p className="text-[#1A120A]/70 leading-relaxed">
                Professional phone system to route calls, set greetings, and sound like a Fortune 500 company.
              </p>
            </div>

            {/* Reports */}
            <div className="bg-white p-8 rounded-[24px] shadow-[0_8px_30px_rgba(232,168,56,0.08)] hover:shadow-[0_12px_40px_rgba(232,168,56,0.12)] transition-all hover:-translate-y-1 group">
              <div className="w-14 h-14 bg-[#E8A838]/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-7 h-7 text-[#E8A838]" />
              </div>
              <h3 className="text-xl font-bold mb-3">Reports</h3>
              <p className="text-[#1A120A]/70 leading-relaxed">
                Beautiful, easy-to-read reports that actually make sense of where your money is going.
              </p>
            </div>

            {/* Scout */}
            <div className="bg-white p-8 rounded-[24px] shadow-[0_8px_30px_rgba(232,168,56,0.08)] hover:shadow-[0_12px_40px_rgba(232,168,56,0.12)] transition-all hover:-translate-y-1 group">
              <div className="w-14 h-14 bg-[#E8A838]/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Search className="w-7 h-7 text-[#E8A838]" />
              </div>
              <h3 className="text-xl font-bold mb-3">Scout</h3>
              <p className="text-[#1A120A]/70 leading-relaxed">
                AI-powered insights that find hidden savings and spot trends before they become problems.
              </p>
            </div>

            {/* White Label */}
            <div className="bg-white p-8 rounded-[24px] shadow-[0_8px_30px_rgba(232,168,56,0.08)] hover:shadow-[0_12px_40px_rgba(232,168,56,0.12)] transition-all hover:-translate-y-1 group md:col-span-2 lg:col-span-3 lg:max-w-2xl lg:mx-auto w-full">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div className="w-14 h-14 bg-[#E8A838]/10 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Building className="w-7 h-7 text-[#E8A838]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">White Label Partners</h3>
                  <p className="text-[#1A120A]/70 leading-relaxed">
                    Are you an accountant or firm? Put your own logo on InsightHunter and offer it directly to your clients.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="py-24 px-6 bg-[#F5ECD7]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-[#1A120A]">
            Ready to feel good about your finances?
          </h2>
          <p className="text-xl text-[#1A120A]/70 mb-10">
            Join thousands of small business owners who finally know their numbers.
          </p>
          <button className="bg-[#E07A5F] hover:bg-[#C8644A] text-white px-8 py-4 rounded-full font-bold text-lg transition-all shadow-[0_4px_14px_rgba(224,122,95,0.3)] hover:shadow-[0_6px_20px_rgba(224,122,95,0.4)] transform hover:-translate-y-0.5 inline-flex items-center gap-2">
            Start Your Free Trial <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-white border-t border-[#E8A838]/10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#E8A838] rounded-xl flex items-center justify-center text-white font-bold text-sm">
              IH
            </div>
            <span className="font-bold">InsightHunter</span>
          </div>
          
          <div className="flex items-center gap-6 text-[#1A120A]/60 text-sm">
            <a href="#" className="hover:text-[#E07A5F] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[#E07A5F] transition-colors">Terms</a>
            <a href="#" className="hover:text-[#E07A5F] transition-colors">Contact</a>
          </div>

          <div className="text-[#1A120A]/40 text-sm">
            © {new Date().getFullYear()} InsightHunter. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
