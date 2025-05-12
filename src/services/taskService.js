
    import { supabase } from '@/lib/supabaseClient';

    export const fetchAllTasks = async () => {
      const { data, error } = await supabase.from('tasks').select('*');
      if (error) {
        console.error('Error fetching tasks:', error);
        throw error;
      }
      return data || [];
    };

    export const createTask = async (taskData) => {
      const { data, error } = await supabase.from('tasks').insert([taskData]).select();
      if (error) {
        console.error('Error creating task:', error);
        throw error;
      }
      return data;
    };
  