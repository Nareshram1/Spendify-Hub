"use client";
import { useState, useEffect } from 'react'
import { getCategories, createExpense, createCategory } from '../lib/database'
import { Plus, X } from 'lucide-react'

export default function ExpenseForm({ user, onExpenseAdded, onClose }) {
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0])
  const [expenseMethod, setExpenseMethod] = useState('upi')
  const [loading, setLoading] = useState(false)
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  useEffect(() => {
    fetchCategories()
  }, [user])

  const fetchCategories = async () => {
    const { data, error } = await getCategories(user.id)
    if (!error && data) {
      setCategories(data)
    }
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return
    
    const { data, error } = await createCategory(user.id, newCategoryName.trim())
    if (!error && data) {
      setCategories([...categories, data[0]])
      setSelectedCategory(data[0].id)
      setNewCategoryName('')
      setShowNewCategory(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await createExpense(
      user.id,
      selectedCategory,
      amount,
      expenseDate,
      expenseMethod
    )

    if (!error) {
      onExpenseAdded()
      setAmount('')
      setSelectedCategory('')
    }

    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-secondary rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Add Expense</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Category
            </label>
            {!showNewCategory ? (
              <div className="flex gap-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="flex-1 px-3 py-2 bg-primary border border-gray-600 rounded-md text-white focus:outline-none focus:border-accent"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewCategory(true)}
                  className="px-3 py-2 bg-accent text-white rounded-md hover:bg-accent/90"
                >
                  <Plus size={16} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="New category name"
                  className="flex-1 px-3 py-2 bg-primary border border-gray-600 rounded-md text-white focus:outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  className="px-3 py-2 bg-accent text-white rounded-md hover:bg-accent/90"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewCategory(false)}
                  className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Amount
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.01"
              min="0"
              className="w-full px-3 py-2 bg-primary border border-gray-600 rounded-md text-white focus:outline-none focus:border-accent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Date
            </label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full px-3 py-2 bg-primary border border-gray-600 rounded-md text-white focus:outline-none focus:border-accent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Payment Method
            </label>
            <select
              value={expenseMethod}
              onChange={(e) => setExpenseMethod(e.target.value)}
              className="w-full px-3 py-2 bg-primary border border-gray-600 rounded-md text-white focus:outline-none focus:border-accent"
              required
            >
              <option value="upi">UPI</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-accent text-white rounded-md hover:bg-accent/90 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}