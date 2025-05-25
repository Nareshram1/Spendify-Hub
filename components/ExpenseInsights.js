"use client";
import { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
  LineChart, Line,
  ResponsiveContainer,
  AreaChart, Area
} from 'recharts'
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfYear, endOfYear, startOfDay, endOfDay,
  addDays, addWeeks, addMonths, addYears,
  isWithinInterval
} from 'date-fns'
import { getExpenses } from '../lib/database'

const COLORS = ['#0ac7b8', '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0', '#ffb347']

export default function ExpenseInsights({ user }) {
  const [expenses, setExpenses] = useState([])
  const [period, setPeriod] = useState('monthly')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedMethod, setSelectedMethod] = useState('all')
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('overview')
  const [chartType, setChartType] = useState('bar')
  const [sortBy, setSortBy] = useState('amount')
  const [sortOrder, setSortOrder] = useState('desc')
  
  // Separate offset states for each period
  const [dailyOffset, setDailyOffset] = useState(0)
  const [weeklyOffset, setWeeklyOffset] = useState(0)
  const [monthlyOffset, setMonthlyOffset] = useState(0)
  const [yearlyOffset, setYearlyOffset] = useState(0)

  // Fetch all expenses once on component mount
  useEffect(() => {
    fetchAllExpenses()
  }, [user])

  const fetchAllExpenses = async () => {
    setLoading(true)
    // Fetch all expenses without date restrictions
    const { data, error } = await getExpenses(user.id, null, null)
    if (!error && data) {
      setExpenses(data)
    }
    setLoading(false)
  }

  // Get the current selected date range
  const getCurrentDateRange = () => {
    const now = new Date()
    
    switch (period) {
      case 'daily': {
        const selectedDay = addDays(now, dailyOffset)
        return {
          start: startOfDay(selectedDay),
          end: endOfDay(selectedDay)
        }
      }
      case 'weekly': {
        const selectedWeek = addWeeks(now, weeklyOffset)
        return {
          start: startOfWeek(selectedWeek),
          end: endOfWeek(selectedWeek)
        }
      }
      case 'monthly': {
        const selectedMonth = addMonths(now, monthlyOffset)
        return {
          start: startOfMonth(selectedMonth),
          end: endOfMonth(selectedMonth)
        }
      }
      case 'yearly': {
        const selectedYear = addYears(now, yearlyOffset)
        return {
          start: startOfYear(selectedYear),
          end: endOfYear(selectedYear)
        }
      }
      case 'custom': {
        if (!customStartDate || !customEndDate) return { start: null, end: null }
        return {
          start: startOfDay(new Date(customStartDate)),
          end: endOfDay(new Date(customEndDate))
        }
      }
      default:
        return { start: null, end: null }
    }
  }

  // Filter expenses based on current date range and other filters
  const filteredExpenses = useMemo(() => {
    const { start, end } = getCurrentDateRange()
    
    return expenses.filter(expense => {
      // Date filter
      if (start && end) {
        const expenseDate = new Date(expense.expense_date)
        if (!isWithinInterval(expenseDate, { start, end })) {
          return false
        }
      }
      
      // Category filter
      if (selectedCategory !== 'all' && expense.categories?.name !== selectedCategory) {
        return false
      }
      
      // Method filter
      if (selectedMethod !== 'all' && expense.expense_method !== selectedMethod) {
        return false
      }
      
      return true
    })
  }, [expenses, period, dailyOffset, weeklyOffset, monthlyOffset, yearlyOffset, customStartDate, customEndDate, selectedCategory, selectedMethod])

  const sortedExpenses = useMemo(() => {
    const sorted = [...filteredExpenses].sort((a, b) => {
      let cmp = 0
      if (sortBy === 'amount') cmp = a.amount - b.amount
      if (sortBy === 'date') cmp = new Date(a.expense_date) - new Date(b.expense_date)
      if (sortBy === 'category') cmp = (a.categories?.name || '').localeCompare(b.categories?.name || '')
      return sortOrder === 'desc' ? -cmp : cmp
    })
    return sorted
  }, [filteredExpenses, sortBy, sortOrder])

  const analytics = useMemo(() => {
    if (!filteredExpenses.length) {
      return { 
        total: 0, 
        category: [], 
        daily: [], 
        weekly: [], 
        monthly: [], 
        methods: [] 
      }
    }

    const total = filteredExpenses.reduce((sum, e) => sum + e.amount, 0)
    const catMap = {}
    const dayMap = {}
    const weekMap = {}
    const monthMap = {}
    const methodMap = {}

    filteredExpenses.forEach(e => {
      const c = e.categories?.name || 'Unknown'
      catMap[c] = (catMap[c] || 0) + e.amount

      const d = format(new Date(e.expense_date), 'yyyy-MM-dd')
      dayMap[d] = (dayMap[d] || 0) + e.amount

      const w = format(startOfWeek(new Date(e.expense_date)), 'yyyy-MM-dd')
      weekMap[w] = (weekMap[w] || 0) + e.amount

      const m = format(new Date(e.expense_date), 'yyyy-MM')
      monthMap[m] = (monthMap[m] || 0) + e.amount

      const pm = e.expense_method || 'Unknown'
      methodMap[pm] = (methodMap[pm] || 0) + e.amount
    })

    const catData = Object.entries(catMap)
      .map(([name, val]) => ({ 
        name, 
        value: val, 
        pct: ((val / total) * 100).toFixed(1) 
      }))
      .sort((a, b) => b.value - a.value)

    const daily = Object.entries(dayMap)
      .map(([date, val]) => ({ 
        date: format(new Date(date), 'MMM dd'), 
        value: val 
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))

    const weekly = Object.entries(weekMap)
      .map(([w, val]) => ({ 
        week: format(new Date(w), 'MMM dd'), 
        value: val 
      }))
      .sort((a, b) => new Date(a.week) - new Date(b.week))

    const monthly = Object.entries(monthMap)
      .map(([m, val]) => ({ 
        month: format(new Date(m + '-01'), 'MMM yyyy'), 
        value: val 
      }))
      .sort((a, b) => new Date(a.month) - new Date(b.month))

    const methods = Object.entries(methodMap)
      .map(([name, val]) => ({ 
        method: name.toUpperCase(), 
        value: val, 
        pct: ((val / total) * 100).toFixed(1) 
      }))
      .sort((a, b) => b.value - a.value)

    return { total, category: catData, daily, weekly, monthly, methods }
  }, [filteredExpenses])

  // Navigation functions
  const navigatePrevious = () => {
    switch (period) {
      case 'daily': setDailyOffset(prev => prev - 1); break
      case 'weekly': setWeeklyOffset(prev => prev - 1); break
      case 'monthly': setMonthlyOffset(prev => prev - 1); break
      case 'yearly': setYearlyOffset(prev => prev - 1); break
    }
  }

  const navigateNext = () => {
    switch (period) {
      case 'daily': setDailyOffset(prev => prev + 1); break
      case 'weekly': setWeeklyOffset(prev => prev + 1); break
      case 'monthly': setMonthlyOffset(prev => prev + 1); break
      case 'yearly': setYearlyOffset(prev => prev + 1); break
    }
  }

  const navigateToday = () => {
    setDailyOffset(0)
    setWeeklyOffset(0)
    setMonthlyOffset(0)
    setYearlyOffset(0)
  }

  // Get display text for current period
  const getCurrentPeriodText = () => {
    const now = new Date()
    switch (period) {
      case 'daily':
        return format(addDays(now, dailyOffset), 'EEEE, MMM dd, yyyy')
      case 'weekly':
        const weekStart = startOfWeek(addWeeks(now, weeklyOffset))
        const weekEnd = endOfWeek(addWeeks(now, weeklyOffset))
        return `${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd, yyyy')}`
      case 'monthly':
        return format(addMonths(now, monthlyOffset), 'MMMM yyyy')
      case 'yearly':
        return format(addYears(now, yearlyOffset), 'yyyy')
      case 'custom':
        if (customStartDate && customEndDate) {
          return `${format(new Date(customStartDate), 'MMM dd')} - ${format(new Date(customEndDate), 'MMM dd, yyyy')}`
        }
        return 'Select dates'
      default:
        return ''
    }
  }

  const renderChart = (data, xKey, yKey, color) => (
    <ResponsiveContainer width="100%" height={250}>
      {chartType === 'line' ? (
        <LineChart data={data}>
          <XAxis dataKey={xKey} />
          <YAxis />
          <CartesianGrid strokeDasharray="3 3" />
          <Tooltip formatter={val => `₹${val.toFixed(2)}`} />
          <Line dataKey={yKey} stroke={color} strokeWidth={2} />
        </LineChart>
      ) : chartType === 'area' ? (
        <AreaChart data={data}>
          <XAxis dataKey={xKey} />
          <YAxis />
          <CartesianGrid strokeDasharray="3 3" />
          <Tooltip formatter={val => `₹${val.toFixed(2)}`} />
          <Area dataKey={yKey} stroke={color} fill={color} fillOpacity={0.3} />
        </AreaChart>
      ) : (
        <BarChart data={data}>
          <XAxis dataKey={xKey} />
          <YAxis />
          <CartesianGrid strokeDasharray="3 3" />
          <Tooltip formatter={val => `₹${val.toFixed(2)}`} />
          <Bar dataKey={yKey} fill={color} />
        </BarChart>
      )}
    </ResponsiveContainer>
  )

  if (loading) return (
    <div className="p-4 animate-pulse">
      <div className="h-6 bg-gray-600 rounded mb-2 w-1/3"></div>
      <div className="h-48 bg-gray-600 rounded"></div>
    </div>
  )

  return (
    <div className="space-y-6 p-2 sm:p-4 lg:p-6">
      {/* Control Panel */}
      <div className="bg-secondary rounded-lg p-4 space-y-4">
        {/* Period Selection */}
        <div className="flex overflow-x-auto space-x-2 sm:space-x-4 py-1">
          {['daily', 'weekly', 'monthly', 'yearly', 'custom'].map(p => (
            <button 
              key={p} 
              onClick={() => setPeriod(p)} 
              className={`flex-shrink-0 px-3 py-1 text-sm font-medium rounded ${
                period === p ? 'bg-accent text-white' : 'bg-primary text-gray-300'
              }`}
            > 
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        {/* Navigation for non-custom periods */}
        {period !== 'custom' && (
          <div className="flex items-center justify-between text-sm">
            <button 
              onClick={navigatePrevious} 
              className="px-3 py-1 bg-primary text-gray-300 rounded hover:bg-accent hover:text-white"
            >
              ← Previous
            </button>
            <span className="text-center font-medium text-white">
              {getCurrentPeriodText()}
            </span>
            <button 
              onClick={navigateNext} 
              className="px-3 py-1 bg-primary text-gray-300 rounded hover:bg-accent hover:text-white"
            >
              Next →
            </button>
          </div>
        )}

        {/* Reset to current period */}
        {period !== 'custom' && (dailyOffset !== 0 || weeklyOffset !== 0 || monthlyOffset !== 0 || yearlyOffset !== 0) && (
          <div className="text-center">
            <button 
              onClick={navigateToday} 
              className="px-4 py-1 bg-accent text-white rounded text-sm"
            >
              Back to Current {period === 'daily' ? 'Day' : period === 'weekly' ? 'Week' : period === 'monthly' ? 'Month' : 'Year'}
            </button>
          </div>
        )}

        {/* Custom Date Range */}
        {period === 'custom' && (
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">Start Date</label>
              <input 
                type="date" 
                value={customStartDate} 
                onChange={e => setCustomStartDate(e.target.value)} 
                className="w-full px-2 py-1 bg-primary border rounded text-sm text-white" 
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">End Date</label>
              <input 
                type="date" 
                value={customEndDate} 
                onChange={e => setCustomEndDate(e.target.value)} 
                className="w-full px-2 py-1 bg-primary border rounded text-sm text-white" 
              />
            </div>
          </div>
        )}

        {/* Filters and Options */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <select 
            value={selectedCategory} 
            onChange={e => setSelectedCategory(e.target.value)} 
            className="px-2 py-1 bg-primary border rounded text-sm text-white"
          >
            <option value="all">All Categories</option>
            {[...new Set(expenses.map(e => e.categories?.name).filter(Boolean))].map(cat => 
              <option key={cat} value={cat}>{cat}</option>
            )}
          </select>
          
          <select 
            value={selectedMethod} 
            onChange={e => setSelectedMethod(e.target.value)} 
            className="px-2 py-1 bg-primary border rounded text-sm text-white"
          >
            <option value="all">All Methods</option>
            {[...new Set(expenses.map(e => e.expense_method).filter(Boolean))].map(m => 
              <option key={m} value={m}>{m.toUpperCase()}</option>
            )}
          </select>
          
          <select 
            value={chartType} 
            onChange={e => setChartType(e.target.value)} 
            className="px-2 py-1 bg-primary border rounded text-sm text-white"
          >
            <option value="bar">Bar Chart</option>
            <option value="line">Line Chart</option>
            <option value="area">Area Chart</option>
          </select>
          
          <select 
            value={`${sortBy}-${sortOrder}`} 
            onChange={e => {
              const [b, o] = e.target.value.split('-')
              setSortBy(b)
              setSortOrder(o)
            }} 
            className="px-2 py-1 bg-primary border rounded text-sm text-white"
          >
            <option value="amount-desc">Amount (High to Low)</option>
            <option value="amount-asc">Amount (Low to High)</option>
            <option value="date-desc">Date (Newest)</option>
            <option value="date-asc">Date (Oldest)</option>
            <option value="category-asc">Category (A-Z)</option>
            <option value="category-desc">Category (Z-A)</option>
          </select>
        </div>

        {/* View Mode Selection */}
        <div className="flex space-x-2 overflow-x-auto">
          {['overview', 'categories', 'trends', 'methods'].map(m =>
            <button 
              key={m} 
              onClick={() => setViewMode(m)} 
              className={`flex-shrink-0 px-3 py-1 text-sm rounded ${
                viewMode === m ? 'bg-accent text-white' : 'bg-primary text-gray-300'
              }`}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-secondary rounded-lg p-4 text-center">
          <div className="text-sm text-gray-400">Total Spent</div>
          <div className="text-xl font-bold text-white">₹{analytics.total.toFixed(2)}</div>
        </div>
        <div className="bg-secondary rounded-lg p-4 text-center">
          <div className="text-sm text-gray-400">Transactions</div>
          <div className="text-xl font-bold text-white">{filteredExpenses.length}</div>
        </div>
        <div className="bg-secondary rounded-lg p-4 text-center">
          <div className="text-sm text-gray-400">Average</div>
          <div className="text-xl font-bold text-white">
            ₹{filteredExpenses.length ? (analytics.total / filteredExpenses.length).toFixed(2) : '0.00'}
          </div>
        </div>
        <div className="bg-secondary rounded-lg p-4 text-center">
          <div className="text-sm text-gray-400">Top Category</div>
          <div className="text-xl font-bold text-white">{analytics.category[0]?.name || 'N/A'}</div>
        </div>
      </div>

      {/* Charts based on view mode */}
      {viewMode === 'overview' && (
        <div className="space-y-4">
          <div className="bg-secondary rounded-lg p-4">
            <div className="text-lg text-white mb-4">Spending by Category</div>
            {analytics.category.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie 
                    data={analytics.category} 
                    dataKey="value" 
                    cx="50%" 
                    cy="50%" 
                    outerRadius={80} 
                    label={({ name, pct }) => `${name} (${pct}%)`}
                  >
                    {analytics.category.map((_, i) => 
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    )}
                  </Pie>
                  <Tooltip formatter={v => `₹${v.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-32 text-gray-400 flex items-center justify-center">
                No data available for this period
              </div>
            )}
          </div>
          
          <div className="bg-secondary rounded-lg p-4">
            <div className="text-lg text-white mb-4">Daily Spending Trend</div>
            {analytics.daily.length ? 
              renderChart(analytics.daily, 'date', 'value', COLORS[0]) : 
              <div className="h-32 text-gray-400 flex items-center justify-center">
                No data available for this period
              </div>
            }
          </div>
        </div>
      )}

      {viewMode === 'categories' && (
        <div className="bg-secondary rounded-lg p-4">
          <div className="text-lg text-white mb-4">Category Breakdown</div>
          <div className="space-y-3">
            {analytics.category.map((c, i) => (
              <div key={c.name} className="flex justify-between items-center p-2 bg-primary rounded">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: COLORS[i % COLORS.length] }} 
                  />
                  <div className="text-white font-medium">{c.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-white font-semibold">₹{c.value.toFixed(2)}</div>
                  <div className="text-gray-400 text-sm">{c.pct}%</div>
                </div>
              </div>
            ))}
            {!analytics.category.length && (
              <div className="text-center text-gray-400 py-8">
                No expenses found for this period
              </div>
            )}
          </div>
        </div>
      )}

      {viewMode === 'trends' && (
        <div className="space-y-4">
          <div className="bg-secondary rounded-lg p-4">
            <div className="text-lg text-white mb-4">Daily Trend</div>
            {analytics.daily.length ? 
              renderChart(analytics.daily, 'date', 'value', COLORS[0]) : 
              <div className="h-64 text-gray-400 flex items-center justify-center">
                No daily data available
              </div>
            }
          </div>
          
          {analytics.weekly.length > 1 && (
            <div className="bg-secondary rounded-lg p-4">
              <div className="text-lg text-white mb-4">Weekly Trend</div>
              {renderChart(analytics.weekly, 'week', 'value', COLORS[1])}
            </div>
          )}
          
          {analytics.monthly.length > 1 && (
            <div className="bg-secondary rounded-lg p-4">
              <div className="text-lg text-white mb-4">Monthly Trend</div>
              {renderChart(analytics.monthly, 'month', 'value', COLORS[2])}
            </div>
          )}
        </div>
      )}

      {viewMode === 'methods' && (
        <div className="space-y-4">
          <div className="bg-secondary rounded-lg p-4">
            <div className="text-lg text-white mb-4">Payment Methods</div>
            {analytics.methods.length ? 
              renderChart(analytics.methods, 'method', 'value', COLORS[3]) : 
              <div className="h-64 text-gray-400 flex items-center justify-center">
                No payment method data available
              </div>
            }
          </div>
          
          <div className="bg-secondary rounded-lg p-4">
            <div className="text-lg text-white mb-4">Method Breakdown</div>
            <div className="space-y-2">
              {analytics.methods.map((m, i) => (
                <div key={m.method} className="flex justify-between items-center p-2 bg-primary rounded">
                  <div className="text-white font-medium">{m.method}</div>
                  <div className="text-right">
                    <div className="text-white font-semibold">₹{m.value.toFixed(2)}</div>
                    <div className="text-gray-400 text-sm">{m.pct}%</div>
                  </div>
                </div>
              ))}
              {!analytics.methods.length && (
                <div className="text-center text-gray-400 py-4">
                  No payment method data found
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recent Expenses List */}
      <div className="bg-secondary rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="text-lg text-white">
            Recent Expenses 
            {(selectedCategory !== 'all' || selectedMethod !== 'all') && (
              <span className="text-sm text-gray-400 ml-2">(Filtered)</span>
            )}
          </div>
          <div className="text-sm text-gray-400">
            Showing {Math.min(10, sortedExpenses.length)} of {sortedExpenses.length}
          </div>
        </div>
        
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {sortedExpenses.slice(0, 10).map(expense => (
            <div key={expense.id} className="flex justify-between items-center p-3 bg-primary rounded">
              <div className="flex-1">
                <div className="font-medium text-white">
                  {expense.categories?.name || 'Unknown Category'}
                </div>
                <div className="text-sm text-gray-400">
                  {format(new Date(expense.expense_date), 'MMM dd, yyyy')} • 
                  {expense.expense_method?.toUpperCase() || 'UNKNOWN'}
                </div>
                {expense.description && (
                  <div className="text-xs text-gray-500 mt-1">
                    {expense.description}
                  </div>
                )}
              </div>
              <div className="text-right ml-4">
                <div className="font-semibold text-accent text-lg">
                  ₹{expense.amount.toFixed(2)}
                </div>
              </div>
            </div>
          ))}
          
          {!sortedExpenses.length && (
            <div className="text-center text-gray-400 py-8">
              No expenses found for the selected period and filters
            </div>
          )}
        </div>
      </div>
    </div>
  )
}