
    import { supabase } from '@/lib/supabaseClient';

    export const fetchAllProjectAssignments = async () => {
      const { data, error } = await supabase.from('project_assignments').select('*');
      if (error) {
        console.error('Error fetching project assignments:', error);
        throw error;
      }
      return data || [];
    };

    export const assignWorker = async (userId, projectId) => {
      const { data: existing, error: fetchError } = await supabase
        .from('project_assignments')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking existing assignment:', fetchError);
        throw fetchError;
      }

      if (existing) {
        const { data, error } = await supabase
          .from('project_assignments')
          .update({ project_id: projectId })
          .eq('user_id', userId)
          .select();
        if (error) {
          console.error('Error updating assignment:', error);
          throw error;
        }
        return data;
      } else {
        const { data, error } = await supabase
          .from('project_assignments')
          .insert([{ user_id: userId, project_id: projectId }])
          .select();
        if (error) {
          console.error('Error creating new assignment:', error);
          throw error;
        }
        return data;
      }
    };
  