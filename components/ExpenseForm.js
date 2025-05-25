"use client";
import { useState, useEffect } from 'react';
import { getCategories, addExpense, updateExpense, createCategory } from '../lib/database';
import { Plus, X } from 'lucide-react';

export default function ExpenseForm({ user, expense, onSuccess, onClose }) { // Props updated
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(''); // Stores ID
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseMethod, setExpenseMethod] = useState('upi');
  const [description, setDescription] = useState(''); // Added description
  const [isLoading, setIsLoading] = useState(false); // Renamed from 'loading'
  const [error, setError] = useState(''); // Added error state
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    if (user?.id) { // Ensure user and user.id exist
        fetchUserCategories();
    }
  }, [user]);

  useEffect(() => {
    if (expense) { // If an expense is passed (for editing)
      setAmount(expense.amount?.toString() || '');
      setSelectedCategoryId(expense.category_id || '');
      setExpenseDate(expense.expense_date ? new Date(expense.expense_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      setExpenseMethod(expense.expense_method || 'upi');
      setDescription(expense.description || '');
      setError(''); // Clear previous errors
    } else { // For adding a new expense, reset form
      resetForm();
    }
  }, [expense]);

  const resetForm = () => {
    setSelectedCategoryId('');
    setAmount('');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setExpenseMethod('upi');
    setDescription('');
    setError('');
    // setShowNewCategory(false); // Optionally reset this too
    // setNewCategoryName('');
  };

  const fetchUserCategories = async () => {
    // Pass user.id if your getCategories function expects it for user-specific categories
    // If categories are global, getCategories might not need userId
    const { data, error: catError } = await getCategories(user.id); 
    if (!catError && data) {
      setCategories(data);
    } else if (catError) {
      console.error("Error fetching categories:", catError);
      setError("Could not load categories.");
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
        setError("Category name cannot be empty.");
        return;
    }
    setIsLoading(true);
    setError('');
    // Pass user.id if createCategory in database.js expects it
    const { data: newCategory, error: createCatError } = await createCategory(user.id, newCategoryName.trim()); 
    
    if (!createCatError && newCategory) {
      setCategories(prev => [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name))); // Add and sort
      setSelectedCategoryId(newCategory.id); // Select the new category
      setNewCategoryName('');
      setShowNewCategory(false);
    } else {
        setError(createCatError?.message || "Failed to create category.");
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors

    if (!selectedCategoryId) {
        setError("Please select a category.");
        return;
    }
    if (!amount || parseFloat(amount) <= 0) {
        setError("Please enter a valid positive amount.");
        return;
    }
    if(!expenseDate){
        setError("Please select a date.");
        return;
    }

    setIsLoading(true);

    const expenseDataPayload = {
      user_id: user.id,
      category_id: selectedCategoryId,
      amount: parseFloat(amount),
      expense_date: expenseDate,
      expense_method: expenseMethod,
      description: description.trim() || null, // Ensure description is null if empty
    };

    let result;
    if (expense && expense.id) { // If editing
      // Remove user_id for update payload as it shouldn't change owner
      const { user_id, ...updatePayload } = expenseDataPayload;
      result = await updateExpense(expense.id, updatePayload);
    } else { // If adding new
      result = await addExpense(expenseDataPayload);
    }

    setIsLoading(false);

    if (!result.error) {
      onSuccess(); // Call the success callback (renamed from onExpenseAdded)
      // No need to call resetForm() here as the component will typically unmount or props will change
    } else {
      setError(`Failed to ${expense ? 'update' : 'add'} expense: ${result.error.message}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="bg-secondary p-6 rounded-2xl shadow-xl w-full max-w-md relative max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">{expense ? 'Edit Expense' : 'Add New Expense'}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            aria-label="Close form"
          >
            <X size={24} />
          </button>
        </div>

        {error && <p className="bg-red-500/20 text-red-400 p-3 rounded-md mb-4 text-sm">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-300 mb-1">
              Category
            </label>
            {!showNewCategory ? (
              <div className="flex gap-2">
                <select
                  id="category"
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="flex-1 px-3 py-2.5 bg-primary border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent appearance-none"
                  required
                >
                  <option value="" disabled>Select Category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => { setShowNewCategory(true); setError(''); }}
                  className="px-3 py-2 bg-accent text-white rounded-md hover:bg-accent/90 flex items-center justify-center"
                  title="Add new category"
                >
                  <Plus size={20} />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="New category name"
                  className="w-full px-3 py-2.5 bg-primary border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                  autoFocus
                />
                <div className="flex gap-2">
                <button
                    type="button"
                    onClick={handleCreateCategory}
                    disabled={isLoading || !newCategoryName.trim()}
                    className="flex-1 px-3 py-2 bg-accent text-white rounded-md hover:bg-accent/90 disabled:opacity-50"
                  >
                    {isLoading && showNewCategory ? 'Adding...' : 'Add'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowNewCategory(false); setNewCategoryName(''); setError('');}}
                    className="flex-1 px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-300 mb-1">Amount (₹)</label>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.01"
              min="0.01" // Expenses usually can't be zero
              className="w-full px-3 py-2.5 bg-primary border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
              placeholder="e.g., 500"
              required
            />
          </div>

          <div>
            <label htmlFor="expenseDate" className="block text-sm font-medium text-gray-300 mb-1">Date</label>
            <input
              type="date"
              id="expenseDate"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]} // Prevent future dates
              className="w-full px-3 py-2.5 bg-primary border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
              required
            />
          </div>

          <div>
            <label htmlFor="expenseMethod" className="block text-sm font-medium text-gray-300 mb-1">Payment Method</label>
            <select
              id="expenseMethod"
              value={expenseMethod}
              onChange={(e) => setExpenseMethod(e.target.value)}
              className="w-full px-3 py-2.5 bg-primary border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent appearance-none"
              required
            >
              <option value="upi">UPI</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="other">Other</option> {/* Added 'Other' */}
            </select>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">Description (Optional)</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="3"
              placeholder="e.g., Lunch with colleagues, groceries"
              className="w-full px-3 py-2.5 bg-primary border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            ></textarea>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-accent text-white rounded-md hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              {isLoading ? (expense ? 'Updating...' : 'Adding...') : (expense ? 'Save Changes' : 'Add Expense')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}