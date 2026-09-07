import Link from "next/link";
import { ArrowLeft, Sparkles, Shield, Target, TrendingUp, Zap, Heart, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "About | SpendWise",
  description: "About SpendWise - The modern personal finance OS"
};

export default function AboutPage() {
  const pillars = [
    {
      icon: Shield,
      title: "Privacy First",
      desc: "Zero tracking, no banking credential harvesting, and completely isolated user databases. Your finances are confidential."
    },
    {
      icon: Target,
      title: "50/30/20 Discipline",
      desc: "Scientific financial health budgeting. SpendWise classifies your outlays into Needs, Wants, and Investments with live scoring."
    },
    {
      icon: TrendingUp,
      title: "Actionable Insights",
      desc: "Accurate month-over-month comparisons, forecast models, and automated EMI tracking that give you complete monetary control."
    },
    {
      icon: Sparkles,
      title: "Gamified Milestones",
      desc: "Earn 20+ unlockable financial achievement badges as you crush your budget limits and grow your savings rate."
    }
  ];

  return (
    <div className="min-h-screen bg-[#08070b] text-zinc-300">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-[#08070b]/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft size={16} /> Back to SpendWise
          </Link>
          <div className="text-xl font-black tracking-tight">
            SPEND<span className="text-violet-400">WISE</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="relative border-b border-zinc-800/60 bg-gradient-to-b from-violet-500/10 via-zinc-950/50 to-transparent py-16 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3.5 py-1 text-xs font-semibold text-violet-300 mb-6">
            <Sparkles size={14} /> The Personal Finance OS
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white md:text-6xl">
            Built for clarity, discipline, &amp; <span className="text-violet-400">wealth</span>.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-zinc-400 leading-relaxed">
            SpendWise transforms clunky spreadsheets into an ultra-fast, visually stunning financial command center engineered for modern professionals and students.
          </p>
        </div>
      </div>

      {/* Main */}
      <main className="mx-auto max-w-5xl px-6 py-16">
        
        {/* Core Pillars */}
        <section className="space-y-6">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-2xl font-black text-white">Why SpendWise?</h2>
            <p className="mt-2 text-xs text-zinc-400">Designed with deliberate aesthetic precision and uncompromising data security.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {pillars.map((pillar, i) => {
              const Icon = pillar.icon;
              return (
                <div key={i} className="rounded-3xl border border-zinc-800/80 bg-zinc-950/60 p-7 backdrop-blur-xl hover:border-violet-500/30 transition-all">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-500/15 text-violet-300 mb-4">
                    <Icon size={22} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{pillar.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{pillar.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Feature Highlights */}
        <section className="mt-16 rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-zinc-950 to-zinc-950 p-8 md:p-12">
          <div className="max-w-2xl">
            <h2 className="text-2xl md:text-3xl font-black text-white">Never wonder where your salary went again.</h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              With multi-channel category categorization (UPI, Card, Cash, Bank), instant auto-deducting EMI schedules, and intelligent month-over-month growth comparisons that activate as your history expands, SpendWise empowers you to make proactive money decisions.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <Link href="/" className="rounded-xl bg-violet-500 px-6 py-3 text-sm font-bold text-white hover:bg-violet-400 transition-colors shadow-lg shadow-violet-500/20">
                Launch Dashboard
              </Link>
              <Link href="/contact" className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-6 py-3 text-sm font-semibold text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors">
                Contact Us
              </Link>
            </div>
          </div>
        </section>

        {/* Footer Navigation */}
        <div className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-800/80 pt-6 text-xs text-zinc-500">
          <p>© {new Date().getFullYear()} SpendWise. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-violet-400 transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-violet-400 transition-colors">Privacy Policy</Link>
            <Link href="/disclaimer" className="hover:text-violet-400 transition-colors">Disclaimer</Link>
            <Link href="/contact" className="hover:text-violet-400 transition-colors">Support &amp; FAQ</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
