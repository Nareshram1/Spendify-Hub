"use client";
import { useState, useEffect } from 'react'
import { Plus, LogOut, TrendingUp, DollarSign, Calendar, Filter, Search, Download, BarChart3, PieChart, RefreshCw } from 'lucide-react'
import { signOut, getCurrentUser } from '../lib/auth'
import { getExpenses } from '../lib/database'
import ExpenseForm from './ExpenseForm'
import ExpenseInsights from './ExpenseInsights'

function StatCard({ title, value, icon: Icon, trend, trendValue }) {
  return (
    <div className="bg-secondary rounded-2xl p-6 shadow-sm hover:shadow-md transition">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-accent/20 rounded-xl">
            <Icon className="w-6 h-6 text-accent" />
          </div>
          <div>
            <p className="text-sm text-gray-400">{title}</p>
            <p className="text-xl font-semibold text-white">{value}</p>
          </div>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${trend === 'up' ? 'text-red-400' : 'text-green-400'}`}>
            <TrendingUp className={`w-4 h-4 ${trend === 'down' ? 'rotate-180' : ''}`} />
            <span>{trendValue}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function ExpenseItem({ expense, onEdit, onDelete }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'short',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      })
    }
  }

  return (
    <div className="flex items-center justify-between p-4 bg-primary rounded-xl hover:bg-primary/80 transition group">
      <div className="flex items-center space-x-4">
        <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
          <DollarSign className="w-5 h-5 text-accent" />
        </div>
        <div>
          <p className="text-white font-medium">
            {expense.categories?.name || 'Unknown Category'}
          </p>
          <p className="text-sm text-gray-400">
            {formatDate(expense.expense_date)} • {expense.expense_method?.toUpperCase()}
          </p>
          {expense.description && (
            <p className="text-xs text-gray-500 mt-1">{expense.description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-lg font-semibold text-white">₹{expense.amount.toFixed(2)}</p>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
          {onEdit && (
            <button onClick={() => onEdit(expense)} className="text-gray-400 hover:text-accent text-sm">
              Edit
            </button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(expense)} className="text-gray-400 hover:text-red-400 text-sm">
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function DateRangeFilter({ startDate, endDate, onStartDateChange, onEndDateChange, onClear }) {
  return (
    <div className="flex items-center gap-4 bg-secondary rounded-lg p-4">
      <Calendar className="w-5 h-5 text-gray-400" />
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="bg-primary text-white rounded px-3 py-1 text-sm"
        />
        <span className="text-gray-400">to</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="bg-primary text-white rounded px-3 py-1 text-sm"
        />
      </div>
      {(startDate || endDate) && (
        <button
          onClick={onClear}
          className="text-gray-400 hover:text-white text-sm"
        >
          Clear
        </button>
      )}
    </div>
  )
}

export default function Dashboard({ onSignOut }) {
  const [user, setUser] = useState(null)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [activeTab, setActiveTab] = useState('expenses')
  const [expenses, setExpenses] = useState([])
  const [filteredExpenses, setFilteredExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedMethod, setSelectedMethod] = useState('')

  useEffect(() => {
    initializeUser()
  }, [])

  useEffect(() => {
    filterExpenses()
  }, [expenses, searchTerm, startDate, endDate, selectedCategory, selectedMethod])

  const initializeUser = async () => {
    const { user } = await getCurrentUser()
    setUser(user)
    if (user) await fetchAllExpenses(user.id)
    setLoading(false)
  }

  const fetchAllExpenses = async (userId) => {
    setRefreshing(true)
    const { data, error } = await getExpenses(userId, null, null)
    if (!error && data) {
      // Sort by date descending (newest first)
      const sortedData = data.sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date))
      setExpenses(sortedData)
    }
    setRefreshing(false)
  }

  const filterExpenses = () => {
    let filtered = expenses

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(expense => 
        expense.categories?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Date range filter
    if (startDate) {
      filtered = filtered.filter(expense => 
        new Date(expense.expense_date) >= new Date(startDate)
      )
    }
    if (endDate) {
      filtered = filtered.filter(expense => 
        new Date(expense.expense_date) <= new Date(endDate)
      )
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(expense => 
        expense.categories?.name === selectedCategory
      )
    }

    // Payment method filter
    if (selectedMethod) {
      filtered = filtered.filter(expense => 
        expense.expense_method === selectedMethod
      )
    }

    setFilteredExpenses(filtered)
  }

  const handleSignOut = async () => {
    await signOut()
    onSignOut()
  }

  const handleExpenseAdded = () => {
    setShowExpenseForm(false)
    setEditingExpense(null)
    if (user) fetchAllExpenses(user.id)
  }

  const handleEditExpense = (expense) => {
    setEditingExpense(expense)
    setShowExpenseForm(true)
  }

  const handleDeleteExpense = async (expense) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      // Add delete functionality here
      console.log('Delete expense:', expense.id)
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setStartDate('')
    setEndDate('')
    setSelectedCategory('')
    setSelectedMethod('')
  }

  const exportData = () => {
    const csvContent = [
      ['Date', 'Category', 'Amount', 'Method', 'Description'],
      ...filteredExpenses.map(expense => [
        expense.expense_date,
        expense.categories?.name || '',
        expense.amount,
        expense.expense_method || '',
        expense.description || ''
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Calculate statistics with proper date handling
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  
  const thisMonthExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.expense_date)
    return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear
  })
  
  const lastMonthExpenses = expenses.filter(expense => {
    const lastMonth = new Date(currentYear, currentMonth - 1, 1)
    const expenseDate = new Date(expense.expense_date)
    return expenseDate.getMonth() === lastMonth.getMonth() && expenseDate.getFullYear() === lastMonth.getFullYear()
  })

  const thisWeekExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.expense_date)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return expenseDate >= weekAgo
  })

  const monthlyTotal = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0)
  const lastMonthTotal = lastMonthExpenses.reduce((sum, e) => sum + e.amount, 0)
  const weeklyTotal = thisWeekExpenses.reduce((sum, e) => sum + e.amount, 0)
  
  const monthlyTrend = lastMonthTotal > 0 
    ? (((monthlyTotal - lastMonthTotal) / lastMonthTotal) * 100).toFixed(1)
    : '0'
  
  const avgExpense = expenses.length > 0
    ? (expenses.reduce((sum, e) => sum + e.amount, 0) / expenses.length)
    : 0

  // Get unique categories and methods for filters
  const categories = [...new Set(expenses.map(e => e.categories?.name).filter(Boolean))]
  const methods = [...new Set(expenses.map(e => e.expense_method).filter(Boolean))]

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-primary">
      {/* Header */}
      <header className="bg-secondary shadow">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Spendify</h1>
            <p className="text-sm text-gray-400">Welcome, {user?.email}</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => user && fetchAllExpenses(user.id)} 
              disabled={refreshing}
              className="bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white px-4 py-2 rounded-md flex items-center gap-2"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> 
              Refresh
            </button>
            <button onClick={() => setShowExpenseForm(true)} className="bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-md flex items-center gap-2">
              <Plus size={16} /> Add Expense
            </button>
            <button onClick={handleSignOut} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md flex items-center gap-2">
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-6 mt-6">
        <div className="flex space-x-2 bg-secondary rounded-xl p-1">
          <button onClick={() => setActiveTab('expenses')} className={`flex-1 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'expenses' ? 'bg-accent text-white' : 'text-gray-300 hover:text-white hover:bg-primary'}`}>
            <DollarSign size={16} /> Expenses
          </button>
          <button onClick={() => setActiveTab('insights')} className={`flex-1 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'insights' ? 'bg-accent text-white' : 'text-gray-300 hover:text-white hover:bg-primary'}`}>
            <TrendingUp size={16} /> Insights
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'expenses' && (
          <>
            {/* Enhanced Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard 
                title="This Month" 
                value={`₹${monthlyTotal.toFixed(2)}`} 
                icon={DollarSign}
                trend={monthlyTotal > lastMonthTotal ? 'up' : 'down'}
                trendValue={`${monthlyTrend}%`}
              />
              <StatCard 
                title="This Week" 
                value={`₹${weeklyTotal.toFixed(2)}`} 
                icon={Calendar}
              />
              <StatCard 
                title="Total Expenses" 
                value={expenses.length} 
                icon={BarChart3}
              />
              <StatCard 
                title="Average Expense" 
                value={`₹${avgExpense.toFixed(2)}`} 
                icon={PieChart}
              />
            </div>

            {/* Filters and Search */}
            <div className="bg-secondary rounded-2xl p-6 mb-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">Filters</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={exportData}
                    className="bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-md text-sm flex items-center gap-2"
                  >
                    <Download size={16} /> Export
                  </button>
                  <button 
                    onClick={clearFilters}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search expenses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-primary text-white rounded-lg pl-10 pr-4 py-2 text-sm"
                  />
                </div>

                {/* Category Filter */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-primary text-white rounded-lg px-4 py-2 text-sm"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>

                {/* Method Filter */}
                <select
                  value={selectedMethod}
                  onChange={(e) => setSelectedMethod(e.target.value)}
                  className="bg-primary text-white rounded-lg px-4 py-2 text-sm"
                >
                  <option value="">All Methods</option>
                  {methods.map(method => (
                    <option key={method} value={method}>{method.toUpperCase()}</option>
                  ))}
                </select>

                {/* Quick Date Filters */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const today = new Date()
                      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
                      setStartDate(lastWeek.toISOString().split('T')[0])
                      setEndDate(today.toISOString().split('T')[0])
                    }}
                    className="bg-primary hover:bg-primary/80 text-white rounded px-3 py-2 text-sm"
                  >
                    Last 7 days
                  </button>
                  <button
                    onClick={() => {
                      const today = new Date()
                      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
                      setStartDate(firstDay.toISOString().split('T')[0])
                      setEndDate(today.toISOString().split('T')[0])
                    }}
                    className="bg-primary hover:bg-primary/80 text-white rounded px-3 py-2 text-sm"
                  >
                    This Month
                  </button>
                </div>
              </div>

              {/* Date Range */}
              <DateRangeFilter
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                onClear={() => {
                  setStartDate('')
                  setEndDate('')
                }}
              />
            </div>

            {/* Expenses List */}
            <div className="bg-secondary rounded-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    Expenses ({filteredExpenses.length})
                  </h2>
                  <p className="text-sm text-gray-400">
                    Total: ₹{filteredExpenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
                  </p>
                </div>
                <button onClick={() => setShowExpenseForm(true)} className="bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-md text-sm">
                  Add New
                </button>
              </div>

              {filteredExpenses.length > 0 ? (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {filteredExpenses.map((expense) => (
                    <ExpenseItem 
                      key={expense.id} 
                      expense={expense}
                      onEdit={handleEditExpense}
                      onDelete={handleDeleteExpense}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg mb-4">
                    {expenses.length === 0 ? 'No expenses yet' : 'No expenses match your filters'}
                  </p>
                  <button onClick={() => setShowExpenseForm(true)} className="bg-accent hover:bg-accent/90 text-white px-6 py-2 rounded-md">
                    Add Your First Expense
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'insights' && user && <ExpenseInsights user={user} />}
      </main>

      {showExpenseForm && (
        <ExpenseForm
          user={user}
          expense={editingExpense}
          onExpenseAdded={handleExpenseAdded}
          onClose={() => {
            setShowExpenseForm(false)
            setEditingExpense(null)
          }}
        />
      )}
    </div>
  )
}