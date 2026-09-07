 "use client";

import { useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  BedDouble,
  Car,
  CircleDollarSign,
  CreditCard,
  Dumbbell,
  ExternalLink,
  FileText,
  Fuel,
  HeartPulse,
  HelpCircle,
  Home,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  PiggyBank,
  Plus,
  ReceiptText,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Target,
  TrendingUp,
  Utensils,
  Wallet,
  X
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { demoExpenses, monthlyTrend, categoryBreakdown } from "@/lib/demo-data";
import { Expense, EMI } from "@/lib/types";
import { BADGES } from "@/lib/achievements";
import { createClient } from "@/lib/supabase/client";
import DatePicker from "./DatePicker";

const categories = [
  "Food", "EMI", "Invest", "Personal Expense", "Outing", "Night Out",
  "Hospital", "Medical", "Gym", "Supplements", "Bank Savings", "Petrol & Travel",
  "Shopping", "Bills", "Education", "Miscellaneous"
];

const iconForCategory: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Food: Utensils,
  EMI: CreditCard,
  Invest: TrendingUp,
  "Personal Expense": ShoppingBag,
  Outing: Home,
  "Night Out": BedDouble,
  Hospital: HeartPulse,
  Medical: HeartPulse,
  Gym: Dumbbell,
  Supplements: Activity,
  "Bank Savings": PiggyBank,
  "Petrol & Travel": Fuel,
  Shopping: ShoppingBag,
  Bills: ReceiptText,
  Education: FileText,
  Miscellaneous: CircleDollarSign
};

