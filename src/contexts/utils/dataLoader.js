import { fetchAllProjects, fetchAllTasks, fetchAllProjectAssignments } from '@/services/dataService';
import { fetchAllUsersAdminService } from '@/services/authService';

export const loadInitialData = async (user, setProjects, setTasks, setProjectAssignments, setAllUsers, setLoading, toast) => {
  setLoading(true);
  try {
    const dataPromises = [
      fetchAllProjects(),
      fetchAllTasks(),
      fetchAllProjectAssignments(),
    ];
    if (user.role === 'admin') {
      dataPromises.push(fetchAllUsersAdminService());
    }

    const [fetchedProjects, fetchedTasks, fetchedAssignments, fetchedUsers] = await Promise.all(dataPromises);

    setProjects(fetchedProjects || []);
    setTasks(fetchedTasks || []);
    setProjectAssignments(fetchedAssignments || []);
    if (user.role === 'admin') {
      setAllUsers(fetchedUsers || []);
    } else {
      setAllUsers([]);
    }
  } catch (error) {
    toast({ variant: "destructive", title: "Error loading data", description: error.message });
  } finally {
    setLoading(false);
  }
};
