import { supabase } from './supabase'

export const getCategories = async (userId) => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('name')
  
  return { data, error }
}

export const createCategory = async (userId, name) => {
  const { data, error } = await supabase
    .from('categories')
    .insert([{ user_id: userId, name }])
    .select()
  
  return { data, error }
}

export const getExpenses = async (userId, startDate = null, endDate = null) => {
  let query = supabase
    .from('expenses')
    .select(`
      *,
      categories (
        id,
        name
      )
    `)
    .eq('user_id', userId)
    .order('expense_date', { ascending: false })
  
  if (startDate) {
    query = query.gte('expense_date', startDate)
  }
  
  if (endDate) {
    query = query.lte('expense_date', endDate)
  }
  
  const { data, error } = await query
  return { data, error }
}

export const createExpense = async (userId, categoryId, amount, expenseDate, expenseMethod) => {
  const { data, error } = await supabase
    .from('expenses')
    .insert([{
      user_id: userId,
      category_id: categoryId,
      amount: parseFloat(amount),
      expense_date: expenseDate,
      expense_method: expenseMethod
    }])
    .select()
  
  return { data, error }
}

export const deleteExpense = async (expenseId) => {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId)
  
  return { error }
}