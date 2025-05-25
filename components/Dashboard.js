"use client";
import { useState, useEffect } from 'react';
import { Plus, LogOut, TrendingUp, DollarSign, Calendar, Filter, Search, Download, BarChart3, PieChart, RefreshCw, Edit3, Trash2, X } from 'lucide-react'; // Added Edit3, Trash2, X
import { signOut, getCurrentUser } from '../lib/auth';
import { getExpenses, deleteExpense as deleteExpenseFromDB } from '../lib/database'; // Renamed to avoid conflict
import ExpenseForm from './ExpenseForm';
import ExpenseInsights from './ExpenseInsights';

// StatCard remains the same

function StatCard({ title, value, icon: Icon, trend, trendValue }) {
  return (
    <div className="bg-secondary rounded-2xl p-4 md:p-6 shadow-sm hover:shadow-md transition">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="p-2 md:p-3 bg-accent/20 rounded-xl">
            <Icon className="w-5 h-5 md:w-6 md:h-6 text-accent" />
          </div>
          <div>
            <p className="text-xs md:text-sm text-gray-400">{title}</p>
            <p className="text-lg md:text-xl font-semibold text-white">{value}</p>
          </div>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs md:text-sm ${trend === 'up' ? 'text-red-400' : 'text-green-400'}`}>
            <TrendingUp className={`w-3 h-3 md:w-4 md:h-4 ${trend === 'down' ? 'rotate-180' : ''}`} />
            <span>{trendValue}</span>
          </div>
        )}
      </div>
    </div>
  );
}


function ExpenseItem({ expense, onEdit, onDelete }) {
  const formatDate = (dateString) => {
    if (!dateString) return 'Invalid Date';
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'short',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-primary rounded-xl hover:bg-primary/80 transition group">
      <div className="flex items-center space-x-3 sm:space-x-4 mb-3 sm:mb-0 flex-grow">
        <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center flex-shrink-0">
          {/* You might want a dynamic icon based on category later */}
          <DollarSign className="w-5 h-5 text-accent" />
        </div>
        <div className="flex-grow">
          <p className="text-white font-medium text-sm sm:text-base">
            {expense.categories?.name || 'Uncategorized'}
          </p>
          <p className="text-xs sm:text-sm text-gray-400">
            {formatDate(expense.expense_date)} • {expense.expense_method?.toUpperCase() || 'N/A'}
          </p>
          {expense.description && (
            <p className="text-xs text-gray-500 mt-1 break-all">{expense.description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-center">
        <div className="text-right">
          <p className="text-base sm:text-lg font-semibold text-white">₹{typeof expense.amount === 'number' ? expense.amount.toFixed(2) : '0.00'}</p>
        </div>
        {/* On mobile, buttons could be always visible or revealed on tap (more complex) */}
        <div className="flex gap-1 sm:gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button 
              onClick={() => onEdit(expense)} 
              className="p-2 text-gray-400 hover:text-accent rounded-md"
              aria-label="Edit expense"
            >
              <Edit3 size={16} />
            </button>
          )}
          {onDelete && (
            <button 
              onClick={() => onDelete(expense)} 
              className="p-2 text-gray-400 hover:text-red-400 rounded-md"
              aria-label="Delete expense"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DateRangeFilter({ startDate, endDate, onStartDateChange, onEndDateChange, onClear }) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 bg-secondary/50 rounded-lg p-3 sm:p-4">
      <Calendar className="w-5 h-5 text-gray-400 hidden sm:block" />
      <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="bg-primary text-white rounded px-3 py-2 text-sm w-full sm:w-auto"
        />
        <span className="text-gray-400 hidden sm:inline">to</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="bg-primary text-white rounded px-3 py-2 text-sm w-full sm:w-auto"
        />
      </div>
      {(startDate || endDate) && (
        <button
          onClick={onClear}
          className="text-gray-400 hover:text-white text-sm px-3 py-2 bg-primary rounded w-full sm:w-auto mt-2 sm:mt-0"
        >
          Clear Dates
        </button>
      )}
    </div>
  );
}


export default function Dashboard({ onSignOut }) {
  const [user, setUser] = useState(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [activeTab, setActiveTab] = useState('expenses');
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');

  useEffect(() => {
    initializeUser();
  }, []);

  useEffect(() => {
    filterExpenses();
  }, [expenses, searchTerm, startDate, endDate, selectedCategory, selectedMethod]);

  const initializeUser = async () => {
    setLoading(true);
    setError('');
    const { user: currentUser, error: userError } = await getCurrentUser();
    if (userError) {
        setError("Failed to get user session. Please try logging in again.");
        setLoading(false);
        // Potentially call onSignOut() or redirect to login
        return;
    }
    setUser(currentUser);
    if (currentUser) {
      await fetchAllExpenses(currentUser.id);
    } else {
        // No user session, potentially redirect to login or show login prompt
        onSignOut?.(); // if onSignOut handles redirect to login
    }
    setLoading(false);
  };

  const fetchAllExpenses = async (userId) => {
    if (!userId) return;
    setRefreshing(true);
    setError('');
    const { data, error: fetchError } = await getExpenses(userId);
    if (fetchError) {
      setError(`Failed to fetch expenses: ${fetchError.message}`);
      setExpenses([]);
    } else if (data) {
      const sortedData = data.sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date));
      setExpenses(sortedData);
    }
    setRefreshing(false);
  };

  const filterExpenses = () => {
    let filtered = [...expenses]; // Create a copy to avoid mutating original state directly

    if (searchTerm) {
      filtered = filtered.filter(expense => 
        expense.categories?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.amount?.toString().includes(searchTerm)
      );
    }

    if (startDate) {
      filtered = filtered.filter(expense => 
        new Date(expense.expense_date) >= new Date(new Date(startDate).setHours(0,0,0,0))
      );
    }
    if (endDate) {
      filtered = filtered.filter(expense => 
        new Date(expense.expense_date) <= new Date(new Date(endDate).setHours(23,59,59,999))
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(expense => 
        expense.categories?.name === selectedCategory
      );
    }

    if (selectedMethod) {
      filtered = filtered.filter(expense => 
        expense.expense_method === selectedMethod
      );
    }
    setFilteredExpenses(filtered);
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null); // Clear user state
    setExpenses([]); // Clear expenses
    if (onSignOut) onSignOut();
  };

  const handleExpenseFormSuccess = () => { // Renamed from handleExpenseAdded for clarity
    setShowExpenseForm(false);
    setEditingExpense(null);
    if (user) fetchAllExpenses(user.id); // Refresh expenses
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setShowExpenseForm(true);
  };

  const handleDeleteExpense = async (expenseToDelete) => {
    if (window.confirm(`Are you sure you want to delete the expense: ${expenseToDelete.categories?.name || 'Uncategorized'} - ₹${expenseToDelete.amount}?`)) {
      setError('');
      const { error: deleteError } = await deleteExpenseFromDB(expenseToDelete.id);
      if (deleteError) {
        setError(`Failed to delete expense: ${deleteError.message}`);
        // Optionally, show a toast notification
      } else {
        setExpenses(prevExpenses => prevExpenses.filter(exp => exp.id !== expenseToDelete.id));
        // Optionally, show a success toast
      }
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setSelectedCategory('');
    setSelectedMethod('');
  };
  
  const exportData = () => {
    if (filteredExpenses.length === 0) {
        alert("No data to export.");
        return;
    }
    const csvContent = [
      ['Date', 'Category', 'Amount', 'Method', 'Description'],
      ...filteredExpenses.map(expense => [
        expense.expense_date,
        expense.categories?.name || '',
        expense.amount,
        expense.expense_method || '',
        expense.description || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const thisMonthExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.expense_date);
    return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
  });
  
  const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const lastMonthExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.expense_date);
    return expenseDate.getMonth() === lastMonthDate.getMonth() && expenseDate.getFullYear() === lastMonthDate.getFullYear();
  });

  const today = new Date();
  const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1) )); // Monday as start of week
  startOfWeek.setHours(0,0,0,0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23,59,59,999);

  const thisWeekExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.expense_date);
    return expenseDate >= startOfWeek && expenseDate <= endOfWeek;
  });

  const monthlyTotal = thisMonthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const lastMonthTotal = lastMonthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const weeklyTotal = thisWeekExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  
  const monthlyTrendValue = lastMonthTotal !== 0 
    ? (((monthlyTotal - lastMonthTotal) / lastMonthTotal) * 100)
    : (monthlyTotal > 0 ? 100 : 0); // If last month was 0, any spending is 100% increase

  const monthlyTrendDirection = monthlyTotal === lastMonthTotal ? null : (monthlyTotal > lastMonthTotal ? 'up' : 'down');
  
  const avgExpense = expenses.length > 0
    ? (expenses.reduce((sum, e) => sum + (e.amount || 0), 0) / expenses.length)
    : 0;

  const categories = [...new Set(expenses.map(e => e.categories?.name).filter(Boolean))].sort();
  const methods = [...new Set(expenses.map(e => e.expense_method).filter(Boolean))].sort();

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center text-white p-4 text-center">
        <RefreshCw size={32} className="animate-spin mr-3" />
        Loading your financial dashboard...
      </div>
    );
  }

  if (error) {
    return (
        <div className="min-h-screen bg-primary flex flex-col items-center justify-center text-red-400 p-4 text-center">
            <X size={48} className="mb-4"/>
            <p className="text-xl mb-2">Oops! Something went wrong.</p>
            <p className="text-sm mb-6">{error}</p>
            <button 
                onClick={initializeUser} 
                className="bg-accent hover:bg-accent/90 text-white px-6 py-2 rounded-md flex items-center gap-2"
            >
                <RefreshCw size={16} /> Try Again
            </button>
        </div>
    );
  }
  
  if (!user) {
     // This case should ideally be handled by redirecting to a login page via onSignOut
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center text-white p-4 text-center">
        <p>No active session. Please log in.</p>
        {/* Optionally, add a button that triggers `onSignOut` if it redirects to login */}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary text-white">
      {/* Header */}
      <header className="bg-secondary shadow sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row justify-between items-center">
          <div className="mb-2 sm:mb-0 text-center sm:text-left">
            <h1 className="text-xl sm:text-2xl font-bold text-white">Spendify</h1>
            <p className="text-xs sm:text-sm text-gray-400 truncate max-w-[200px] sm:max-w-xs">
              Welcome, {user.email}
            </p>
          </div>
          <div className="flex flex-wrap justify-center sm:justify-end gap-2">
            <button 
              onClick={() => user && fetchAllExpenses(user.id)} 
              disabled={refreshing}
              className="bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white px-3 py-2 rounded-md text-xs sm:text-sm flex items-center gap-2"
              title="Refresh data"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> 
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button 
              onClick={() => { setEditingExpense(null); setShowExpenseForm(true); }} 
              className="bg-accent hover:bg-accent/90 text-white px-3 py-2 rounded-md text-xs sm:text-sm flex items-center gap-2"
            >
              <Plus size={16} /> <span className="hidden sm:inline">Add Expense</span><span className="sm:hidden">Add</span>
            </button>
            <button 
              onClick={handleSignOut} 
              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-md text-xs sm:text-sm flex items-center gap-2"
            >
              <LogOut size={16} /> <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-4 sm:mt-6">
        <div className="flex space-x-1 sm:space-x-2 bg-secondary rounded-xl p-1">
          <button onClick={() => setActiveTab('expenses')} className={`flex-1 py-2 px-2 sm:px-3 rounded-md text-xs sm:text-sm font-medium flex items-center justify-center gap-1 sm:gap-2 transition-colors ${activeTab === 'expenses' ? 'bg-accent text-white' : 'text-gray-300 hover:text-white hover:bg-primary'}`}>
            <DollarSign size={16} /> Expenses
          </button>
          <button onClick={() => setActiveTab('insights')} className={`flex-1 py-2 px-2 sm:px-3 rounded-md text-xs sm:text-sm font-medium flex items-center justify-center gap-1 sm:gap-2 transition-colors ${activeTab === 'insights' ? 'bg-accent text-white' : 'text-gray-300 hover:text-white hover:bg-primary'}`}>
            <TrendingUp size={16} /> Insights
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === 'expenses' && (
          <>
            {/* Enhanced Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
              <StatCard 
                title="This Month" 
                value={`₹${monthlyTotal.toFixed(2)}`} 
                icon={DollarSign}
                trend={monthlyTrendDirection}
                trendValue={`${monthlyTrendValue.toFixed(1)}%`}
              />
              <StatCard 
                title="This Week" 
                value={`₹${weeklyTotal.toFixed(2)}`} 
                icon={Calendar}
              />
              <StatCard 
                title="Total Records" 
                value={expenses.length} 
                icon={BarChart3}
              />
              <StatCard 
                title="Avg. Expense" 
                value={`₹${avgExpense.toFixed(2)}`} 
                icon={PieChart}
              />
            </div>

            {/* Filters and Search */}
            <div className="bg-secondary rounded-2xl p-4 sm:p-6 mb-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                <h3 className="text-lg font-semibold text-white">Filter & Search</h3>
                <div className="flex gap-2 flex-wrap justify-center">
                  <button 
                    onClick={exportData}
                    className="bg-accent hover:bg-accent/90 text-white px-3 py-2 rounded-md text-xs sm:text-sm flex items-center gap-2"
                  >
                    <Download size={16} /> Export
                  </button>
                  <button 
                    onClick={clearFilters}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-md text-xs sm:text-sm"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search amount, category, desc..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-primary text-white rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-accent focus:border-accent"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-primary text-white rounded-lg px-4 py-2 text-sm focus:ring-accent focus:border-accent appearance-none"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <select
                  value={selectedMethod}
                  onChange={(e) => setSelectedMethod(e.target.value)}
                  className="bg-primary text-white rounded-lg px-4 py-2 text-sm focus:ring-accent focus:border-accent appearance-none"
                >
                  <option value="">All Methods</option>
                  {methods.map(method => (
                    <option key={method} value={method}>{method.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                 {/* Quick Date Filters - adjusted for better layout */}
                <div className="flex flex-col sm:flex-row gap-2">
                    <button
                        onClick={() => {
                        const todayDate = new Date();
                        const lastWeek = new Date(todayDate.getTime() - 7 * 24 * 60 * 60 * 1000);
                        setStartDate(lastWeek.toISOString().split('T')[0]);
                        setEndDate(todayDate.toISOString().split('T')[0]);
                        }}
                        className="flex-1 bg-primary hover:bg-primary/80 text-white rounded px-3 py-2 text-sm"
                    >
                        Last 7 days
                    </button>
                    <button
                        onClick={() => {
                        const todayDate = new Date();
                        const firstDay = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
                        setStartDate(firstDay.toISOString().split('T')[0]);
                        setEndDate(todayDate.toISOString().split('T')[0]);
                        }}
                        className="flex-1 bg-primary hover:bg-primary/80 text-white rounded px-3 py-2 text-sm"
                    >
                        This Month
                    </button>
                </div>
                <DateRangeFilter
                  startDate={startDate}
                  endDate={endDate}
                  onStartDateChange={setStartDate}
                  onEndDateChange={setEndDate}
                  onClear={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                />
              </div>
            </div>

            {/* Expenses List */}
            <div className="bg-secondary rounded-2xl p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-6 gap-2">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-white">
                    Expenses ({filteredExpenses.length})
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-400">
                    Total Displayed: ₹{filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0).toFixed(2)}
                  </p>
                </div>
                {/* Add New button here removed as it's in the header, can be re-added if desired for mobile */}
              </div>

              {refreshing && expenses.length === 0 ? (
                <div className="text-center py-12 text-gray-400">Fetching your expenses...</div>
              ) : filteredExpenses.length > 0 ? (
                <div className="space-y-3 sm:space-y-4 max-h-[50vh] sm:max-h-[60vh] overflow-y-auto pr-2"> {/* Added pr-2 for scrollbar space */}
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
                  <DollarSign className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400 text-base sm:text-lg mb-4">
                    {expenses.length === 0 ? 'No expenses recorded yet.' : 'No expenses match your current filters.'}
                  </p>
                  {expenses.length === 0 && (
                    <button 
                      onClick={() => { setEditingExpense(null); setShowExpenseForm(true); }} 
                      className="bg-accent hover:bg-accent/90 text-white px-4 sm:px-6 py-2 rounded-md text-sm sm:text-base"
                    >
                      Add Your First Expense
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'insights' && user && <ExpenseInsights user={user} expenses={expenses} />}
      </main>

      {showExpenseForm && user && (
        <ExpenseForm
          user={user}
          expense={editingExpense}
          onSuccess={handleExpenseFormSuccess} // Changed prop name for clarity
          onClose={() => {
            setShowExpenseForm(false);
            setEditingExpense(null);
          }}
        />
      )}
    </div>
  );
}