
    import { supabase } from '@/lib/supabaseClient';
    import { v4 as uuidv4 } from 'uuid';

    const handleSupabaseError = (error, context) => {
      console.error(`Supabase error in ${context}:`, error.message, error.details || error.stack || error);
      if (error.message === "TypeError: Failed to fetch") {
        throw new Error("Network error: Could not connect to Supabase. Please check your internet connection and CORS settings.");
      }
      throw error;
    };

    export const fetchUserProfile = async (userId) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, email, role, status')
          .eq('id', userId)
          .single();
        if (error && error.code !== 'PGRST116') { // Allow "Not a single row" if profile not found yet
          throw error;
        }
        return data; // Returns profile or null
      } catch (error) {
        handleSupabaseError(error, 'fetchUserProfile (userService)');
      }
    };

    export const fetchAllUsersAdmin = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, email, role, status');
        if (error) throw error;
        return data || [];
      } catch (error) {
        handleSupabaseError(error, 'fetchAllUsersAdmin (userService)');
      }
    };
    
    export const createProfile = async (profileDataWithPassword) => {
      try {
        const { password, ...profileData } = profileDataWithPassword;
        const userId = profileData.id || uuidv4();

        const finalProfileData = {
          ...profileData,
          id: userId,
          password: password, // UNSAFE: Storing plain text password
          status: profileData.status || 'Active',
        };

        const { data, error } = await supabase.from('profiles').insert([finalProfileData]).select().single();
        if (error) throw error;
        return data;
      } catch (error) {
        handleSupabaseError(error, 'createProfile (userService)');
      }
    };
    
    export const upsertProfile = async (profileData) => {
      try {
        const { id, ...updateData } = profileData;
        if (updateData.password && updateData.password.trim() === '') {
          delete updateData.password; // Don't update password if empty string
        }

        const { data, error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
          
        if (error) throw error;
        return data;
      } catch (error) {
        handleSupabaseError(error, 'upsertProfile (userService)');
      }
    };

    // This checkUserExistsByEmail is also in authService.js. Consolidate if appropriate.
    // For now, keeping it here as it might be used by other userService functions.
    export const checkUserExistsByEmail = async (email) => {
      try {
          const { data, error } = await supabase
              .from('profiles')
              .select('id')
              .eq('email', email)
              .maybeSingle();

          if (error && error.code !== 'PGRST116') { 
              throw error; 
          }
          return data; 
      } catch (error) {
        handleSupabaseError(error, 'checkUserExistsByEmail (userService)');
      }
    };

    // This function uses Supabase Auth, which you've opted out of for login.
    // It's kept for now but might need removal or adjustment based on overall auth strategy.
    export const signUpUser = async (email, password, options) => {
      console.warn("signUpUser from userService is being called. This uses Supabase Auth, which is currently bypassed for login. Ensure this is intended.");
      try {
        const { data, error } = await supabase.auth.signUp({ email, password, options });
        if (error) throw error;
        return data;
      } catch (error) {
        handleSupabaseError(error, 'signUpUser (userService - Supabase Auth)');
      }
    };
  