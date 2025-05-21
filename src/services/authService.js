import { supabase } from '../lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

const handleSupabaseError = (error, context) => {
  console.error(`Supabase error in ${context}:`, error.message, error.details || error.stack || error);
  if (error.message === "TypeError: Failed to fetch") {
    throw new Error("Network error: Could not connect to Supabase. Please check your internet connection and CORS settings.");
  }
  throw error;
};

export const loginWithProfile = async (email, password) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // PostgREST error for "Not a single row"
        throw new Error('User not found.');
      }
      throw error; // Rethrow other Supabase errors
    }

    if (data && data.password === password) { // UNSAFE: Password check
      const userSession = {
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
        status: data.status,
      };
      localStorage.setItem('userSession', JSON.stringify(userSession));
      return userSession;
    } else {
      throw new Error('Invalid email or password.');
    }
  } catch (error) {
    handleSupabaseError(error, 'loginWithProfile');
  }
};

export const logoutProfile = () => {
  localStorage.removeItem('userSession');
};

export const getProfileSession = () => {
  const sessionData = localStorage.getItem('userSession');
  if (sessionData) {
    try {
      return JSON.parse(sessionData);
    } catch (e) {
      console.error("Error parsing user session from localStorage", e);
      localStorage.removeItem('userSession');
      return null;
    }
  }
  return null;
};

export const createProfileUser = async (userData) => {
  try {
    // Check if email already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', userData.email)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') throw checkError;
    if (existingUser) {
      throw new Error('A user with this email already exists.');
    }

    const profileData = {
      id: uuidv4(),
      name: userData.name,
      email: userData.email,
      role: userData.role,
      status: 'Active',
      password: userData.password, // For testing
    };
    const { data, error } = await supabase
      .from('profiles')
      .insert([profileData])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error, 'createProfileUser');
    throw error;
  }
};

export const checkUserExistsByEmail = async (email) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') { // Allow "Not a single row"
      throw error;
    }
    return data; // Returns profile if exists, null otherwise
  } catch (error) {
    handleSupabaseError(error, 'checkUserExistsByEmail');
  }
};

export const fetchUserProfileById = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, role, status')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error, 'fetchUserProfileById');
  }
};

export const fetchAllUsersAdminService = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, role, status');
    if (error) throw error;
    return data || [];
  } catch (error) {
    handleSupabaseError(error, 'fetchAllUsersAdminService');
  }
};

export const upsertProfileService = async (profileData) => {
  try {
    const { id, ...updateData } = profileData;
    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    handleSupabaseError(error, 'upsertProfileService');
  }
};

export const deleteUserById = async (userId) => {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to delete user: ${error.message}`);
  }
};

export const updateUserById = async (userId, updatedData) => {
  const { error } = await supabase
    .from('profiles')
    .update(updatedData)
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to update user: ${error.message}`);
  }
};
