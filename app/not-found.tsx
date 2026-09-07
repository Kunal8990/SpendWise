import Link from "next/link";
import { ArrowLeft, Home, LayoutDashboard, Search, HelpCircle } from "lucide-react";

export const metadata = {
  title: "404 - Page Not Found | SpendWise",
  description: "The page you are looking for does not exist on SpendWise."
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#08070b] px-6 text-center text-zinc-300">
      {/* Glow Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-72 w-72 rounded-full bg-violet-600/15 blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-lg rounded-3xl border border-zinc-800/80 bg-zinc-950/70 p-8 md:p-12 shadow-2xl backdrop-blur-xl">
        <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/30">
          <HelpCircle size={32} />
        </div>

        <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-400">
          Error 404
        </span>

        <h1 className="mt-4 text-3xl font-black tracking-tight text-white md:text-4xl">
          Page Not Found
        </h1>
        <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
          The requested page might have been removed, had its name changed, or is temporarily unavailable.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 hover:brightness-110 active:scale-95 transition-all"
          >
            <LayoutDashboard size={16} /> Go to Dashboard
          </Link>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-5 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all"
          >
            <Home size={16} /> Home / Sign In
          </Link>
        </div>

        <div className="mt-8 border-t border-zinc-800/80 pt-6 text-xs text-zinc-500 flex justify-center gap-4">
          <Link href="/terms" className="hover:text-zinc-300 transition-colors">Terms</Link>
          <span>•</span>
          <Link href="/privacy" className="hover:text-zinc-300 transition-colors">Privacy</Link>
          <span>•</span>
          <Link href="/contact" className="hover:text-zinc-300 transition-colors">Contact Support</Link>
        </div>
      </div>
    </div>
  );
}
