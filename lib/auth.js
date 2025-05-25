import { supabase } from './supabase'

export const signInWithEmail = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export const signUpWithEmail = async (email, password, username) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: username, 
      }
    }
  });
  // add to user table
  if(!error)
  {
        const { error } = await supabase
          .from('users')
          .insert([
            {
              user_id: data.user.id, // Supabase Auth user ID
              name: username,
              email: email,
              created_at: new Date().toISOString(), // Or use a Supabase default for this column
            },
          ]);

          if (error) {
          console.error('Error inserting user data into "users" table:', error.message);
          alert('Account created, but failed to save user info. Please contact support.');
          // You might want to handle rollback or allow the user to retry
        }
  }
  return { data, error };
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

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}