function money(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

function MetricCard({
  label,
  value,
  delta,
  deltaType = "positive",
  icon: Icon,
  onClick
}: {
  label: string;
  value: string;
  delta?: string;
  deltaType?: "positive" | "negative" | "neutral";
  icon: React.ComponentType<{ size?: number; className?: string }>;
  onClick?: () => void;
}) {
  const deltaColor = 
    deltaType === "positive" ? "text-emerald-400" :
    deltaType === "negative" ? "text-rose-400" :
    "text-zinc-500 font-normal";

  return (
    <div 
      className={`rounded-2xl border border-zinc-800/90 bg-zinc-950/75 p-5 ${onClick ? 'cursor-pointer hover:border-violet-500/30 hover:bg-zinc-900 transition-all' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-500">{label}</span>
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-violet-500/10 text-violet-300">
          <Icon size={18} />
        </div>
      </div>
      <div className="mt-4 text-2xl font-black tracking-tight">{value}</div>
      {delta && <div className={`mt-1 text-xs ${deltaColor}`}>{delta}</div>}
    </div>
  );
}

export default function Dashboard({ userEmail }: { userEmail?: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>(demoExpenses);
  const [showExpense, setShowExpense] = useState(false);
  const [showEmiModal, setShowEmiModal] = useState(false);
  const [active, setActive] = useState("Dashboard");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [onboardingData, setOnboardingData] = useState<{name: string, income: string, goal: string, currentSpend?: string, monthlyInvestment?: string, age?: string, gender?: string, occupation?: string, dob?: string, userType?: string, username?: string, email?: string} | null>(null);
  const [editSettings, setEditSettings] = useState({name: "", income: "", monthlyInvestment: "", age: "", gender: "", occupation: "", dob: "", userType: ""});

  const [emis, setEmis] = useState<EMI[]>([]);
  const [unlockedBadges, setUnlockedBadges] = useState<Record<string, string>>({});
  const [showBadgeModal, setShowBadgeModal] = useState<{show: boolean, badgeId: string | null}>({show: false, badgeId: null});

  const [monthlyGoal, setMonthlyGoal] = useState<{category: string, amount: string} | null>(null);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newGoal, setNewGoal] = useState({category: "Invest", amount: ""});

  const isInitialLoadDone = useRef(false);
  const activeUserRef = useRef<string | null>(null);

  const getScopedKey = (baseKey: string, user: string | null) => {
    if (!user) return baseKey;
    const safe = user.toLowerCase().trim().replace(/[^a-z0-9_@.-]/g, '_');
    return `${baseKey}_${safe}`;
  };

  useEffect(() => {
    // 1. Determine active user
    const activeUser = localStorage.getItem('spendwise_active_user');
    activeUserRef.current = activeUser;

    // 2. Load & Validate User Profile
    const usersStr = localStorage.getItem('spendwise_users');
    const users = usersStr ? JSON.parse(usersStr) : {};

    let currentUserProfile: any = null;
    if (activeUser && users[activeUser]) {
      currentUserProfile = users[activeUser];
    } else if (activeUser) {
      currentUserProfile = Object.values(users).find((u: any) =>
        (u?.username || "").toLowerCase() === activeUser.toLowerCase() ||
        (u?.email || "").toLowerCase() === activeUser.toLowerCase()
      );
    }

    const data = localStorage.getItem('spendwise_onboarding');
    let parsedOnboarding: any = null;
    if (data) {
      try { parsedOnboarding = JSON.parse(data); } catch (e) {}
    }

    // Verify ownership: onboarding data must belong to activeUser
    const onboardingBelongsToActiveUser = !activeUser || (
      parsedOnboarding && (
        (parsedOnboarding.username && parsedOnboarding.username.toLowerCase() === activeUser.toLowerCase()) ||
        (parsedOnboarding.email && parsedOnboarding.email.toLowerCase() === activeUser.toLowerCase()) ||
        (parsedOnboarding.name && parsedOnboarding.name.toLowerCase() === activeUser.toLowerCase())
      )
    );

    let activeProfile: any = null;
    if (currentUserProfile && currentUserProfile.profileCompleted) {
      activeProfile = currentUserProfile;
      localStorage.setItem('spendwise_onboarding', JSON.stringify(currentUserProfile));
    } else if (parsedOnboarding && onboardingBelongsToActiveUser) {
      activeProfile = parsedOnboarding;
    }

    if (!activeProfile) {
      window.location.replace("/");
      return;
    }

    setOnboardingData(activeProfile);
    setEditSettings({ 
      name: activeProfile.name || "", 
      income: activeProfile.income || "", 
      monthlyInvestment: activeProfile.monthlyInvestment || "",
      age: activeProfile.age || "",
      gender: activeProfile.gender || "",
      occupation: activeProfile.occupation || "",
      dob: activeProfile.dob || "",
      userType: activeProfile.userType || "Professional"
    });

    // 3. User-isolated Financial Data
    const expKey = getScopedKey('spendwise_expenses', activeUser);
    const savedExpenses = localStorage.getItem(expKey);
    let loadedExpenses: Expense[] = [];
    if (savedExpenses) {
      try { loadedExpenses = JSON.parse(savedExpenses); } catch (e) { loadedExpenses = []; }
      setExpenses(loadedExpenses);
    } else {
      if (!activeUser) {
        setExpenses(demoExpenses);
        loadedExpenses = demoExpenses;
      } else {
        setExpenses([]);
        loadedExpenses = [];
      }
    }

    const emiKey = getScopedKey('spendwise_emis', activeUser);
    const savedEmis = localStorage.getItem(emiKey);
    let loadedEmis: EMI[] = [];
    if (savedEmis) {
      try { 
        loadedEmis = JSON.parse(savedEmis);
        setEmis(loadedEmis); 
      } catch (e) { setEmis([]); }
    } else {
      setEmis([]);
    }

    const badgeKey = getScopedKey('spendwise_badges', activeUser);
    const savedBadges = localStorage.getItem(badgeKey);
    if (savedBadges) {
      try { setUnlockedBadges(JSON.parse(savedBadges)); } catch (e) { setUnlockedBadges({}); }
    } else {
      setUnlockedBadges({});
    }

    const goalKey = getScopedKey('spendwise_goal', activeUser);
    const savedGoal = localStorage.getItem(goalKey);
    if (savedGoal) {
      try { setMonthlyGoal(JSON.parse(savedGoal)); } catch (e) { setMonthlyGoal(null); }
    } else {
      setMonthlyGoal(null);
    }

    // Auto-deduct EMIs logic
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayDay = new Date().getDate();
    const currentYM = todayStr.slice(0, 7);
    
    if (loadedEmis.length > 0) {
      let expensesUpdated = false;
      let currentExpenses = [...loadedExpenses];
      
      loadedEmis.forEach(emi => {
        if (todayDay >= emi.deductionDate) {
          const expectedChargeDate = `${currentYM}-${String(emi.deductionDate).padStart(2, '0')}`;
          
          const alreadyCharged = currentExpenses.some((e: Expense) => 
            e.category === "EMI" && 
            e.title === emi.title && 
            e.date.startsWith(currentYM)
          );
          
          if (!alreadyCharged && todayStr >= expectedChargeDate) {
            currentExpenses = [{
              id: crypto.randomUUID(),
              title: emi.title,
              category: "EMI",
              amount: emi.monthlyAmount,
              date: expectedChargeDate,
              payment_method: "Auto-deduct",
              is_recurring: true
            }, ...currentExpenses];
            expensesUpdated = true;
          }
        }
      });
      
      if (expensesUpdated) {
        setExpenses(currentExpenses);
        localStorage.setItem(expKey, JSON.stringify(currentExpenses));
      }
    }

    isInitialLoadDone.current = true;
  }, [userEmail]);

  // Persist expenses when they change from the UI
  useEffect(() => {
    if (!isInitialLoadDone.current) return;
    const key = getScopedKey('spendwise_expenses', activeUserRef.current);
    localStorage.setItem(key, JSON.stringify(expenses));
  }, [expenses]);

  // Persist EMIs when they change
  useEffect(() => {
    if (!isInitialLoadDone.current) return;
    const key = getScopedKey('spendwise_emis', activeUserRef.current);
    localStorage.setItem(key, JSON.stringify(emis));
  }, [emis]);

  // Persist Goal when it changes
  useEffect(() => {
    if (!isInitialLoadDone.current) return;
    const key = getScopedKey('spendwise_goal', activeUserRef.current);
    if (monthlyGoal) {
      localStorage.setItem(key, JSON.stringify(monthlyGoal));
    } else {
      localStorage.removeItem(key);
    }
  }, [monthlyGoal]);

  // Persist Badges when they change
  useEffect(() => {
    if (!isInitialLoadDone.current) return;
    const key = getScopedKey('spendwise_badges', activeUserRef.current);
    localStorage.setItem(key, JSON.stringify(unlockedBadges));
  }, [unlockedBadges]);

  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7);

  const [newExpense, setNewExpense] = useState({
    title: "",
    category: "Food",
    amount: "",
    payment_method: "UPI",
    date: today,
    is_recurring: false
  });

  const allExpenses = useMemo(() => {
    // Hide demo data if the user has actually onboarded
    const base = onboardingData ? expenses.filter(e => !demoExpenses.some(d => d.id === e.id)) : [...expenses];
    
    if (onboardingData?.currentSpend && Number(onboardingData.currentSpend) > 0) {
      if (!base.some(e => e.id === "onboarding-spend")) {
        base.push({
          id: "onboarding-spend",
          title: "Initial Monthly Spend",
          category: "Miscellaneous",
          amount: Number(onboardingData.currentSpend),
          date: `${currentMonth}-01`,
          payment_method: "Other"
        });
      }
    }

    if (onboardingData?.monthlyInvestment && Number(onboardingData.monthlyInvestment) > 0) {
      if (!base.some(e => e.id === "onboarding-invest")) {
        base.push({
          id: "onboarding-invest",
          title: "Initial Monthly Investment",
          category: "Invest",
          amount: Number(onboardingData.monthlyInvestment),
          date: `${currentMonth}-01`,
          payment_method: "Other"
        });
      }
    }
    
    return base;
  }, [expenses, onboardingData, currentMonth]);

  const dynamicMonthlyTrend = useMemo(() => {
    const monthMap: Record<string, { spent: number }> = {};
    
    allExpenses.forEach(e => {
      const ym = e.date.slice(0, 7);
      if (!monthMap[ym]) monthMap[ym] = { spent: 0 };
      monthMap[ym].spent += e.amount;
    });

    if (!monthMap[currentMonth]) {
      monthMap[currentMonth] = { spent: 0 };
    }

    const income = Number(onboardingData?.income || 60000);
    const inv = Number(onboardingData?.monthlyInvestment || 0);

    return Object.entries(monthMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([ym, data]) => {
        const d = new Date(ym + "-01");
        return {
          month: d.toLocaleDateString('en-US', { month: 'short' }),
          spent: data.spent,
          saved: income - data.spent - inv
        };
      });
  }, [allExpenses, onboardingData, currentMonth]);

  const dynamicInvestmentTrend = useMemo(() => {
    const monthMap: Record<string, { invested: number }> = {};
    
    allExpenses.filter(e => e.category === 'Invest').forEach(e => {
      const ym = e.date.slice(0, 7);
      if (!monthMap[ym]) monthMap[ym] = { invested: 0 };
      monthMap[ym].invested += e.amount;
    });

    if (!monthMap[currentMonth]) {
      monthMap[currentMonth] = { invested: 0 };
    }

    return Object.entries(monthMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([ym, data]) => {
        const d = new Date(ym + "-01");
        return {
          month: d.toLocaleDateString('en-US', { month: 'short' }),
          invested: data.invested
        };
      });
  }, [allExpenses, currentMonth]);

  const totalSpent = useMemo(() => allExpenses
    .filter((e) => e.date.startsWith(currentMonth))
    .reduce((sum, e) => sum + e.amount, 0), [allExpenses, currentMonth]);

  const monthlyIncome = onboardingData?.income ? Number(onboardingData.income) : 60000;
  const investment = onboardingData?.monthlyInvestment ? Number(onboardingData.monthlyInvestment) : 7000;
  const saved = monthlyIncome - totalSpent - investment;
  const savingsRate = monthlyIncome > 0 ? ((saved / monthlyIncome) * 100).toFixed(1) : "0";

  // Real month-over-month comparisons (unlocked after next month / when history exists)
  const prevMonthData = useMemo(() => {
    if (dynamicMonthlyTrend.length < 2) return null;
    return dynamicMonthlyTrend[dynamicMonthlyTrend.length - 2];
  }, [dynamicMonthlyTrend]);

  const prevInvestmentData = useMemo(() => {
    if (dynamicInvestmentTrend.length < 2) return null;
    return dynamicInvestmentTrend[dynamicInvestmentTrend.length - 2];
  }, [dynamicInvestmentTrend]);

  const spentDeltaInfo = useMemo(() => {
    if (!prevMonthData) {
      return {
        text: "Comparison available next month",
        type: "neutral" as const
      };
    }
    const prevSpent = prevMonthData.spent;
    if (prevSpent === 0) {
      return {
        text: totalSpent > 0 ? "First month with expenses" : `Same as ${prevMonthData.month}`,
        type: "neutral" as const
      };
    }
    const diff = totalSpent - prevSpent;
    const pct = ((diff) / prevSpent) * 100;
    const pctStr = Math.abs(pct).toFixed(1);
    if (diff < 0) {
      return {
        text: `${pctStr}% lower than ${prevMonthData.month}`,
        type: "positive" as const
      };
    } else if (diff > 0) {
      return {
        text: `${pctStr}% higher than ${prevMonthData.month}`,
        type: "negative" as const
      };
    }
    return {
      text: `Same as ${prevMonthData.month}`,
      type: "neutral" as const
    };
  }, [prevMonthData, totalSpent]);

  const investedDeltaInfo = useMemo(() => {
    if (!prevInvestmentData) {
      return {
        text: "Comparison available next month",
        type: "neutral" as const
      };
    }
    const prevInvested = prevInvestmentData.invested;
    const diff = investment - prevInvested;
    if (diff > 0) {
      return {
        text: `+${money(diff)} vs ${prevInvestmentData.month}`,
        type: "positive" as const
      };
    } else if (diff < 0) {
      return {
        text: `-${money(Math.abs(diff))} vs ${prevInvestmentData.month}`,
        type: "negative" as const
      };
    }
    return {
      text: `Same as ${prevInvestmentData.month}`,
      type: "neutral" as const
    };
  }, [prevInvestmentData, investment]);

  const dynamicCategoryBreakdown = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const expense of allExpenses) {
      if (expense.date.startsWith(currentMonth)) {
        totals[expense.category] = (totals[expense.category] || 0) + expense.amount;
      }
    }
    
    const breakdown = Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    if (breakdown.length === 0 && !onboardingData) return categoryBreakdown;
    return breakdown;
  }, [allExpenses, currentMonth, onboardingData]);

  const financialReportData = useMemo(() => {
    let needsSum = 0;
    let wantsSum = 0;
    let investSum = 0;

    const needsCategories = ["Food", "Transport", "Housing", "EMI", "Utilities"];
    const wantsCategories = ["Entertainment", "Shopping", "Miscellaneous", "Subscriptions"];

    for (const expense of allExpenses) {
      if (expense.date.startsWith(currentMonth)) {
        if (expense.category === "Invest" || expense.category === "Savings") {
          investSum += expense.amount;
        } else if (needsCategories.includes(expense.category)) {
          needsSum += expense.amount;
        } else if (wantsCategories.includes(expense.category)) {
          wantsSum += expense.amount;
        } else {
          needsSum += expense.amount; 
        }
      }
    }

    const inc = monthlyIncome || 1;
    const needsPct = (needsSum / inc) * 100;
    const wantsPct = (wantsSum / inc) * 100;
    const investPct = (investSum / inc) * 100;

    let score = 100;
    
    if (needsPct > 50) score -= (needsPct - 50) * 1.5;
    if (wantsPct > 30) score -= (wantsPct - 30) * 2;
    if (investPct < 20) score -= (20 - investPct) * 2;
    if (investPct > 20) score += (investPct - 20) * 1;

    score = Math.max(0, Math.min(100, Math.round(score)));

    let status = "Needs Attention";
    let statusColor = "text-red-400";
    if (score >= 80) { status = "Excellent"; statusColor = "text-emerald-400"; }
    else if (score >= 60) { status = "Good"; statusColor = "text-blue-400"; }
    else if (score >= 40) { status = "Fair"; statusColor = "text-yellow-400"; }

    return { needsSum, wantsSum, investSum, needsPct, wantsPct, investPct, score, status, statusColor };
  }, [allExpenses, currentMonth, monthlyIncome]);

  const comprehensiveTrendData = useMemo(() => {
    const monthMap: Record<string, { spent: number, invested: number }> = {};
    
    allExpenses.forEach(e => {
      const ym = e.date.slice(0, 7);
      if (!monthMap[ym]) monthMap[ym] = { spent: 0, invested: 0 };
      if (e.category === 'Invest') monthMap[ym].invested += e.amount;
      else monthMap[ym].spent += e.amount;
    });

    if (!monthMap[currentMonth]) {
      monthMap[currentMonth] = { spent: 0, invested: 0 };
    }

    return Object.entries(monthMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([ym, data]) => {
        const d = new Date(ym + "-01");
        return {
          month: d.toLocaleDateString('en-US', { month: 'short' }),
          Income: monthlyIncome,
          Expenses: data.spent,
          Investments: data.invested
        };
      });
  }, [allExpenses, currentMonth, monthlyIncome]);

  useEffect(() => {
    if (!onboardingData || allExpenses.length === 0) return;
    
    let newUnlocks = false;
    const currentUnlocks = { ...unlockedBadges };
    const income = Number(onboardingData.income || 60000);
    
    BADGES.forEach(badge => {
      if (!currentUnlocks[badge.id]) {
        let isUnlocked = false;
        try {
          if (badge.id === "goal_crusher") {
            isUnlocked = financialReportData.score === 100;
          } else if (badge.id === "collector") {
            isUnlocked = Object.keys(currentUnlocks).length >= 5;
          } else if (badge.id === "champion") {
            isUnlocked = Object.keys(currentUnlocks).length >= 19;
          } else {
            isUnlocked = badge.evaluate(allExpenses, income, emis);
          }
        } catch(e) {}

        if (isUnlocked) {
          currentUnlocks[badge.id] = new Date().toISOString();
          newUnlocks = true;
          // Optionally trigger a toast notification here
        }
      }
    });

    if (newUnlocks) {
      setUnlockedBadges(currentUnlocks);
      const activeUser = activeUserRef.current;
      const key = getScopedKey('spendwise_badges', activeUser);
      localStorage.setItem(key, JSON.stringify(currentUnlocks));
    }
  }, [allExpenses, emis, financialReportData.score, onboardingData]);

  async function signOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {}
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (e) {}
    localStorage.removeItem('spendwise_onboarding');
    localStorage.removeItem('spendwise_session');
    localStorage.removeItem('spendwise_active_user');
    window.location.replace("/");
  }

  const [newEmi, setNewEmi] = useState({
    title: "",
    principal: "",
    tenureMonths: "",
    monthlyAmount: "",
    deductionDate: "1",
    monthsPaid: "0"
  });

  function addExpense() {
    const amount = Number(newExpense.amount);
    if (!newExpense.title || !amount) return;
    const newExp = {
      id: crypto.randomUUID(),
      title: newExpense.title,
      category: newExpense.category,
      amount,
      date: newExpense.date,
      payment_method: newExpense.payment_method,
      is_recurring: newExpense.is_recurring
    };
    setExpenses((prev) => [newExp, ...prev]);
    setNewExpense({ title: "", category: "Food", amount: "", payment_method: "UPI", date: today, is_recurring: false });
    setShowExpense(false);
  }

  function addEmi() {
    const principal = Number(newEmi.principal);
    const tenureMonths = Number(newEmi.tenureMonths);
    const monthlyAmount = Number(newEmi.monthlyAmount);
    const deductionDate = Number(newEmi.deductionDate);
    const monthsPaid = Number(newEmi.monthsPaid);

    if (!newEmi.title || !principal || !tenureMonths || !monthlyAmount || !deductionDate) return;
    
    const d = new Date();
    d.setMonth(d.getMonth() - monthsPaid);
    const calculatedStartDate = d.toISOString().slice(0, 10);

    const emiObj: EMI = {
      id: crypto.randomUUID(),
      title: newEmi.title,
      principal,
      tenureMonths,
      monthlyAmount,
      deductionDate,
      startDate: calculatedStartDate
    };

    setEmis((prev) => [...prev, emiObj]);
    setNewEmi({ title: "", principal: "", tenureMonths: "", monthlyAmount: "", deductionDate: "1", monthsPaid: "0" });
    setShowEmiModal(false);
  }

  const nav = [
    ["Dashboard", LayoutDashboard],
    ["Transactions", ReceiptText],
    ["Budgets", Target],
    ["Investments", TrendingUp],
    ["EMIs", CreditCard],
    ["Reports", BarChart3]
  ] as const;
  if (!onboardingData) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#08070b] text-zinc-400">
        Loading your dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08070b]">
      <div className="flex min-h-screen">
        <aside className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-zinc-800 bg-[#0b0910] p-6 transition-transform lg:static lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-black tracking-tight">SPEND<span className="text-violet-400">WISE</span></div>
              <div className="mt-1 text-xs text-zinc-600">Personal finance OS</div>
            </div>
            <button className="lg:hidden text-zinc-400" onClick={() => setMobileOpen(false)}><X /></button>
          </div>

          <div className="mt-10 space-y-2">
            {nav.map(([label, Icon]) => (
              <button
                key={label}
                onClick={() => { setActive(label); setMobileOpen(false); }}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold ${active === label ? "bg-violet-500/12 text-violet-300 ring-1 ring-violet-500/15" : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"}`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>

          <div className="mt-8 border-t border-zinc-800 pt-5 space-y-2">
            <button onClick={() => { setActive("Reports"); setMobileOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold ${active === "Reports" ? "bg-violet-500/12 text-violet-300 ring-1 ring-violet-500/15" : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"}`}><ShieldCheck size={18}/> Financial Score</button>
            <button onClick={() => { setActive("Achievements"); setMobileOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold ${active === "Achievements" ? "bg-violet-500/12 text-violet-300 ring-1 ring-violet-500/15" : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"}`}><Sparkles size={18}/> Achievements</button>
            <button onClick={() => { setActive("Settings"); setMobileOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold ${active === "Settings" ? "bg-violet-500/12 text-violet-300 ring-1 ring-violet-500/15" : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"}`}><Settings size={18}/> Settings</button>
          </div>

          <div className="mt-4 border-t border-zinc-900 pt-3 pb-24 px-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-600">
            <Link href="/terms" target="_blank" className="hover:text-zinc-400">Terms</Link>
            <span>•</span>
            <Link href="/privacy" target="_blank" className="hover:text-zinc-400">Privacy</Link>
            <span>•</span>
            <Link href="/disclaimer" target="_blank" className="hover:text-zinc-400">Disclaimer</Link>
            <span>•</span>
            <Link href="/contact" target="_blank" className="hover:text-zinc-400">Support</Link>
          </div>

          <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="text-xs text-zinc-600">SIGNED IN AS</div>
            <div className="mt-1 truncate text-sm text-zinc-300">{onboardingData?.name || onboardingData?.username || onboardingData?.email || userEmail || "demo@spendwise.app"}</div>
            <button onClick={signOut} className="mt-4 flex items-center gap-2 text-sm text-zinc-500 hover:text-red-300"><LogOut size={16}/> Sign out</button>
          </div>
        </aside>

        {mobileOpen && <button aria-label="Close menu" className="fixed inset-0 z-30 bg-black/70 lg:hidden" onClick={() => setMobileOpen(false)} />}

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-zinc-800/80 bg-[#08070b]/85 backdrop-blur">
            <div className="flex items-center justify-between px-5 py-4 lg:px-8">
              <div className="flex items-center gap-3">
                <button className="lg:hidden text-zinc-400" onClick={() => setMobileOpen(true)}><Menu /></button>
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-zinc-600">
                    {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </div>
                  <div className="mt-1 text-lg font-bold">{active}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={() => setShowExpense(true)} className="hidden items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-400 sm:flex">
                  <Plus size={17}/> Add expense
                </button>
                <div className="relative">
                  <button 
                    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                    className="grid h-10 w-10 place-items-center rounded-full bg-violet-500/15 text-sm font-black text-violet-300 hover:bg-violet-500/25 transition-colors"
                  >
                    {(onboardingData?.name?.[0] ?? onboardingData?.username?.[0] ?? userEmail?.[0] ?? "U").toUpperCase()}
                  </button>
                  
                  {profileMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl">
                      <div className="px-3 py-2">
                        <div className="text-xs text-zinc-500">Signed in as</div>
                        <div className="truncate text-sm font-semibold">{onboardingData?.name || onboardingData?.username || onboardingData?.email || userEmail || "Guest User"}</div>
                        {onboardingData?.email && (
                          <div className="truncate text-xs text-zinc-500">{onboardingData.email}</div>
                        )}
                      </div>
                      <div className="my-1 h-px bg-zinc-800" />
                      <button onClick={() => { setActive("Settings"); setProfileMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200">
                        <Settings size={16} /> Settings
                      </button>
                      <button onClick={signOut} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-400 hover:bg-zinc-900 hover:text-red-300">
                        <LogOut size={16} /> Sign out & Reset
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-7xl p-5 lg:p-8">
            {active === "Dashboard" && (
              <section className="mb-8 rounded-3xl border border-violet-500/15 bg-gradient-to-br from-violet-500/10 via-zinc-950 to-zinc-950 p-6 lg:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <div className="text-sm text-zinc-500">{new Date().toLocaleDateString('en-US', { month: 'long' })} overview</div>
                    <h1 className="mt-2 text-3xl font-black tracking-tight lg:text-4xl">Your money, under control.</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
                      You have spent {money(totalSpent)} this month and invested {money(investment)}. Your current projected savings are {money(saved)}.
                    </p>
                  </div>

                  <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-black/30 p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-500">Financial health</span>
                      <span className="font-black text-violet-300">82 / 100</span>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-800">
                      <div className="h-full w-[82%] rounded-full bg-violet-500" />
                    </div>
                    <div className="mt-2 text-xs text-zinc-600">Strong progress. Keep discretionary spending below your budget.</div>
                  </div>
                </div>
              </section>
            )}

            {active === "Dashboard" ? (
              <>
                {!monthlyGoal ? (
                  <section className="mb-6 flex items-center justify-between rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/50 p-6">
                    <div>
                      <h3 className="font-bold text-zinc-300">Set a Monthly Goal</h3>
                      <p className="mt-1 text-sm text-zinc-500">Track a specific target like investing or saving.</p>
                    </div>
                    <button onClick={() => setShowGoalModal(true)} className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-bold text-white hover:bg-violet-400">
                      Set Goal
                    </button>
                  </section>
                ) : (
                  <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-zinc-300">Monthly Goal: {monthlyGoal.category}</h3>
                        <p className="mt-1 text-sm text-zinc-500">Target: {money(Number(monthlyGoal.amount))}</p>
                      </div>
                      <button onClick={() => setShowGoalModal(true)} className="text-sm font-medium text-violet-400 hover:text-violet-300">Edit Goal</button>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-900">
                      <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${Math.min(((monthlyGoal.category === 'Invest' ? investment : monthlyGoal.category === 'Save' ? saved : totalSpent) / Number(monthlyGoal.amount)) * 100, 100)}%` }} />
                    </div>
                    <div className="mt-2 text-xs font-medium text-zinc-500">
                      {money(monthlyGoal.category === 'Invest' ? investment : monthlyGoal.category === 'Save' ? saved : totalSpent)} / {money(Number(monthlyGoal.amount))} achieved
                    </div>
                  </section>
                )}

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <MetricCard label={onboardingData?.userType === "Student" ? "Pocket money" : "Monthly income"} value={money(monthlyIncome)} delta="On track" deltaType="positive" icon={Wallet}/>
                  <MetricCard label="Spent" value={money(totalSpent)} delta={spentDeltaInfo.text} deltaType={spentDeltaInfo.type} icon={ArrowDownRight} onClick={() => setActive("Transactions")}/>
                  <MetricCard label="Saved" value={money(saved)} delta={`${savingsRate}% savings rate`} deltaType={Number(savingsRate) >= 20 ? "positive" : "neutral"} icon={PiggyBank}/>
                  <MetricCard label="Invested" value={money(investment)} delta={investedDeltaInfo.text} deltaType={investedDeltaInfo.type} icon={TrendingUp}/>
                </section>

                <section className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 lg:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="font-bold">Spending trend</h2>
                        <p className="mt-1 text-xs text-zinc-600">
                          {dynamicMonthlyTrend.length < 2 ? "First month tracking" : "Last six months"}
                        </p>
                      </div>
                      {dynamicMonthlyTrend.length < 2 ? (
                        <div className="rounded-lg bg-violet-500/10 px-3 py-1.5 text-xs text-violet-300 border border-violet-500/20 font-medium">
                          Comparison unlocks next month
                        </div>
                      ) : (
                        <div className="rounded-lg bg-zinc-900 px-3 py-2 text-xs text-zinc-500">Monthly</div>
                      )}
                    </div>
                    <div className="mt-6 h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dynamicMonthlyTrend}>
                          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false}/>
                          <XAxis dataKey="month" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false}/>
                          <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false}/>
                          <Tooltip contentStyle={{ background: "#111018", border: "1px solid #29243a", borderRadius: 14 }}/>
                          <Legend />
                          <Line type="monotone" dataKey="spent" stroke="#8b5cf6" strokeWidth={3} dot={false}/>
                          <Line type="monotone" dataKey="saved" stroke="#4ade80" strokeWidth={3} dot={false}/>
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 lg:p-6">
                    <div>
                      <h2 className="font-bold">Category breakdown</h2>
                      <p className="mt-1 text-xs text-zinc-600">Where this month&apos;s money went</p>
                    </div>
                    <div className="mt-5 space-y-4">
                      {dynamicCategoryBreakdown.map((row) => {
                        const pct = totalSpent > 0 ? Math.round((row.value / totalSpent) * 100) : 0;
                        const Icon = iconForCategory[row.name] ?? CircleDollarSign;
                        return (
                          <div key={row.name}>
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-3">
                                <div className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-900 text-zinc-500"><Icon size={15}/></div>
                                <span className="text-zinc-300">{row.name}</span>
                              </div>
                              <span className="font-semibold">{money(row.value)}</span>
                            </div>
                            <div className="mt-2 flex items-center gap-3">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-900"><div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.min(pct, 100)}%` }}/></div>
                              <span className="w-9 text-right text-xs text-zinc-600">{pct}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>

                <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 lg:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="font-bold">Recent transactions</h2>
                        <p className="mt-1 text-xs text-zinc-600">Latest recorded activity</p>
                      </div>
                      <button className="text-xs font-semibold text-violet-300" onClick={() => setActive("Transactions")}>View all</button>
                    </div>
                    <div className="mt-5 divide-y divide-zinc-900">
                      {allExpenses.length === 0 ? (
                        <div className="py-8 text-center text-sm text-zinc-500">
                          No recent transactions found. Add an expense to see it here!
                        </div>
                      ) : (
                        allExpenses.slice(0, 6).map((e) => {
                          const Icon = iconForCategory[e.category] ?? CircleDollarSign;
                          return (
                            <div key={e.id} className="flex items-center justify-between py-4">
                              <div className="flex items-center gap-3">
                                <div className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-900 text-zinc-500"><Icon size={17}/></div>
                                <div>
                                  <div className="text-sm font-semibold flex items-center gap-2">
                                    {e.title}
                                    {e.is_recurring && <span className="inline-flex items-center rounded bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-300 ring-1 ring-inset ring-violet-500/20">Recurring</span>}
                                  </div>
                                  <div className="mt-1 text-xs text-zinc-600">{e.category} • {e.payment_method} • {e.date}</div>
                                </div>
                              </div>
                              <div className="text-sm font-bold">{money(e.amount)}</div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 lg:p-6">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10 text-violet-300"><Sparkles size={18}/></div>
                      <div>
                        <h2 className="font-bold">Monthly insight</h2>
                        <p className="text-xs text-zinc-600">Generated from your activity</p>
                      </div>
                    </div>
                    <div className="mt-5 space-y-4 text-sm leading-6 text-zinc-400">
                      <p><span className="text-white">{dynamicCategoryBreakdown.length > 0 ? dynamicCategoryBreakdown[0].name : "No expenses yet"}</span> is currently your largest expense category this month.</p>
                      <p>Your current savings rate stands at <span className="text-violet-300">{savingsRate}%</span>.</p>
                      {dynamicCategoryBreakdown.length > 1 && (
                        <p><span className="text-white">{dynamicCategoryBreakdown[1].name}</span> is your second highest expense. Keep an eye on it to maximize your savings.</p>
                      )}
                    </div>
                    <div className="mt-6 rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300"><ArrowUpRight size={16}/> New achievement</div>
                      <div className="mt-2 text-sm text-zinc-400">{Number(savingsRate) >= 20 ? "Consistent Saver — you're saving more than 20% of your income!" : "Keep it up — you're on the path to better financial health."}</div>
                    </div>
                  </div>
                </section>
              </>
            ) : active === "Transactions" ? (
              <section className="space-y-6">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-bold">Spending trend</h2>
                      <p className="mt-1 text-xs text-zinc-600">
                        {dynamicMonthlyTrend.length < 2 ? "First month tracking" : "Last six months"}
                      </p>
                    </div>
                    {dynamicMonthlyTrend.length < 2 ? (
                      <div className="rounded-lg bg-violet-500/10 px-3 py-1.5 text-xs text-violet-300 border border-violet-500/20 font-medium">
                        Comparison unlocks next month
                      </div>
                    ) : (
                      <div className="rounded-lg bg-zinc-900 px-3 py-2 text-xs text-zinc-500">Monthly</div>
                    )}
                  </div>
                  <div className="mt-6 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dynamicMonthlyTrend}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false}/>
                        <XAxis dataKey="month" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false}/>
                        <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false}/>
                        <Tooltip contentStyle={{ background: "#111018", border: "1px solid #29243a", borderRadius: 14 }}/>
                        <Legend />
                        <Line type="monotone" dataKey="spent" stroke="#8b5cf6" strokeWidth={3} dot={false}/>
                        <Line type="monotone" dataKey="saved" stroke="#4ade80" strokeWidth={3} dot={false}/>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 lg:p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <h2 className="font-bold">All Transactions</h2>
                      <p className="mt-1 text-xs text-zinc-600">Your entire expense history</p>
                    </div>
                  </div>
                  <div className="divide-y divide-zinc-900">
                    {allExpenses.length === 0 ? (
                      <div className="py-12 text-center text-zinc-500">
                        No transactions found. Start tracking your expenses today!
                      </div>
                    ) : (
                      allExpenses.map((e) => {
                        const Icon = iconForCategory[e.category] ?? CircleDollarSign;
                        return (
                          <div key={e.id} className="flex items-center justify-between py-4 hover:bg-zinc-900/50 -mx-4 px-4 rounded-xl transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-900 text-zinc-500"><Icon size={17}/></div>
                              <div>
                                <div className="text-sm font-semibold flex items-center gap-2">
                                  {e.title} 
                                  {e.is_recurring && <span className="inline-flex items-center rounded bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-300 ring-1 ring-inset ring-violet-500/20">Recurring</span>}
                                </div>
                                <div className="mt-1 text-xs text-zinc-600">{e.category} • {e.payment_method} • {e.date}</div>
                              </div>
                            </div>
                            <div className="text-sm font-bold">{money(e.amount)}</div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </section>
            ) : active === "Budgets" ? (
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black">Savings Analysis</h2>
                    <p className="mt-1 text-sm text-zinc-500">Track and forecast your savings</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col justify-center">
                    <h3 className="text-sm font-semibold text-zinc-400">Total Savings (This Month)</h3>
                    <div className="mt-4 text-4xl font-black text-emerald-400">{money(saved)}</div>
                    <div className="mt-2 text-sm text-zinc-500">
                      Your current savings rate is <span className="font-bold text-white">{savingsRate}%</span>. 
                      {dynamicMonthlyTrend.length >= 2 ? (
                        <span className="block mt-1">Last month you saved <strong className="text-white">{money(dynamicMonthlyTrend[dynamicMonthlyTrend.length - 2].saved)}</strong>.</span>
                      ) : (
                        <span className="block mt-1 text-zinc-500">First month tracking — month-over-month comparisons unlock next month.</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
                    <h3 className="text-sm font-semibold text-zinc-400">1-Year Forecast</h3>
                    <div className="mt-4 text-4xl font-black text-violet-400">{money(saved > 0 ? saved * 12 : 0)}</div>
                    <div className="mt-2 text-sm text-zinc-500">
                      By keeping up this month's average, you can accumulate up to this amount in a year!
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 lg:p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <h2 className="font-bold">Historical Savings Trend</h2>
                      <p className="mt-1 text-xs text-zinc-600">Your savings over the past 6 months</p>
                    </div>
                  </div>
                  <div className="mt-6 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dynamicMonthlyTrend}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false}/>
                        <XAxis dataKey="month" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false}/>
                        <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false}/>
                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: "#111018", border: "1px solid #29243a", borderRadius: 14 }}/>
                        <Legend />
                        <Bar name="Saved Amount" dataKey="saved" fill="#4ade80" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-500/15 bg-gradient-to-br from-emerald-500/10 via-zinc-950 to-zinc-950 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/20 text-emerald-400"><Target size={18}/></div>
                    <div>
                      <h2 className="font-bold">Smart Analysis</h2>
                      <p className="text-xs text-emerald-500/70">Actionable insights</p>
                    </div>
                  </div>
                  <div className="space-y-4 text-sm leading-6 text-zinc-300">
                    <p>
                      {Number(savingsRate) >= 20 
                        ? `Excellent job! You are saving ${savingsRate}%, which exceeds the recommended 20% target.` 
                        : `You are saving ${savingsRate}%. Try reducing your 'Wants' to hit the recommended 20% savings target.`}
                    </p>
                    {dynamicCategoryBreakdown.length > 0 && (
                      <p>
                        Your largest expense category is <strong>{dynamicCategoryBreakdown[0].name}</strong> ({money(dynamicCategoryBreakdown[0].value)}). 
                        Cutting this down by just 10% would instantly boost your annual savings by <span className="font-bold text-emerald-400">{money(dynamicCategoryBreakdown[0].value * 0.1 * 12)}</span>.
                      </p>
                    )}
                  </div>
                </div>
              </section>
            ) : active === "Investments" ? (
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black">Investments</h2>
                  <button onClick={() => { setNewExpense({...newExpense, category: 'Invest'}); setShowExpense(true); }} className="flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-400">
                    <Plus size={17}/> Add Investment
                  </button>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <MetricCard label="Total Invested (This Month)" value={money(allExpenses.filter(e => e.category === 'Invest' && e.date.startsWith(currentMonth)).reduce((sum, e) => sum + e.amount, 0))} icon={TrendingUp}/>
                  <MetricCard label="All-time Investments" value={money(allExpenses.filter(e => e.category === 'Invest').reduce((sum, e) => sum + e.amount, 0))} icon={PiggyBank}/>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 lg:p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <h2 className="font-bold">Investment Growth</h2>
                      <p className="mt-1 text-xs text-zinc-600">Your historical investments</p>
                    </div>
                  </div>
                  <div className="mt-6 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dynamicInvestmentTrend}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false}/>
                        <XAxis dataKey="month" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false}/>
                        <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false}/>
                        <Tooltip contentStyle={{ background: "#111018", border: "1px solid #29243a", borderRadius: 14 }}/>
                        <Legend />
                        <Line type="monotone" name="Invested" dataKey="invested" stroke="#10b981" strokeWidth={3} dot={false}/>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 lg:p-6">
                  <h2 className="font-bold">Investment History</h2>
                  <p className="mt-1 mb-5 text-xs text-zinc-600">All your investment transactions</p>
                  <div className="divide-y divide-zinc-900">
                    {allExpenses.filter(e => e.category === 'Invest').length === 0 ? (
                      <div className="py-12 text-center text-zinc-500">
                        No investments found. Start investing for your future!
                      </div>
                    ) : (
                      allExpenses.filter(e => e.category === 'Invest').map((e) => {
                        const Icon = iconForCategory[e.category] ?? CircleDollarSign;
                        return (
                          <div key={e.id} className="flex items-center justify-between py-4 hover:bg-zinc-900/50 -mx-4 px-4 rounded-xl transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-900 text-zinc-500"><Icon size={17}/></div>
                              <div>
                                <div className="text-sm font-semibold flex items-center gap-2">
                                  {e.title}
                                  {e.is_recurring && <span className="inline-flex items-center rounded bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-300 ring-1 ring-inset ring-violet-500/20">Recurring</span>}
                                </div>
                                <div className="mt-1 text-xs text-zinc-600">{e.date} • {e.payment_method}</div>
                              </div>
                            </div>
                            <div className="text-sm font-bold">{money(e.amount)}</div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </section>
            ) : active === "EMIs" ? (
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black">Active EMIs</h2>
                    <p className="mt-1 text-sm text-zinc-500">Track and auto-deduct your monthly loans and EMIs</p>
                  </div>
                  <button onClick={() => setShowEmiModal(true)} className="flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-400">
                    <Plus size={17}/> Add EMI
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {emis.length === 0 ? (
                    <div className="col-span-full rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center text-zinc-500">
                      You don't have any active EMIs.
                    </div>
                  ) : (
                    emis.map((emi) => {
                      const start = new Date(emi.startDate);
                      const now = new Date();
                      let monthsPassed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
                      if (now.getDate() < emi.deductionDate) {
                        monthsPassed = Math.max(0, monthsPassed - 1);
                      }
                      const paidMonths = Math.max(0, Math.min(emi.tenureMonths, monthsPassed));
                      const pct = Math.min(100, (paidMonths / emi.tenureMonths) * 100);

                      const totalInterest = Math.max(0, (emi.tenureMonths * emi.monthlyAmount) - emi.principal);
                      const interestPerMonth = totalInterest / emi.tenureMonths;
                      const interestPaid = paidMonths * interestPerMonth;

                      return (
                        <div key={emi.id} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold">{emi.title}</h3>
                            <div className="grid h-8 w-8 place-items-center rounded-lg bg-red-500/10 text-red-400"><CreditCard size={15}/></div>
                          </div>
                          <div className="mt-4 text-2xl font-black">{money(emi.monthlyAmount)}<span className="text-xs font-normal text-zinc-500"> /mo</span></div>
                          
                          <div className="mt-5 mb-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-900">
                            <div className="h-full rounded-full bg-violet-500" style={{ width: `${pct}%` }} />
                          </div>
                          <div className="text-xs text-zinc-500 mb-4">{paidMonths} of {emi.tenureMonths} months paid</div>

                          <div className="space-y-2 text-sm text-zinc-400">
                            <div className="flex justify-between"><span>Product Amount</span><span className="text-white">{money(emi.principal)}</span></div>
                            <div className="flex justify-between"><span>Interest Paid</span><span className="text-red-400 font-semibold">{money(interestPaid)}</span></div>
                            <div className="flex justify-between"><span>Total Paid</span><span className="text-emerald-400 font-semibold">{money(paidMonths * emi.monthlyAmount)}</span></div>
                            <div className="flex justify-between"><span>Auto-deduct</span><span className="text-violet-300">Day {emi.deductionDate}</span></div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            ) : active === "Reports" ? (
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black">Financial Health Report</h2>
                    <p className="mt-1 text-sm text-zinc-500">Based on the 50/30/20 Rule</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="col-span-1 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col justify-center items-center text-center">
                    <h3 className="text-sm font-semibold text-zinc-400">Financial Score</h3>
                    <div className="mt-4 text-6xl font-black">{financialReportData.score}</div>
                    <div className={`mt-2 font-bold ${financialReportData.statusColor}`}>{financialReportData.status}</div>
                    <p className="mt-4 text-xs text-zinc-500 leading-relaxed">
                      This score evaluates your adherence to the 50/30/20 budget framework.
                    </p>
                  </div>
                  
                  <div className="col-span-2 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col lg:flex-row gap-8 items-center">
                    <div className="flex-1 w-full space-y-6">
                      <h3 className="font-bold mb-6">Current Month Breakdown</h3>
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-medium text-zinc-300">Needs (Target 50%)</span>
                          <span className="text-zinc-500">{financialReportData.needsPct.toFixed(1)}% • {money(financialReportData.needsSum)}</span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-900">
                          <div className={`h-full rounded-full ${financialReportData.needsPct > 50 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, financialReportData.needsPct)}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-medium text-zinc-300">Wants (Target 30%)</span>
                          <span className="text-zinc-500">{financialReportData.wantsPct.toFixed(1)}% • {money(financialReportData.wantsSum)}</span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-900">
                          <div className={`h-full rounded-full ${financialReportData.wantsPct > 30 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, financialReportData.wantsPct)}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-medium text-zinc-300">Savings & Investments (Target 20%)</span>
                          <span className="text-zinc-500">{financialReportData.investPct.toFixed(1)}% • {money(financialReportData.investSum)}</span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-900">
                          <div className={`h-full rounded-full ${financialReportData.investPct < 20 ? 'bg-yellow-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, financialReportData.investPct)}%` }} />
                        </div>
                      </div>
                    </div>
                    
                    <div className="h-48 w-48 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie 
                            data={[
                              { name: 'Needs', value: financialReportData.needsSum, color: '#10b981' },
                              { name: 'Wants', value: financialReportData.wantsSum, color: '#f59e0b' },
                              { name: 'Savings', value: financialReportData.investSum, color: '#8b5cf6' }
                            ].filter(d => d.value > 0)} 
                            dataKey="value" 
                            cx="50%" cy="50%" 
                            innerRadius={60} outerRadius={80} 
                            stroke="none"
                          >
                            {
                              [
                                { name: 'Needs', value: financialReportData.needsSum, color: '#10b981' },
                                { name: 'Wants', value: financialReportData.wantsSum, color: '#f59e0b' },
                                { name: 'Savings', value: financialReportData.investSum, color: '#8b5cf6' }
                              ].filter(d => d.value > 0).map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)
                            }
                          </Pie>
                          <Tooltip contentStyle={{ background: "#111018", border: "1px solid #29243a", borderRadius: 14 }}/>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 lg:p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <h2 className="font-bold">Comprehensive Growth Timeline</h2>
                      <p className="mt-1 text-xs text-zinc-600">Comparing Income vs Expenses vs Investments</p>
                    </div>
                  </div>
                  <div className="mt-6 h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={comprehensiveTrendData}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false}/>
                        <XAxis dataKey="month" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false}/>
                        <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false}/>
                        <Tooltip contentStyle={{ background: "#111018", border: "1px solid #29243a", borderRadius: 14 }}/>
                        <Legend />
                        <Line type="monotone" dataKey="Income" stroke="#4ade80" strokeWidth={2} dot={false}/>
                        <Line type="monotone" dataKey="Expenses" stroke="#f87171" strokeWidth={2} dot={false}/>
                        <Line type="monotone" dataKey="Investments" stroke="#818cf8" strokeWidth={2} dot={false}/>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>
            ) : active === "Achievements" ? (
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black">Achievements</h2>
                    <p className="mt-1 text-sm text-zinc-500">Track your financial milestones and badges.</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-bold text-zinc-300">Earned Badges</h3>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {BADGES.filter(b => !!unlockedBadges[b.id]).map((badge) => {
                      const BadgeIcon = badge.icon;
                      return (
                        <button
                          key={badge.id}
                          onClick={() => setShowBadgeModal({ show: true, badgeId: badge.id })}
                          className={`group relative flex flex-col items-center justify-center rounded-2xl border p-6 text-center transition-all border-zinc-800 bg-zinc-950 hover:border-violet-500/50 hover:bg-zinc-900`}
                        >
                          <div className={`mb-4 grid h-12 w-12 place-items-center rounded-full ${badge.color.replace('text-', 'bg-').replace('400', '500/10')}`}>
                            <BadgeIcon className={badge.color} size={24} />
                          </div>
                          <h3 className={`text-sm font-bold text-zinc-200`}>{badge.name}</h3>
                        </button>
                      );
                    })}
                  </div>
                  {BADGES.filter(b => !!unlockedBadges[b.id]).length === 0 && <p className="text-zinc-500 text-sm">You haven't earned any badges yet. Keep tracking!</p>}
                </div>

                <div className="mt-10 space-y-4">
                  <h3 className="font-bold text-zinc-300">Locked Badges</h3>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {BADGES.filter(b => !unlockedBadges[b.id]).map((badge) => {
                      const BadgeIcon = badge.icon;
                      return (
                        <button
                          key={badge.id}
                          onClick={() => setShowBadgeModal({ show: true, badgeId: badge.id })}
                          className={`group relative flex flex-col items-center justify-center rounded-2xl border p-6 text-center transition-all border-zinc-900 bg-[#0a080d] opacity-50 hover:opacity-100 hover:border-zinc-700`}
                        >
                          <div className={`mb-4 grid h-12 w-12 place-items-center rounded-full bg-zinc-900`}>
                            <BadgeIcon className="text-zinc-600" size={24} />
                          </div>
                          <h3 className={`text-sm font-bold text-zinc-600 group-hover:text-zinc-400`}>{badge.name}</h3>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>
            ) : active === "Settings" ? (
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black">Settings</h2>
                    <p className="mt-1 text-sm text-zinc-500">Manage your account and preferences.</p>
                  </div>
                </div>
                
                <div className="max-w-xl space-y-6">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-4">
                    <h3 className="font-bold">Profile Information</h3>
                    <p className="text-sm text-zinc-500">Update your details. These numbers power your Financial Score and Savings Analysis.</p>
                    
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-sm">
                        <span className="mb-2 block text-zinc-500">Full Name</span>
                        <input className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-violet-500" value={editSettings.name} onChange={(e) => setEditSettings({...editSettings, name: e.target.value})} />
                      </label>
                      <label className="block text-sm">
                        <span className="mb-2 block text-zinc-500">Date of Birth</span>
                        <DatePicker value={editSettings.dob} onChange={(date) => setEditSettings({...editSettings, dob: date})} />
                      </label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <label className="text-sm">
                        <span className="mb-2 block text-zinc-500">Age</span>
                        <input type="number" className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-violet-500" value={editSettings.age} onChange={(e) => setEditSettings({...editSettings, age: e.target.value})} placeholder="e.g. 28" />
                      </label>
                      <label className="text-sm">
                        <span className="mb-2 block text-zinc-500">Gender</span>
                        <select className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-violet-500" value={editSettings.gender} onChange={(e) => setEditSettings({...editSettings, gender: e.target.value})}>
                          <option value="">Select...</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </label>
                      <label className="text-sm">
                        <span className="mb-2 block text-zinc-500">Occupation</span>
                        <input className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-violet-500" value={editSettings.occupation} onChange={(e) => setEditSettings({...editSettings, occupation: e.target.value})} placeholder="e.g. Engineer" />
                      </label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <label className="text-sm">
                        <span className="mb-2 block text-zinc-500">User Type</span>
                        <select className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-violet-500 text-zinc-300" value={editSettings.userType} onChange={(e) => setEditSettings({...editSettings, userType: e.target.value})}>
                          <option value="Professional">Professional</option>
                          <option value="Student">Student</option>
                        </select>
                      </label>
                      <label className="text-sm">
                        <span className="mb-2 block text-zinc-500">{editSettings.userType === "Student" ? "Pocket Money" : "Monthly Income"}</span>
                        <input type="number" className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-violet-500" value={editSettings.income} onChange={(e) => setEditSettings({...editSettings, income: e.target.value})} />
                      </label>
                      <label className="text-sm">
                        <span className="mb-2 block text-zinc-500">Monthly Investment Goal</span>
                        <input type="number" className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-violet-500" value={editSettings.monthlyInvestment} onChange={(e) => setEditSettings({...editSettings, monthlyInvestment: e.target.value})} />
                      </label>
                    </div>

                    <button 
                      onClick={async () => {
                        const activeUser = localStorage.getItem('spendwise_active_user') || onboardingData?.username || onboardingData?.name;
                        const newData = { 
                          ...onboardingData, 
                          ...editSettings,
                          username: onboardingData?.username || activeUser,
                          profileCompleted: true 
                        };
                        setOnboardingData(newData as any);
                        localStorage.setItem('spendwise_onboarding', JSON.stringify(newData));

                        // Persist into spendwise_users registry
                        const usersStr = localStorage.getItem('spendwise_users');
                        if (usersStr) {
                          try {
                            const users = JSON.parse(usersStr);
                            const uname = activeUser || (newData as any).username || (newData as any).name;
                            if (uname) {
                              users[uname] = { ...(users[uname] || {}), ...newData, profileCompleted: true, updatedAt: new Date().toISOString() };
                              localStorage.setItem('spendwise_users', JSON.stringify(users));
                            }
                          } catch (e) {}
                        }

                        // Persist to Supabase database via save-profile API
                        try {
                          await fetch('/api/user/save-profile', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(newData)
                          });
                        } catch (e) {}

                        alert('Settings saved successfully!');
                      }}
                      className="mt-4 rounded-xl bg-violet-500 px-6 py-2.5 font-bold text-white hover:bg-violet-400 transition-colors"
                    >
                      Save Changes
                    </button>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
                    <h3 className="font-bold">Legal &amp; Policies</h3>
                    <p className="mt-1 text-sm text-zinc-500 mb-4">Review our terms of use, privacy standards, and support center.</p>
                    <div className="grid gap-2.5 sm:grid-cols-2 text-sm">
                      <Link href="/terms" target="_blank" className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3.5 text-zinc-300 hover:border-violet-500/40 hover:text-white transition-all">
                        <span>Terms &amp; Conditions</span>
                        <ExternalLink size={14} className="text-zinc-500" />
                      </Link>
                      <Link href="/privacy" target="_blank" className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3.5 text-zinc-300 hover:border-violet-500/40 hover:text-white transition-all">
                        <span>Privacy Policy</span>
                        <ExternalLink size={14} className="text-zinc-500" />
                      </Link>
                      <Link href="/disclaimer" target="_blank" className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3.5 text-zinc-300 hover:border-violet-500/40 hover:text-white transition-all">
                        <span>Financial Disclaimer</span>
                        <ExternalLink size={14} className="text-zinc-500" />
                      </Link>
                      <Link href="/contact" target="_blank" className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3.5 text-zinc-300 hover:border-violet-500/40 hover:text-white transition-all">
                        <span>Help &amp; Support FAQ</span>
                        <ExternalLink size={14} className="text-zinc-500" />
                      </Link>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
                    <h3 className="font-bold">Data Management</h3>
                    <p className="mt-1 text-sm text-zinc-500 mb-6">Reset all your locally stored data. This action cannot be undone.</p>
                    <button 
                      onClick={() => {
                        if (confirm("Are you sure you want to completely reset all your data? This will log you out.")) {
                          localStorage.clear();
                          window.location.href = "/";
                        }
                      }}
                      className="rounded-xl bg-red-500/10 px-4 py-2 font-bold text-red-500 hover:bg-red-500/20 transition-colors"
                    >
                      Factory Reset Data
                    </button>
                  </div>
                </div>
              </section>
            ) : null}
          </div>
        </main>
      </div>

      {showExpense && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center p-5">
            <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-[#0d0b12] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.16em] text-zinc-600">Transaction</div>
                <h2 className="mt-1 text-2xl font-black">Add expense</h2>
              </div>
              <button onClick={() => setShowExpense(false)} className="text-zinc-500 hover:text-white"><X/></button>
            </div>

            <div className="mt-6 grid gap-4">
              <label className="text-sm">
                <span className="mb-2 block text-zinc-500">Title</span>
                <input className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-violet-500" value={newExpense.title} onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })} placeholder="Dinner with friends"/>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-2 block text-zinc-500">Amount</span>
                  <input type="number" className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-violet-500" value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })} placeholder="850"/>
                </label>

                <label className="text-sm">
                  <span className="mb-2 block text-zinc-500">Category</span>
                  <select className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-violet-500" value={newExpense.category} onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}>
                    {categories.map((category) => <option key={category}>{category}</option>)}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-2 block text-zinc-500">Date</span>
                  <DatePicker value={newExpense.date} onChange={(date) => setNewExpense({ ...newExpense, date })} />
                </label>

                <label className="text-sm">
                  <span className="mb-2 block text-zinc-500">Payment method</span>
                  <select className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-violet-500" value={newExpense.payment_method} onChange={(e) => setNewExpense({ ...newExpense, payment_method: e.target.value })}>
                    {["UPI", "Cash", "Card", "Bank"].map((x) => <option key={x}>{x}</option>)}
                  </select>
                </label>
              </div>

              <label className="mt-2 flex items-center gap-3 text-sm text-zinc-300">
                <input 
                  type="checkbox" 
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-violet-500 focus:ring-violet-500 focus:ring-offset-zinc-950" 
                  checked={newExpense.is_recurring} 
                  onChange={(e) => setNewExpense({ ...newExpense, is_recurring: e.target.checked })}
                />
                Mark as recurring monthly expense (e.g. SIP, subscriptions)
              </label>

              <button 
                onClick={addExpense} className="mt-2 rounded-xl bg-violet-500 px-4 py-3.5 font-bold text-white hover:bg-violet-400">Add expense</button>
            </div>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => setShowExpense(true)} className="fixed bottom-5 right-5 grid h-14 w-14 place-items-center rounded-2xl bg-violet-500 text-white shadow-xl shadow-violet-900/25 sm:hidden"><Plus/></button>

      {showEmiModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center p-5">
            <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-[#0d0b12] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.16em] text-zinc-600">EMI</div>
                <h2 className="mt-1 text-2xl font-black">Add New EMI</h2>
              </div>
              <button onClick={() => setShowEmiModal(false)} className="text-zinc-500 hover:text-white"><X/></button>
            </div>

            <div className="mt-6 grid gap-4">
              <label className="text-sm">
                <span className="mb-2 block text-zinc-500">Loan/EMI Name</span>
                <input className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-violet-500" value={newEmi.title} onChange={(e) => setNewEmi({ ...newEmi, title: e.target.value })} placeholder="Car Loan"/>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-2 block text-zinc-500">Product Amount (Principal)</span>
                  <input type="number" className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-violet-500" value={newEmi.principal} onChange={(e) => setNewEmi({ ...newEmi, principal: e.target.value })} placeholder="500000"/>
                </label>
                <label className="text-sm">
                  <span className="mb-2 block text-zinc-500">Monthly EMI Amount</span>
                  <input type="number" className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-violet-500" value={newEmi.monthlyAmount} onChange={(e) => setNewEmi({ ...newEmi, monthlyAmount: e.target.value })} placeholder="12500"/>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-2 block text-zinc-500">Time Period (Months)</span>
                  <input type="number" className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-violet-500" value={newEmi.tenureMonths} onChange={(e) => setNewEmi({ ...newEmi, tenureMonths: e.target.value })} placeholder="48"/>
                </label>

                <label className="text-sm">
                  <span className="mb-2 block text-zinc-500">Months Paid So Far</span>
                  <input type="number" className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-violet-500" value={newEmi.monthsPaid} onChange={(e) => setNewEmi({ ...newEmi, monthsPaid: e.target.value })} placeholder="0"/>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-2 block text-zinc-500">Deduction Date (1-31)</span>
                  <input type="number" min="1" max="31" className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-violet-500" value={newEmi.deductionDate} onChange={(e) => setNewEmi({ ...newEmi, deductionDate: e.target.value })} placeholder="5"/>
                </label>
              </div>

              <div className="mt-4 rounded-xl border border-violet-500/15 bg-violet-500/5 p-4 text-sm text-zinc-400 leading-relaxed">
                <strong className="text-violet-300">Auto-deduction active:</strong> On the <strong className="text-white">{newEmi.deductionDate}</strong> of every month, {newEmi.monthlyAmount ? <strong className="text-white">₹{newEmi.monthlyAmount}</strong> : "this amount"} will be automatically added to your expenses.
              </div>

              <button 
                onClick={addEmi} className="mt-2 rounded-xl bg-violet-500 px-4 py-3.5 font-bold text-white hover:bg-violet-400">Save EMI</button>
            </div>
            </div>
          </div>
        </div>
      )}

      {showBadgeModal.show && showBadgeModal.badgeId && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/80 backdrop-blur-md">
          <div className="flex min-h-full items-center justify-center p-5">
            <div className="relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-zinc-800 bg-[#0d0b12] p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200">
              
              {/* Glowing Background Effect */}
              <div className={`absolute left-1/2 top-0 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[3rem] ${BADGES.find(b => b.id === showBadgeModal.badgeId)?.color.replace('text-', 'bg-').replace('400', '500/20')}`} />
              
              <button onClick={() => setShowBadgeModal({ show: false, badgeId: null })} className="absolute right-5 top-5 text-zinc-500 hover:text-white z-10"><X size={20}/></button>

              <div className="relative z-10 flex flex-col items-center">
                {(() => {
                  const badge = BADGES.find(b => b.id === showBadgeModal.badgeId)!;
                  const isUnlocked = !!unlockedBadges[badge.id];
                  const BadgeIcon = badge.icon;
                  const dateStr = isUnlocked ? new Date(unlockedBadges[badge.id]).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : "Unknown Date";

                  return (
                    <>
                      <div className={`mb-6 grid h-24 w-24 place-items-center rounded-full ${isUnlocked ? badge.color.replace('text-', 'bg-').replace('400', '500/10') : 'bg-zinc-900'} ring-1 ring-inset ${isUnlocked ? badge.color.replace('text-', 'ring-').replace('400', '500/30') : 'ring-zinc-800'}`}>
                        <BadgeIcon className={isUnlocked ? badge.color : "text-zinc-600"} size={48} />
                      </div>
                      
                      <div className={`text-xs uppercase tracking-[0.2em] font-bold mb-2 ${isUnlocked ? 'text-zinc-500' : 'text-zinc-600'}`}>
                        {isUnlocked ? "Achievement Unlocked" : "Locked Badge"}
                      </div>
                      <h2 className={`text-3xl font-black mb-3 ${isUnlocked ? badge.color : "text-zinc-300"}`}>{badge.name}</h2>
                      <p className="text-zinc-400 leading-relaxed mb-6">
                        {badge.description}
                      </p>
                      
                      {isUnlocked ? (
                        <div className="w-full rounded-xl bg-zinc-900/50 p-4 border border-zinc-800/50">
                          <div className="text-xs text-zinc-500 mb-1">EARNED ON</div>
                          <div className="font-medium text-zinc-300">{dateStr}</div>
                        </div>
                      ) : (
                        <div className="w-full rounded-xl bg-zinc-900/30 p-4 border border-zinc-800/30 border-dashed">
                          <div className="text-sm font-medium text-zinc-500">Keep tracking to unlock this badge!</div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center p-5">
            <div className="w-full max-w-sm rounded-3xl border border-zinc-800 bg-[#0d0b12] p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black">Set Monthly Goal</h2>
                <button onClick={() => setShowGoalModal(false)} className="text-zinc-500 hover:text-white"><X/></button>
              </div>

              <div className="space-y-4">
                <label className="block text-sm">
                  <span className="mb-2 block text-zinc-500">Goal Category</span>
                  <select className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-violet-500 text-zinc-300" value={newGoal.category} onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value })}>
                    <option value="Invest">Invest</option>
                    <option value="Save">Save</option>
                    <option value="Food">Food (Limit Spend)</option>
                    <option value="Shopping">Shopping (Limit Spend)</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-2 block text-zinc-500">Target Amount</span>
                  <div className="flex items-center rounded-xl border border-zinc-800 bg-zinc-950 px-3">
                    <span className="text-zinc-500">₹</span>
                    <input type="number" className="w-full bg-transparent px-2 py-3 outline-none" value={newGoal.amount} onChange={(e) => setNewGoal({ ...newGoal, amount: e.target.value })} placeholder="5000" />
                  </div>
                </label>
                <button 
                  onClick={() => {
                    if (newGoal.amount) {
                      setMonthlyGoal(newGoal);
                      setShowGoalModal(false);
                    }
                  }}
                  className="mt-2 w-full rounded-xl bg-violet-500 px-4 py-3 font-bold text-white hover:bg-violet-400"
                >
                  Save Goal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
