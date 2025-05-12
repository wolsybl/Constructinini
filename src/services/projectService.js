
    import { supabase } from '@/lib/supabaseClient';

    export const fetchAllProjects = async () => {
      const { data, error } = await supabase.from('projects').select('*');
      if (error) {
        console.error('Error fetching projects:', error);
        throw error;
      }
      return data || [];
    };

    export const createProject = async (projectData) => {
      const { data, error } = await supabase.from('projects').insert([{ ...projectData, radius: projectData.radius || 100 }]).select();
      if (error) {
        console.error('Error creating project:', error);
        throw error;
      }
      return data;
    };
  