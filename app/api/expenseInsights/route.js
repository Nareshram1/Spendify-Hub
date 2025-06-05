// app/api/expenseInsights/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Helper: parse a "YYYY-MM-DD" string into a Date at local midnight (00:00:00).
 */
function parseDateString(dateStr) {
  // If invalid, new Date(...) → NaN
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date format: "${dateStr}". Expected "YYYY-MM-DD".`);
  }
  return d;
}

/**
 * Shared logic: fetch raw expenses from Supabase, filter by user + date range,
 * then compute insights (totalSpent, topCategories, etc.).
 */
async function computeInsights({ userId, startDate, endDate }) {
  if (!userId) {
    throw new Error('userId is required.');
  }
  if (!startDate || !endDate) {
    throw new Error('Both startDate and endDate are required.');
  }

  // 1) Parse range into inclusive ISO timestamps
  const start = parseDateString(startDate); // e.g. 2025-06-01T00:00:00
  const tmpEnd = parseDateString(endDate);
  // Make end-of-day = 23:59:59 to include the entire endDate
  const end = new Date(
    tmpEnd.getFullYear(),
    tmpEnd.getMonth(),
    tmpEnd.getDate(),
    23,
    59,
    59
  );

  if (end < start) {
    throw new Error('endDate must be >= startDate.');
  }

  // 2) Fetch all expenses for this user in that date window
  //    Here we assume:
  //      • expenses table has: user_id, amount, created_at, expense_method, category_id
  //      • categories table has: id, name
  const { data: rawExpenses, error: fetchError } = await supabase
    .from('expenses')
    .select(`
      user_id,
      amount,
      created_at,
      expense_method,
      categories ( name )
    `)
    .eq('user_id', userId)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
    .order('created_at', { ascending: true });

  if (fetchError) {
    console.error('[expenseInsights] Supabase fetch error:', fetchError);
    throw new Error(`Error fetching expenses: ${fetchError.message}`);
  }
  if (!rawExpenses || rawExpenses.length === 0) {
    // No expenses in that range → return an “empty” insight response
    return {
      userId,
      dateRange: { start: startDate, end: endDate },
      insights: {
        totalSpent: 0,
        numberOfTransactions: 0,
        averageTransactionValue: 0,
        topCategories: [],
        mostFrequentExpenseMethod: 'N/A',
        highestSingleExpense: null,
        daysInRange:
          Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) +
          1,
        uniqueDaysWithSpending: 0,
        daysWithExpenses: [], // no data
      },
    };
  }

  // 3) Transform & validate each raw row into a clean object
  const expenses = rawExpenses
    .map((row) => {
      // Basic validation: amount must be parseable, created_at present, category name present
      if (
        row.amount == null ||
        isNaN(parseFloat(row.amount)) ||
        !row.created_at ||
        !row.categories?.name
      ) {
        return null;
      }
      return {
        userId: row.user_id,
        amount: parseFloat(row.amount),
        created_at: new Date(row.created_at),
        categoryName: row.categories.name,
        expense_method: row.expense_method || 'Unknown',
      };
    })
    .filter((r) => r !== null);

  if (expenses.length === 0) {
    // All rows were invalid → treat as “no valid data”
    return {
      userId,
      dateRange: { start: startDate, end: endDate },
      insights: {
        totalSpent: 0,
        numberOfTransactions: 0,
        averageTransactionValue: 0,
        topCategories: [],
        mostFrequentExpenseMethod: 'N/A',
        highestSingleExpense: null,
        daysInRange:
          Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) +
          1,
        uniqueDaysWithSpending: 0,
        daysWithExpenses: [],
      },
    };
  }

  // 4) Compute day-by-day totals (for daily breakdown)
  const dailyMap = new Map(); // key = "YYYY-MM-DD", value = sum of amounts
  for (const exp of expenses) {
    const dateKey = exp.created_at.toISOString().split('T')[0];
    if (!dailyMap.has(dateKey)) {
      dailyMap.set(dateKey, 0);
    }
    dailyMap.set(dateKey, dailyMap.get(dateKey) + exp.amount);
  }
  // Convert to sorted array: [ [ "YYYY-MM-DD", totalOnThatDay ], … ]
  const daysWithExpenses = Array.from(dailyMap.entries())
    .map(([dateStr, totalAmt]) => [dateStr, parseFloat(totalAmt.toFixed(2))])
    .sort((a, b) => (a[0] < b[0] ? -1 : 1));

  // 5) Compute totalSpent & uniqueDaysWithSpending
  let totalSpent = 0;
  const uniqueDaysSet = new Set();
  for (const exp of expenses) {
    totalSpent += exp.amount;
    const dateKey = exp.created_at.toISOString().split('T')[0];
    uniqueDaysSet.add(dateKey);
  }
  totalSpent = parseFloat(totalSpent.toFixed(2));
  const uniqueDaysWithSpending = uniqueDaysSet.size;

  // 6) Count numberOfTransactions & averageTransactionValue
  const numberOfTransactions = expenses.length;
  const averageTransactionValue = parseFloat(
    (totalSpent / numberOfTransactions).toFixed(2)
  );

  // 7) Top categories (up to 5)
  const categoryTotals = {};
  for (const exp of expenses) {
    if (!categoryTotals[exp.categoryName]) {
      categoryTotals[exp.categoryName] = 0;
    }
    categoryTotals[exp.categoryName] += exp.amount;
  }
  const sortedCategories = Object.entries(categoryTotals)
    .map(([cat, sum]) => ({ name: cat, total: parseFloat(sum.toFixed(2)) }))
    .sort((a, b) => b.total - a.total);
  const topCategories = sortedCategories.slice(0, 5);

  // 8) Most frequent payment method
  const methodCounts = {};
  for (const exp of expenses) {
    const m = exp.expense_method;
    if (!methodCounts[m]) {
      methodCounts[m] = 0;
    }
    methodCounts[m]++;
  }
  const mostFrequentExpenseMethod =
    Object.entries(methodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  // 9) Highest single expense in that range
  const highestRaw = [...expenses].sort((a, b) => b.amount - a.amount)[0];
  const highestSingleExpense = highestRaw
    ? {
        category: highestRaw.categoryName,
        amount: highestRaw.amount,
        date: highestRaw.created_at.toISOString().split('T')[0],
        method: highestRaw.expense_method,
      }
    : null;

  // 10) Compute daysInRange = inclusive number of days between start & end
  const msInDay = 24 * 60 * 60 * 1000;
  const daysInRange =
    Math.floor((end.getTime() - start.getTime()) / msInDay) + 1;

  // 11) Build final payload
  return {
    userId,
    dateRange: { start: startDate, end: endDate },
    insights: {
      totalSpent,
      numberOfTransactions,
      averageTransactionValue,
      topCategories,
      mostFrequentExpenseMethod,
      highestSingleExpense,
      daysInRange,
      uniqueDaysWithSpending,
      daysWithExpenses,
    },
  };
}

/**
 * POST handler: expects JSON body with:
 * {
 *   "userId": "string",
 *   "startDate": "YYYY-MM-DD",
 *   "endDate": "YYYY-MM-DD"
 * }
 *
 * Example:
 *   POST /api/expenseInsights
 *   {
 *     "userId":"abcd123",
 *     "startDate":"2025-05-01",
 *     "endDate":"2025-05-31"
 *   }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, startDate, endDate } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required in request body.' },
        { status: 400 }
      );
    }
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Both startDate and endDate are required.' },
        { status: 400 }
      );
    }
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase client not configured.' },
        { status: 500 }
      );
    }

    const result = await computeInsights({ userId, startDate, endDate });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error('[expenseInsights][POST] Error:', err);
    return NextResponse.json(
      {
        error: 'Unexpected error while processing expense insights.',
        details: err.message,
      },
      { status: 500 }
    );
  }
}

/**
 * (Optional) You can also support GET by passing query params:
 *   /api/expenseInsights?userId=abc&startDate=2025-05-01&endDate=2025-05-31
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required as a query param.' },
        { status: 400 }
      );
    }
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required as query params.' },
        { status: 400 }
      );
    }
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase client not configured.' },
        { status: 500 }
      );
    }

    const result = await computeInsights({ userId, startDate, endDate });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error('[expenseInsights][GET] Error:', err);
    return NextResponse.json(
      {
        error: 'Unexpected error while processing expense insights.',
        details: err.message,
      },
      { status: 500 }
    );
  }
}
