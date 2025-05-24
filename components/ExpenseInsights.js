"use client";
import { useState, useEffect, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subWeeks, subMonths, subYears, addDays, addWeeks, addMonths, addYears, isAfter, isBefore } from 'date-fns'
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
  const [viewMode, setViewMode] = useState('overview') // overview, categories, trends, compare
  const [comparisonPeriod, setComparisonPeriod] = useState('previous')
  const [chartType, setChartType] = useState('bar') // bar, line, area for trends
  const [sortBy, setSortBy] = useState('amount') // amount, date, category
  const [sortOrder, setSortOrder] = useState('desc') // asc, desc
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0) // 0 = current week, -1 = last week, etc.
  const [selectedMonthOffset, setSelectedMonthOffset] = useState(0)
  const [selectedYearOffset, setSelectedYearOffset] = useState(0)

  useEffect(() => {
    fetchExpenses()
  }, [user, period, customStartDate, customEndDate, selectedWeekOffset, selectedMonthOffset, selectedYearOffset])

  const fetchExpenses = async () => {
    setLoading(true)
    const { startDate, endDate } = getDateRange()
    const { data, error } = await getExpenses(user.id, startDate, endDate)
    
    if (!error && data) {
      setExpenses(data)
    }
    setLoading(false)
  }

  const getDateRange = () => {
    const now = new Date()
    
    switch (period) {
      case 'daily':
        const selectedDay = subDays(now, Math.abs(selectedWeekOffset)) // Reusing offset for days
        return {
          startDate: format(selectedDay, 'yyyy-MM-dd'),
          endDate: format(selectedDay, 'yyyy-MM-dd')
        }
      case 'weekly':
        const weekStart = addWeeks(startOfWeek(now), selectedWeekOffset)
        const weekEnd = addWeeks(endOfWeek(now), selectedWeekOffset)
        return {
          startDate: format(weekStart, 'yyyy-MM-dd'),
          endDate: format(weekEnd, 'yyyy-MM-dd')
        }
      case 'monthly':
        const monthStart = addMonths(startOfMonth(now), selectedMonthOffset)
        const monthEnd = addMonths(endOfMonth(now), selectedMonthOffset)
        return {
          startDate: format(monthStart, 'yyyy-MM-dd'),
          endDate: format(monthEnd, 'yyyy-MM-dd')
        }
      case 'yearly':
        const yearStart = addYears(startOfYear(now), selectedYearOffset)
        const yearEnd = addYears(endOfYear(now), selectedYearOffset)
        return {
          startDate: format(yearStart, 'yyyy-MM-dd'),
          endDate: format(yearEnd, 'yyyy-MM-dd')
        }
      case 'custom':
        return {
          startDate: customStartDate,
          endDate: customEndDate
        }
      default:
        return { startDate: null, endDate: null }
    }
  }

  const getComparisonData = async () => {
    const now = new Date()
    let compStartDate, compEndDate
    
    switch (comparisonPeriod) {
      case 'previous':
        if (period === 'weekly') {
          compStartDate = format(addWeeks(startOfWeek(now), selectedWeekOffset - 1), 'yyyy-MM-dd')
          compEndDate = format(addWeeks(endOfWeek(now), selectedWeekOffset - 1), 'yyyy-MM-dd')
        } else if (period === 'monthly') {
          compStartDate = format(addMonths(startOfMonth(now), selectedMonthOffset - 1), 'yyyy-MM-dd')
          compEndDate = format(addMonths(endOfMonth(now), selectedMonthOffset - 1), 'yyyy-MM-dd')
        } else if (period === 'yearly') {
          compStartDate = format(addYears(startOfYear(now), selectedYearOffset - 1), 'yyyy-MM-dd')
          compEndDate = format(addYears(endOfYear(now), selectedYearOffset - 1), 'yyyy-MM-dd')
        }
        break
      case 'lastYear':
        const { startDate, endDate } = getDateRange()
        const lastYearStart = subYears(new Date(startDate), 1)
        const lastYearEnd = subYears(new Date(endDate), 1)
        compStartDate = format(lastYearStart, 'yyyy-MM-dd')
        compEndDate = format(lastYearEnd, 'yyyy-MM-dd')
        break
    }
    
    if (compStartDate && compEndDate) {
      const { data } = await getExpenses(user.id, compStartDate, compEndDate)
      return data || []
    }
    return []
  }

  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      const categoryMatch = selectedCategory === 'all' || expense.categories?.name === selectedCategory
      const methodMatch = selectedMethod === 'all' || expense.expense_method === selectedMethod
      return categoryMatch && methodMatch
    })
  }, [expenses, selectedCategory, selectedMethod])

  const sortedExpenses = useMemo(() => {
    const sorted = [...filteredExpenses].sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'amount':
          comparison = a.amount - b.amount
          break
        case 'date':
          comparison = new Date(a.expense_date) - new Date(b.expense_date)
          break
        case 'category':
          comparison = (a.categories?.name || '').localeCompare(b.categories?.name || '')
          break
      }
      
      return sortOrder === 'desc' ? -comparison : comparison
    })
    
    return sorted
  }, [filteredExpenses, sortBy, sortOrder])

  const analyticsData = useMemo(() => {
    if (!filteredExpenses.length) return {
      totalAmount: 0,
      categoryData: [],
      dailyData: [],
      methodData: [],
      weeklyData: [],
      monthlyData: []
    }

    const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)

    // Category breakdown
    const categoryMap = {}
    filteredExpenses.forEach(expense => {
      const categoryName = expense.categories?.name || 'Unknown'
      categoryMap[categoryName] = (categoryMap[categoryName] || 0) + expense.amount
    })
    
    const categoryData = Object.entries(categoryMap)
      .map(([name, value]) => ({
        name,
        value,
        percentage: ((value / totalAmount) * 100).toFixed(1),
        count: filteredExpenses.filter(e => (e.categories?.name || 'Unknown') === name).length
      }))
      .sort((a, b) => b.value - a.value)

    // Daily spending trend
    const dailyMap = {}
    filteredExpenses.forEach(expense => {
      const date = format(new Date(expense.expense_date), 'yyyy-MM-dd')
      dailyMap[date] = (dailyMap[date] || 0) + expense.amount
    })
    
    const dailyData = Object.entries(dailyMap)
      .map(([date, amount]) => ({ 
        date, 
        amount,
        formattedDate: format(new Date(date), 'MMM dd'),
        count: filteredExpenses.filter(e => format(new Date(e.expense_date), 'yyyy-MM-dd') === date).length
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))

    // Weekly aggregation
    const weeklyMap = {}
    filteredExpenses.forEach(expense => {
      const weekStart = format(startOfWeek(new Date(expense.expense_date)), 'yyyy-MM-dd')
      weeklyMap[weekStart] = (weeklyMap[weekStart] || 0) + expense.amount
    })
    
    const weeklyData = Object.entries(weeklyMap)
      .map(([week, amount]) => ({ 
        week: format(new Date(week), 'MMM dd'),
        amount,
        count: filteredExpenses.filter(e => 
          format(startOfWeek(new Date(e.expense_date)), 'yyyy-MM-dd') === week
        ).length
      }))
      .sort((a, b) => new Date(a.week) - new Date(b.week))

    // Monthly aggregation
    const monthlyMap = {}
    filteredExpenses.forEach(expense => {
      const month = format(new Date(expense.expense_date), 'yyyy-MM')
      monthlyMap[month] = (monthlyMap[month] || 0) + expense.amount
    })
    
    const monthlyData = Object.entries(monthlyMap)
      .map(([month, amount]) => ({ 
        month: format(new Date(month), 'MMM yyyy'),
        amount,
        count: filteredExpenses.filter(e => 
          format(new Date(e.expense_date), 'yyyy-MM') === month
        ).length
      }))
      .sort((a, b) => new Date(a.month) - new Date(b.month))

    // Payment method breakdown
    const methodMap = {}
    filteredExpenses.forEach(expense => {
      const method = expense.expense_method || 'Unknown'
      methodMap[method] = (methodMap[method] || 0) + expense.amount
    })
    
    const methodData = Object.entries(methodMap).map(([method, amount]) => ({
      method: method.toUpperCase(),
      amount,
      percentage: ((amount / totalAmount) * 100).toFixed(1),
      count: filteredExpenses.filter(e => (e.expense_method || 'Unknown') === method).length
    }))

    return {
      totalAmount,
      categoryData,
      dailyData,
      methodData,
      weeklyData,
      monthlyData
    }
  }, [filteredExpenses])

  const uniqueCategories = useMemo(() => {
    const categories = [...new Set(expenses.map(e => e.categories?.name || 'Unknown'))]
    return categories.sort()
  }, [expenses])

  const uniqueMethods = useMemo(() => {
    const methods = [...new Set(expenses.map(e => e.expense_method || 'Unknown'))]
    return methods.sort()
  }, [expenses])

  const getPeriodNavigationText = () => {
    const now = new Date()
    switch (period) {
      case 'weekly':
        const weekStart = addWeeks(startOfWeek(now), selectedWeekOffset)
        return format(weekStart, 'MMM dd, yyyy')
      case 'monthly':
        const month = addMonths(now, selectedMonthOffset)
        return format(month, 'MMMM yyyy')
      case 'yearly':
        const year = addYears(now, selectedYearOffset)
        return format(year, 'yyyy')
      default:
        return ''
    }
  }

  const renderChart = (data, dataKey, color = '#0ac7b8') => {
    const ChartComponent = chartType === 'line' ? LineChart : 
                          chartType === 'area' ? AreaChart : BarChart

    return (
      <ResponsiveContainer width="100%" height={300}>
        <ChartComponent data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey={Object.keys(data[0] || {})[0]} stroke="#9CA3AF" />
          <YAxis stroke="#9CA3AF" />
          <Tooltip 
            formatter={(value) => [`₹${value.toFixed(2)}`, 'Amount']}
            contentStyle={{ backgroundColor: '#1f1830', border: '1px solid #374151' }}
          />
          {chartType === 'line' && <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} />}
          {chartType === 'area' && <Area type="monotone" dataKey={dataKey} stroke={color} fill={color} fillOpacity={0.3} />}
          {chartType === 'bar' && <Bar dataKey={dataKey} fill={color} />}
        </ChartComponent>
      </ResponsiveContainer>
    )
  }

  if (loading) {
    return (
      <div className="bg-secondary rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-600 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-600 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Control Panel */}
      <div className="bg-secondary rounded-lg p-4 space-y-4">
        {/* Period Selector with Navigation */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-2">
            {['daily', 'weekly', 'monthly', 'yearly', 'custom'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  period === p
                    ? 'bg-accent text-white'
                    : 'bg-primary text-gray-300 hover:text-white'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>

          {/* Period Navigation */}
          {['weekly', 'monthly', 'yearly'].includes(period) && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (period === 'weekly') setSelectedWeekOffset(selectedWeekOffset - 1)
                  if (period === 'monthly') setSelectedMonthOffset(selectedMonthOffset - 1)
                  if (period === 'yearly') setSelectedYearOffset(selectedYearOffset - 1)
                }}
                className="px-3 py-1 bg-primary text-gray-300 hover:text-white rounded text-sm"
              >
                ←
              </button>
              <span className="text-white font-medium min-w-[120px] text-center">
                {getPeriodNavigationText()}
              </span>
              <button
                onClick={() => {
                  if (period === 'weekly') setSelectedWeekOffset(selectedWeekOffset + 1)
                  if (period === 'monthly') setSelectedMonthOffset(selectedMonthOffset + 1)
                  if (period === 'yearly') setSelectedYearOffset(selectedYearOffset + 1)
                }}
                className="px-3 py-1 bg-primary text-gray-300 hover:text-white rounded text-sm"
              >
                →
              </button>
              <button
                onClick={() => {
                  setSelectedWeekOffset(0)
                  setSelectedMonthOffset(0)
                  setSelectedYearOffset(0)
                }}
                className="px-3 py-1 bg-accent text-white rounded text-sm ml-2"
              >
                Today
              </button>
            </div>
          )}
        </div>

        {/* Custom Date Range */}
        {period === 'custom' && (
          <div className="flex gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Start Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-2 bg-primary border border-gray-600 rounded-md text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-2 bg-primary border border-gray-600 rounded-md text-white text-sm"
              />
            </div>
          </div>
        )}

        {/* Filters and View Options */}
        <div className="flex flex-wrap gap-4">
          {/* Category Filter */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-primary border border-gray-600 rounded-md text-white text-sm"
            >
              <option value="all">All Categories</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Payment Method Filter */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Payment Method</label>
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="px-3 py-2 bg-primary border border-gray-600 rounded-md text-white text-sm"
            >
              <option value="all">All Methods</option>
              {uniqueMethods.map(method => (
                <option key={method} value={method}>{method.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* Chart Type Selector */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Chart Type</label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              className="px-3 py-2 bg-primary border border-gray-600 rounded-md text-white text-sm"
            >
              <option value="bar">Bar Chart</option>
              <option value="line">Line Chart</option>
              <option value="area">Area Chart</option>
            </select>
          </div>

          {/* Sort Options */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">Sort By</label>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [by, order] = e.target.value.split('-')
                setSortBy(by)
                setSortOrder(order)
              }}
              className="px-3 py-2 bg-primary border border-gray-600 rounded-md text-white text-sm"
            >
              <option value="amount-desc">Amount (High to Low)</option>
              <option value="amount-asc">Amount (Low to High)</option>
              <option value="date-desc">Date (Newest First)</option>
              <option value="date-asc">Date (Oldest First)</option>
              <option value="category-asc">Category (A-Z)</option>
              <option value="category-desc">Category (Z-A)</option>
            </select>
          </div>
        </div>

        {/* View Mode Selector */}
        <div className="flex gap-2">
          {['overview', 'categories', 'trends', 'methods'].map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === mode
                  ? 'bg-accent text-white'
                  : 'bg-primary text-gray-300 hover:text-white'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-secondary rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Total Expenses</h3>
          <p className="text-3xl font-bold text-white">₹{analyticsData.totalAmount.toFixed(2)}</p>
          <p className="text-sm text-gray-400 mt-1">
            {filteredExpenses.length !== expenses.length && `Filtered: ${filteredExpenses.length} of ${expenses.length}`}
          </p>
        </div>
        <div className="bg-secondary rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Total Transactions</h3>
          <p className="text-3xl font-bold text-white">{filteredExpenses.length}</p>
          <p className="text-sm text-gray-400 mt-1">
            {analyticsData.categoryData.length} categories
          </p>
        </div>
        <div className="bg-secondary rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Average Transaction</h3>
          <p className="text-3xl font-bold text-white">
            ₹{filteredExpenses.length > 0 ? (analyticsData.totalAmount / filteredExpenses.length).toFixed(2) : '0.00'}
          </p>
        </div>
        <div className="bg-secondary rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Top Category</h3>
          <p className="text-xl font-bold text-white">
            {analyticsData.categoryData[0]?.name || 'N/A'}
          </p>
          <p className="text-sm text-gray-400">
            ₹{analyticsData.categoryData[0]?.value.toFixed(2) || '0.00'} ({analyticsData.categoryData[0]?.percentage || '0'}%)
          </p>
        </div>
      </div>

      {/* Dynamic Content Based on View Mode */}
      {viewMode === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-secondary rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Spending by Category</h3>
            {analyticsData.categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analyticsData.categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} (${percentage}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analyticsData.categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`₹${value.toFixed(2)}`, 'Amount']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">
                No data available
              </div>
            )}
          </div>

          <div className="bg-secondary rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Daily Spending Trend</h3>
            {analyticsData.dailyData.length > 0 ? (
              renderChart(analyticsData.dailyData, 'amount')
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">
                No data available
              </div>
            )}
          </div>
        </div>
      )}

      {viewMode === 'categories' && (
        <div className="space-y-6">
          <div className="bg-secondary rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Category Breakdown</h3>
            <div className="space-y-4">
              {analyticsData.categoryData.map((category, index) => (
                <div key={category.name} className="flex items-center justify-between p-3 bg-primary rounded">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <div>
                      <p className="text-white font-medium">{category.name}</p>
                      <p className="text-sm text-gray-400">{category.count} transactions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-semibold">₹{category.value.toFixed(2)}</p>
                    <p className="text-sm text-gray-400">{category.percentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'trends' && (
        <div className="space-y-6">
          <div className="bg-secondary rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Spending Trends</h3>
            {analyticsData.dailyData.length > 0 ? (
              renderChart(analyticsData.dailyData, 'amount')
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">
                No data available
              </div>
            )}
          </div>
          
          {analyticsData.weeklyData.length > 1 && (
            <div className="bg-secondary rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Weekly Trends</h3>
              {renderChart(analyticsData.weeklyData, 'amount', '#8884d8')}
            </div>
          )}
          
          {analyticsData.monthlyData.length > 1 && (
            <div className="bg-secondary rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Monthly Trends</h3>
              {renderChart(analyticsData.monthlyData, 'amount', '#82ca9d')}
            </div>
          )}
        </div>
      )}

      {viewMode === 'methods' && (
        <div className="space-y-6">
          <div className="bg-secondary rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Payment Methods</h3>
            {analyticsData.methodData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.methodData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="method" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    formatter={(value) => [`₹${value.toFixed(2)}`, 'Amount']}
                    contentStyle={{ backgroundColor: '#1f1830', border: '1px solid #374151' }}
                  />
                  <Bar dataKey="amount" fill="#0ac7b8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">
                No data available
              </div>
            )}
          </div>
          
          <div className="bg-secondary rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Payment Method Details</h3>
            <div className="space-y-3">
              {analyticsData.methodData.map((method, index) => (
                <div key={method.method} className="flex items-center justify-between p-3 bg-primary rounded">
                  <div>
                    <p className="text-white font-medium">{method.method}</p>
                    <p className="text-sm text-gray-400">{method.count} transactions</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-semibold">₹{method.amount.toFixed(2)}</p>
                    <p className="text-sm text-gray-400">{method.percentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Recent Expenses List */}
      <div className="bg-secondary rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">
            Recent Expenses 
            {(selectedCategory !== 'all' || selectedMethod !== 'all') && 
              <span className="text-sm text-gray-400 ml-2">(Filtered)</span>
            }
          </h3>
          <p className="text-sm text-gray-400">
            Showing {Math.min(20, sortedExpenses.length)} of {sortedExpenses.length} expenses
          </p>
        </div>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {sortedExpenses.slice(0, 20).map((expense) => (
            <div key={expense.id} className="flex justify-between items-center py-3 px-4 bg-primary rounded-lg hover:bg-opacity-80 transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-white font-medium">{expense.categories?.name || 'Unknown'}</p>
                    <p className="text-sm text-gray-400">
                      {format(new Date(expense.expense_date), 'MMM dd, yyyy')} • {expense.expense_method?.toUpperCase() || 'Unknown'}
                    </p>
                    {expense.description && (
                      <p className="text-xs text-gray-500 mt-1">{expense.description}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-accent font-semibold text-lg">₹{expense.amount.toFixed(2)}</p>
              </div>
            </div>
          ))}
          {sortedExpenses.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              No expenses found for the selected filters and period
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats Footer */}
      {filteredExpenses.length > 0 && (
        <div className="bg-secondary rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-accent">
                ₹{Math.max(...filteredExpenses.map(e => e.amount)).toFixed(2)}
              </p>
              <p className="text-sm text-gray-400">Highest Expense</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-accent">
                ₹{Math.min(...filteredExpenses.map(e => e.amount)).toFixed(2)}
              </p>
              <p className="text-sm text-gray-400">Lowest Expense</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-accent">
                {analyticsData.categoryData.length}
              </p>
              <p className="text-sm text-gray-400">Categories Used</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-accent">
                {new Set(filteredExpenses.map(e => format(new Date(e.expense_date), 'yyyy-MM-dd'))).size}
              </p>
              <p className="text-sm text-gray-400">Days with Expenses</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}