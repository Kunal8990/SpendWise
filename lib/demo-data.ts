import { Expense } from "./types";

export const demoExpenses: Expense[] = [
  { id: "1", title: "Dinner", category: "Food", amount: 850, date: "2026-09-03", payment_method: "UPI" },
  { id: "2", title: "Petrol", category: "Petrol & Travel", amount: 1200, date: "2026-09-02", payment_method: "UPI" },
  { id: "3", title: "Gym", category: "Gym", amount: 1500, date: "2026-09-01", payment_method: "Bank" },
  { id: "4", title: "MacBook EMI", category: "EMI", amount: 10000, date: "2026-09-01", payment_method: "Bank" },
  { id: "5", title: "SIP", category: "Invest", amount: 5000, date: "2026-09-01", payment_method: "Bank" },
  { id: "6", title: "Movie night", category: "Night Out", amount: 900, date: "2026-08-29", payment_method: "UPI" },
  { id: "7", title: "Supplements", category: "Supplements", amount: 2200, date: "2026-08-28", payment_method: "Card" }
];

export const categoryBreakdown = [
  { name: "EMI", value: 10000 },
  { name: "Food", value: 8200 },
  { name: "Petrol & Travel", value: 4200 },
  { name: "Personal", value: 3500 },
  { name: "Gym", value: 2000 },
  { name: "Night Out", value: 1800 },
  { name: "Medical", value: 900 },
  { name: "Other", value: 5850 }
];

export const monthlyTrend = [
  { month: "Apr", spent: 35800, saved: 12200 },
  { month: "May", spent: 40400, saved: 9400 },
  { month: "Jun", spent: 39200, saved: 10800 },
  { month: "Jul", spent: 41700, saved: 8300 },
  { month: "Aug", spent: 41200, saved: 10100 },
  { month: "Sep", spent: 38450, saved: 14550 }
];
