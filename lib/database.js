import { supabase } from './supabase'

/**
 * Fetches expenses for a given user.
 * It also fetches the related category name and ID.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<{ data: any[] | null, error: any | null }>}
 */
export const getExpenses = async (userId) => {
  if (!userId) {
    console.error('Error fetching expenses: User ID is required.');
    return { data: [], error: { message: "User ID is required." } };
  }

  const { data, error } = await supabase
    .from('expenses')
    .select(`
      id,
      amount,
      expense_date,
      expense_method,
      description,
      created_at,
      user_id,
      category_id,
      categories (id, name) 
    `)
    .eq('user_id', userId)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false }); // Secondary sort for same-day expenses

  if (error) {
    console.error('Error fetching expenses:', error.message);
    return { data: null, error };
  }
  return { data, error };
};

/**
 * Adds a new expense to the database.
 * @param {object} expenseData - The expense data to add.
 * Expected fields: user_id, category_id, amount, expense_date, expense_method, description.
 * @returns {Promise<{ data: any | null, error: any | null }>}
 */
export const addExpense = async (expenseData) => {
  if (!expenseData || !expenseData.user_id || !expenseData.category_id || !expenseData.amount || !expenseData.expense_date) {
    console.error('Error adding expense: Missing required fields.');
    return { data: null, error: { message: "Missing required fields for expense." } };
  }

  const { data, error } = await supabase
    .from('expenses')
    .insert([expenseData])
    .select(`
        id,
        amount,
        expense_date,
        expense_method,
        description,
        created_at,
        user_id,
        category_id,
        categories (id, name)
    `)
    .single(); // Expecting a single record back

  if (error) {
    console.error('Error adding expense:', error.message);
  }
  return { data, error };
};

/**
 * Updates an existing expense in the database.
 * @param {string} expenseId - The ID of the expense to update.
 * @param {object} updatedData - The data to update.
 * Expected fields: category_id, amount, expense_date, expense_method, description (user_id should NOT be in updatedData).
 * @returns {Promise<{ data: any | null, error: any | null }>}
 */
export const updateExpense = async (expenseId, updatedData) => {
  if (!expenseId || !updatedData) {
    console.error('Error updating expense: Expense ID and update data are required.');
    return { data: null, error: { message: "Expense ID and update data are required." } };
  }

  const { data, error } = await supabase
    .from('expenses')
    .update(updatedData)
    .eq('id', expenseId)
    .select(`
        id,
        amount,
        expense_date,
        expense_method,
        description,
        created_at,
        user_id,
        category_id,
        categories (id, name)
    `)
    .single(); // Expecting a single record back

  if (error) {
    console.error('Error updating expense:', error.message);
  }
  return { data, error };
};

/**
 * Deletes an expense from the database.
 * @param {string} expenseId - The ID of the expense to delete.
 * @returns {Promise<{ data: any | null, error: any | null }>}
 */
export const deleteExpense = async (expenseId) => {
  if (!expenseId) {
    console.error('Error deleting expense: Expense ID is required.');
    return { data: null, error: { message: "Expense ID is required." } };
  }

  const { data, error } = await supabase // `data` will be the deleted record(s) if `select()` was used, or empty array/null.
    .from('expenses')
    .delete()
    .eq('id', expenseId);
    // If you want the deleted record back, you can add .select().single(); but it's often not needed for deletes.

  if (error) {
    console.error('Error deleting expense:', error.message);
  }
  // For delete, Supabase v2 often returns data as an array of deleted items (if select() is used), or null/empty if not.
  // The component usually just cares if an error occurred.
  return { data: error ? null : {}, error }; // Return an empty object for data on success if not selecting.
};

/**
 * Fetches categories from the database.
 * This version assumes categories might be user-specific OR global.
 * Adjust the query if your schema is different (e.g., categories are always global or always user-specific).
 * @param {string} [userId] - Optional. The ID of the user to fetch specific categories for.
 * If categories also have a user_id column and can be global (user_id is NULL).
 * @returns {Promise<{ data: any[] | null, error: any | null }>}
 */
export const getCategories = async (userId) => {
  let query = supabase.from('categories').select('id, name');

  // --- ADJUST THIS LOGIC BASED ON YOUR 'categories' TABLE SCHEMA ---
  // Scenario 1: Categories are strictly user-specific (categories table has a non-nullable user_id)
  // if (userId) {
  //   query = query.eq('user_id', userId);
  // } else {
  //   // Handle case where userId is needed but not provided, or return all if appropriate
  //   console.warn('getCategories called without userId for user-specific categories. Returning all or none.');
  //   // return { data: [], error: { message: "User ID required for user-specific categories."}};
  // }

  // Scenario 2: Categories can be user-specific OR global (categories.user_id is nullable for global ones)
  if (userId) {
    query = query.or(`user_id.eq.${userId},user_id.is.null`); // User's own categories OR global ones
  } else {
    // If no userId, maybe fetch only global categories or all categories.
    // query = query.is('user_id', null); // Only global if no userId
    // Or, just fetch all if that's intended for non-user contexts (e.g. admin panel)
  }
  // Scenario 3: All categories are global (no user_id column in 'categories' table or it's ignored)
  // In this case, the initial query `supabase.from('categories').select('id, name')` is sufficient,
  // and the `userId` parameter might be unused or removed from this function.
  // --- END OF ADJUSTMENT SECTION ---

  query = query.order('name', { ascending: true });
  const { data, error } = await query;

  if (error) {
    console.error('Error fetching categories:', error.message);
  }
  return { data, error };
};

/**
 * Creates a new category in the database.
 * @param {string} userId - The ID of the user creating the category (if categories are user-specific).
 * Pass null or omit if categories are global and don't store user_id.
 * @param {string} categoryName - The name of the new category.
 * @returns {Promise<{ data: any | null, error: any | null }>}
 */
export const createCategory = async (userId, categoryName) => {
  if (!categoryName || categoryName.trim() === "") {
    console.error('Error creating category: Category name is required.');
    return { data: null, error: { message: "Category name is required." } };
  }

  const newCategoryPayload = { name: categoryName.trim() };

  // --- ADJUST THIS LOGIC BASED ON YOUR 'categories' TABLE SCHEMA ---
  // If your 'categories' table has a 'user_id' column for user-specific categories:
  if (userId) {
    newCategoryPayload.user_id = userId;
  }
  // If categories are always global, you would not include user_id in the payload.
  // --- END OF ADJUSTMENT SECTION ---

  const { data, error } = await supabase
    .from('categories')
    .insert([newCategoryPayload])
    .select() // Selects all columns of the new category
    .single(); // Expecting a single record back

  if (error) {
    console.error('Error creating category:', error.message);
  }
  return { data, error }; // `data` is the created category object
};

export const resetPassword = async (email) => {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { data, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

export const updatePassword = async (newPassword) => {
  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    })
    return { data, error }
  } catch (err) {
    return { data: null, error: err }
  }
}

export const getAllUserEmails = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('email')
      .not('email', 'is', null)

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange(callback)
}