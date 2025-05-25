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
  startOfYear, endOfYear,
  subDays, subWeeks, subMonths, subYears,
  addDays, addWeeks, addMonths, addYears,
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
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0)
  const [selectedMonthOffset, setSelectedMonthOffset] = useState(0)
  const [selectedYearOffset, setSelectedYearOffset] = useState(0)

  useEffect(() => { fetchExpenses() }, [user, period, customStartDate, customEndDate, selectedWeekOffset, selectedMonthOffset, selectedYearOffset])

  const fetchExpenses = async () => {
    setLoading(true)
    const { startDate, endDate } = getDateRange()
    const { data, error } = await getExpenses(user.id, startDate, endDate)
    if (!error && data) setExpenses(data)
    setLoading(false)
  }

  const getDateRange = () => {
    const now = new Date()
    switch (period) {
      case 'daily': {
        const day = addDays(now, selectedWeekOffset)
        return { startDate: format(day,'yyyy-MM-dd'), endDate: format(day,'yyyy-MM-dd') }
      }
      case 'weekly': {
        const start = addWeeks(startOfWeek(now), selectedWeekOffset)
        const end = addWeeks(endOfWeek(now), selectedWeekOffset)
        return { startDate: format(start,'yyyy-MM-dd'), endDate: format(end,'yyyy-MM-dd') }
      }
      case 'monthly': {
        const start = addMonths(startOfMonth(now), selectedMonthOffset)
        const end = addMonths(endOfMonth(now), selectedMonthOffset)
        return { startDate: format(start,'yyyy-MM-dd'), endDate: format(end,'yyyy-MM-dd') }
      }
      case 'yearly': {
        const start = addYears(startOfYear(now), selectedYearOffset)
        const end = addYears(endOfYear(now), selectedYearOffset)
        return { startDate: format(start,'yyyy-MM-dd'), endDate: format(end,'yyyy-MM-dd') }
      }
      case 'custom': return { startDate: customStartDate, endDate: customEndDate }
      default: return { startDate: null, endDate: null }
    }
  }

  const filteredExpenses = useMemo(() => expenses.filter(e =>
    (selectedCategory === 'all' || e.categories?.name === selectedCategory) &&
    (selectedMethod === 'all' || e.expense_method === selectedMethod)
  ), [expenses, selectedCategory, selectedMethod])

  const sortedExpenses = useMemo(() => {
    const sorted = [...filteredExpenses].sort((a, b) => {
      let cmp = 0
      if (sortBy === 'amount') cmp = a.amount - b.amount
      if (sortBy === 'date') cmp = new Date(a.expense_date) - new Date(b.expense_date)
      if (sortBy === 'category') cmp = (a.categories?.name||'').localeCompare(b.categories?.name||'')
      return sortOrder === 'desc' ? -cmp : cmp
    })
    return sorted
  }, [filteredExpenses, sortBy, sortOrder])

  const analytics = useMemo(() => {
    if (!filteredExpenses.length) return { total:0, category:[], daily:[], weekly:[], monthly:[], methods:[] }
    const total = filteredExpenses.reduce((sum,e)=>sum+e.amount,0)
    const catMap = {}, dayMap = {}, weekMap={}, monthMap={}, methodMap={}
    filteredExpenses.forEach(e => {
      const c = e.categories?.name||'Unknown'; catMap[c]=(catMap[c]||0)+e.amount
      const d = format(new Date(e.expense_date),'yyyy-MM-dd'); dayMap[d]=(dayMap[d]||0)+e.amount
      const w = format(startOfWeek(new Date(e.expense_date)),'yyyy-MM-dd'); weekMap[w]=(weekMap[w]||0)+e.amount
      const m = format(new Date(e.expense_date),'yyyy-MM'); monthMap[m]=(monthMap[m]||0)+e.amount
      const pm = e.expense_method||'Unknown'; methodMap[pm]=(methodMap[pm]||0)+e.amount
    })
    const catData = Object.entries(catMap).map(([name,val])=>({ name, value: val, pct:((val/total)*100).toFixed(1) }))
    const daily = Object.entries(dayMap).map(([date,val])=>({ date: format(new Date(date),'MMM dd'), value: val }))
    const weekly = Object.entries(weekMap).map(([w,val])=>({ week: format(new Date(w),'MMM dd'), value: val }))
    const monthly = Object.entries(monthMap).map(([m,val])=>({ month: format(new Date(m+'-01'),'MMM yyyy'), value: val }))
    const methods = Object.entries(methodMap).map(([name,val])=>({ method:name.toUpperCase(), value:val, pct:((val/total)*100).toFixed(1) }))
    return { total, category: catData, daily, weekly, monthly, methods }
  }, [filteredExpenses])

  const renderChart = (data, xKey, yKey, color) => (
    <ResponsiveContainer width="100%" height={250}>
      {chartType==='line' ? (
        <LineChart data={data}>
          <XAxis dataKey={xKey} /> <YAxis /> <CartesianGrid strokeDasharray="3 3" />
          <Tooltip formatter={val=>`₹${val.toFixed(2)}`} />
          <Line dataKey={yKey} stroke={color} strokeWidth={2} />
        </LineChart>
      ) : chartType==='area' ? (
        <AreaChart data={data}>
          <XAxis dataKey={xKey} /> <YAxis /> <CartesianGrid strokeDasharray="3 3" />
          <Tooltip formatter={val=>`₹${val.toFixed(2)}`} />
          <Area dataKey={yKey} stroke={color} fill={color} fillOpacity={0.3} />
        </AreaChart>
      ) : (
        <BarChart data={data}>
          <XAxis dataKey={xKey} /> <YAxis /> <CartesianGrid strokeDasharray="3 3" />
          <Tooltip formatter={val=>`₹${val.toFixed(2)}`} />
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
        <div className="flex overflow-x-auto space-x-2 sm:space-x-4 py-1">
          {['daily','weekly','monthly','yearly','custom'].map(p => (
            <button key={p} onClick={()=>setPeriod(p)} className={`flex-shrink-0 px-3 py-1 text-sm font-medium rounded ${period===p?'bg-accent text-white':'bg-primary text-gray-300'}`}> 
              {p.charAt(0).toUpperCase()+p.slice(1)}
            </button>
          ))}
        </div>
        {['weekly','monthly','yearly'].includes(period) && (
          <div className="flex items-center justify-between text-sm">
            <button onClick={()=> period==='weekly'?setSelectedWeekOffset(o=>o-1) : period==='monthly'?setSelectedMonthOffset(o=>o-1):setSelectedYearOffset(o=>o-1)} className="px-2">←</button>
            <span>{period==='weekly'?format(addWeeks(startOfWeek(new Date()),selectedWeekOffset),'MMM dd, yyyy'):period==='monthly'?format(addMonths(new Date(),selectedMonthOffset),'MMMM yyyy'):format(addYears(new Date(),selectedYearOffset),'yyyy')}</span>
            <button onClick={()=> period==='weekly'?setSelectedWeekOffset(o=>o+1) : period==='monthly'?setSelectedMonthOffset(o=>o+1):setSelectedYearOffset(o=>o+1)} className="px-2">→</button>
            <button onClick={()=>{setSelectedWeekOffset(0);setSelectedMonthOffset(0);setSelectedYearOffset(0)}} className="px-2 bg-accent text-white rounded">Today</button>
          </div>
        )}
        {period==='custom' && (
          <div className="flex flex-col sm:flex-row gap-2">
            <input type="date" value={customStartDate} onChange={e=>setCustomStartDate(e.target.value)} className="flex-1 px-2 py-1 bg-primary border rounded text-sm text-white" />
            <input type="date" value={customEndDate} onChange={e=>setCustomEndDate(e.target.value)} className="flex-1 px-2 py-1 bg-primary border rounded text-sm text-white" />
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <select value={selectedCategory} onChange={e=>setSelectedCategory(e.target.value)} className="px-2 py-1 bg-primary border rounded text-sm text-white">
            <option value="all">All Categories</option>
            {expenses.map(e=>e.categories?.name).filter((v,i,a)=>v&&a.indexOf(v)===i).map(cat=><option key={cat} value={cat}>{cat}</option>)}
          </select>
          <select value={selectedMethod} onChange={e=>setSelectedMethod(e.target.value)} className="px-2 py-1 bg-primary border rounded text-sm text-white">
            <option value="all">All Methods</option>
            {expenses.map(e=>e.expense_method).filter((v,i,a)=>v&&a.indexOf(v)===i).map(m=><option key={m} value={m}>{m.toUpperCase()}</option>)}
          </select>
          <select value={chartType} onChange={e=>setChartType(e.target.value)} className="px-2 py-1 bg-primary border rounded text-sm text-white">
            <option value="bar">Bar</option><option value="line">Line</option><option value="area">Area</option>
          </select>
          <select value={`${sortBy}-${sortOrder}`} onChange={e=>{const [b,o]=e.target.value.split('-');setSortBy(b);setSortOrder(o)}} className="px-2 py-1 bg-primary border rounded text-sm text-white">
            <option value="amount-desc">Amt ↓</option><option value="amount-asc">Amt ↑</option>
            <option value="date-desc">Date ↓</option><option value="date-asc">Date ↑</option>
            <option value="category-asc">Cat A-Z</option><option value="category-desc">Cat Z-A</option>
          </select>
        </div>
        <div className="flex space-x-2 overflow-x-auto">
          {['overview','categories','trends','methods'].map(m=>
            <button key={m} onClick={()=>setViewMode(m)} className={`flex-shrink-0 px-3 py-1 text-sm rounded ${viewMode===m?'bg-accent text-white':'bg-primary text-gray-300'}`}>{m.charAt(0).toUpperCase()+m.slice(1)}</button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-secondary rounded-lg p-4 text-center">
          <div className="text-sm text-gray-400">Total</div>
          <div className="text-xl font-bold">₹{analytics.total.toFixed(2)}</div>
        </div>
        <div className="bg-secondary rounded-lg p-4 text-center">
          <div className="text-sm text-gray-400">Transactions</div>
          <div className="text-xl font-bold">{filteredExpenses.length}</div>
        </div>
        <div className="bg-secondary rounded-lg p-4 text-center">
          <div className="text-sm text-gray-400">Avg</div>
          <div className="text-xl font-bold">₹{filteredExpenses.length? (analytics.total/filteredExpenses.length).toFixed(2):'0.00'}</div>
        </div>
        <div className="bg-secondary rounded-lg p-4 text-center">
          <div className="text-sm text-gray-400">Top Cat</div>
          <div className="text-xl font-bold">{analytics.category[0]?.name||'N/A'}</div>
        </div>
      </div>

      {/* Charts */}
      {viewMode==='overview' && (
        <div className="space-y-4">
          <div className="bg-secondary rounded-lg p-4">
            <div className="text-lg text-white mb-2">By Category</div>
            {analytics.category.length?
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={analytics.category} dataKey="value" cx="50%" cy="50%" outerRadius={60} label={({name,pct})=>`${name} (${pct}%)`}>
                    {analytics.category.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v=>`₹${v.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            : <div className="h-32 text-gray-400 flex items-center justify-center">No data</div>}
          </div>
          <div className="bg-secondary rounded-lg p-4">
            <div className="text-lg text-white mb-2">Daily Trend</div>
            {analytics.daily.length? renderChart(analytics.daily,'date','value',COLORS[0])
            : <div className="h-32 text-gray-400 flex items-center justify-center">No data</div>}
          </div>
        </div>
      )}

      {viewMode==='categories' && (
        <div className="bg-secondary rounded-lg p-4 space-y-2">
          {analytics.category.map((c,i)=>(
            <div key={c.name} className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{backgroundColor:COLORS[i%COLORS.length]}} />
                <div>{c.name}</div>
              </div>
              <div>₹{c.value.toFixed(2)} ({c.pct}%)</div>
            </div>
          ))}
        </div>
      )}

      {viewMode==='trends' && (
        <div className="space-y-4">
          {renderChart(analytics.daily,'date','value',COLORS[0])}
          {analytics.weekly.length>1 && renderChart(analytics.weekly,'week','value',COLORS[1])}
          {analytics.monthly.length>1 && renderChart(analytics.monthly,'month','value',COLORS[2])}
        </div>
      )}

      {viewMode==='methods' && (
        <div className="space-y-4">
          <div className="bg-secondary rounded-lg p-4">
            {analytics.methods.length? renderChart(
              analytics.methods,'method','value',COLORS[3]
            ) : <div className="h-32 text-gray-400 flex items-center justify-center">No data</div>}
          </div>
          <div className="bg-secondary rounded-lg p-4 space-y-2">
            {analytics.methods.map(m=>(
              <div key={m.method} className="flex justify-between">
                <div>{m.method}</div>
                <div>₹{m.value.toFixed(2)} ({m.pct}%)</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent List */}
      <div className="bg-secondary rounded-lg p-4">
        <div className="flex justify-between items-center mb-2 text-sm text-gray-300">
          <div>Recent Expenses {selectedCategory!=='all'||selectedMethod!=='all'? '(Filtered)' : ''}</div>
          <div>Showing {Math.min(10,sortedExpenses.length)}/{sortedExpenses.length}</div>
        </div>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {sortedExpenses.slice(0,10).map(e=> (
            <div key={e.id} className="flex justify-between p-2 bg-primary rounded">
              <div>
                <div className="font-medium text-white">{e.categories?.name||'Unknown'}</div>
                <div className="text-xs text-gray-400">{format(new Date(e.expense_date),'MMM dd')} • {e.expense_method?.toUpperCase()}</div>
              </div>
              <div className="font-semibold text-accent">₹{e.amount.toFixed(2)}</div>
            </div>
          ))}
          {!sortedExpenses.length && <div className="text-center text-gray-400 py-4">No expenses</div>}
        </div>
      </div>

    </div>
  )
}
