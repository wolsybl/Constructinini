import { supabase } from '@/lib/supabaseClient';

    const handleSupabaseError = (error, context) => {
      console.error(`Supabase error in ${context}:`, error.message, error.details || error.stack || error);
      if (error.message === "TypeError: Failed to fetch") {
        throw new Error("Network error: Could not connect to Supabase. Please check your internet connection and CORS settings.");
      }
      throw error;
    };

    export const fetchAllProjects = async () => {
      try {
        const { data, error } = await supabase.from('projects').select('*');
        if (error) throw error;
        return data || [];
      } catch (error) {
        handleSupabaseError(error, 'fetchAllProjects');
      }
    };

    export const createProject = async (projectData) => {
      try {
        const { data, error } = await supabase.from('projects').insert([{ 
          ...projectData, 
          radius: projectData.radius || 100,
          manager_id: projectData.manager_id
        }]).select();
        if (error) throw error;
        return data;
      } catch (error) {
        handleSupabaseError(error, 'createProject');
      }
    };

    export const fetchAllTasks = async () => {
      try {
        const { data, error } = await supabase.from('tasks').select('*');
        if (error) throw error;
        return data || [];
      } catch (error) {
        handleSupabaseError(error, 'fetchAllTasks');
      }
    };

    export const createTask = async (taskData) => {
      try {
        // Transform the data to match database column names
        const transformedData = {
          title: taskData.title,
          description: taskData.description,
          status: taskData.status || 'Pending',
          project_id: taskData.projectId,
          assigned_to_user_id: taskData.assignedToUserId,
          created_by_user_id: taskData.created_by_user_id,
          completion_photo_url: taskData.completion_photo_url,
          due_date: taskData.dueDate
        };

        const { data, error } = await supabase.from('tasks').insert([transformedData]).select();
        if (error) throw error;
        return data;
      } catch (error) {
        handleSupabaseError(error, 'createTask');
      }
    };
    
    export const fetchAllProjectAssignments = async () => {
      try {
        const { data, error } = await supabase.from('project_assignments').select('*');
        if (error) throw error;
        return data || [];
      } catch (error) {
        handleSupabaseError(error, 'fetchAllProjectAssignments');
      }
    };

    export const assignWorker = async (userId, projectId) => {
      try {
        const { data: existing, error: fetchError } = await supabase
          .from('project_assignments')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }

        if (existing) {
          const { data, error } = await supabase
            .from('project_assignments')
            .update({ project_id: projectId })
            .eq('user_id', userId)
            .select();
          if (error) throw error;
          return data;
        } else {
          const { data, error } = await supabase
            .from('project_assignments')
            .insert([{ user_id: userId, project_id: projectId }])
            .select();
          if (error) throw error;
          return data;
        }
      } catch (error) {
        handleSupabaseError(error, 'assignWorker');
      }
    };

    export const deleteProjectService = async (projectId) => {
      try {
        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', projectId);
        if (error) throw error;
        return true;
      } catch (error) {
        handleSupabaseError(error, 'deleteProjectService');
      }
    };

    export const updateProjectService = async (updatedProject) => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .update({
            name: updatedProject.name,
            description: updatedProject.description,
            locationName: updatedProject.locationName,
            latitude: updatedProject.latitude,
            longitude: updatedProject.longitude,
            manager_id: updatedProject.manager_id,
            status: updatedProject.status || 'Planning',
            radius: updatedProject.radius || 100
          })
          .eq('id', updatedProject.id)
          .select();
        if (error) throw error;
        return data && data[0];
      } catch (error) {
        handleSupabaseError(error, 'updateProjectService');
      }
    };
