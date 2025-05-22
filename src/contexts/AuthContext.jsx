import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ui/use-toast';
import Cookies from 'js-cookie';
import { 
  loginWithProfile, 
  logoutProfile, 
  getProfileSession,
  createProfileUser,
  checkUserExistsByEmail,
  fetchAllUsersAdminService
} from '../services/authService';
import { 
  fetchAllProjects, 
  createProject as createProjectService, 
  fetchAllTasks, 
  createTask as createTaskService, 
  fetchAllProjectAssignments, 
  assignWorker as assignWorkerService,
  updateProjectService,
  deleteProjectService
} from '../services/dataService';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

const AuthProviderInternal = ({ children }) => {
  const [user, setUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [projectAssignments, setProjectAssignments] = useState([]);

  const navigate = useNavigate();
  const { toast } = useToast();

  const handleError = useCallback((error, title, customDescription) => {
    console.error(`${title}:`, error.message, error.details || error.stack || error);
    const description = customDescription || error.message || "An unexpected error occurred.";
    toast({ variant: "destructive", title: title, description: description });
    if (error.message === "TypeError: Failed to fetch" || (error.message && error.message.includes("Network error"))) {
      toast({ variant: "destructive", title: "Network Error", description: "Could not connect to the server. Please check your internet connection and Supabase CORS settings." });
    }
  }, [toast]);

  const loadInitialData = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setTasks([]);
      setProjectAssignments([]);
      setAllUsers([]);
      setLoading(false);
      return;
    }

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

      setProjects(fetchedProjects?.filter(p => p !== null) || []);
      setTasks(fetchedTasks?.filter(t => t !== null) || []);
      setProjectAssignments(fetchedAssignments?.filter(a => a !== null) || []);
      
      if (user.role === 'admin' && fetchedUsers) {
        setAllUsers(fetchedUsers.filter(u => u !== null) || []);
      }

      // Si tus proyectos ya traen progress, no necesitas esto.
      // Si no, puedes calcularlo así (ejemplo):
      const projectsWithProgress = (fetchedProjects || []).map(project => {
        // Si ya existe project.progress, úsalo. Si no, calcula un dummy.
        if (typeof project.progress === 'numeric') return project;
        // Ejemplo: calcula progreso por tareas completadas
        const projectTasks = (fetchedTasks || []).filter(t => t.projectId === project.id);
        const completed = projectTasks.filter(t => t.status === 'Completed').length;
        const total = projectTasks.length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { ...project, progress };
      });

      setProjects(projectsWithProgress.filter(p => p !== null));
    } catch (error) {
      handleError(error, "Error loading initial data");
    } finally {
      setLoading(false);
    }
  }, [user, handleError]);

  useEffect(() => {
    let isMounted = true;
    const initializeSession = async () => {
      if (!isMounted) return;
      setLoading(true);
      try {
        const sessionUser = Cookies.get('sessionUser');
        if (sessionUser) {
          setUser(JSON.parse(sessionUser));
        } else {
          setUser(null);
          if (window.location.pathname !== '/login') {
            navigate('/login');
          }
        }
      } catch (error) {
        if (isMounted) handleError(error, "Error initializing session from cookies");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeSession();

    return () => { isMounted = false; };
  }, [handleError, navigate]);

  useEffect(() => {
    if (user) {
      loadInitialData();
    } else {
      setProjects([]);
      setTasks([]);
      setProjectAssignments([]);
      setAllUsers([]);
    }
  }, [user, loadInitialData]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const loggedInUser = await loginWithProfile(email, password);
      setUser(loggedInUser);
      Cookies.set('sessionUser', JSON.stringify(loggedInUser), { expires: 7 });
      toast({ title: "Login Successful", description: `Welcome back, ${loggedInUser.name}!` });
      navigate(`/${loggedInUser.role}/dashboard`);
      return true;
    } catch (error) {
      handleError(error, "Login Failed");
      setUser(null);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await logoutProfile();
      setUser(null);
      setAllUsers([]);
      setProjects([]);
      setTasks([]);
      setProjectAssignments([]);
      Cookies.remove('sessionUser');
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      navigate('/login');
    } catch (error) {
      handleError(error, "Logout Failed");
    } finally {
      setLoading(false);
    }
  };

  const addUser = async (newUserData) => {
    if (!user || user.role !== 'admin') {
      toast({ variant: "destructive", title: "Unauthorized", description: "Only admins can create users." });
      return false;
    }
    setLoading(true);
    try {
      await createProfileUser(newUserData);
      toast({ title: "User Created", description: `User ${newUserData.name} has been successfully created.` });
      await refreshAllUsers(); // Ensure the user list is refreshed
      return true;
    } catch (error) {
      if (error.message.includes("User with this email already exists")) {
        toast({ variant: "destructive", title: "User Creation Failed", description: "This email is already registered." });
      } else {
        handleError(error, "User Creation Failed");
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const addProject = async (projectData) => {
    setLoading(true);
    try {
      const newProjects = await createProjectService(projectData);
      toast({title: "Project Created", description: `${projectData.name} has been successfully created.`});
      if (newProjects) {
        setProjects(prev => [...prev, newProjects]);
      } else {
        console.warn("Project created but returned no data.", projectData);
        loadInitialData();
      }
    } catch (error) {
      handleError(error, "Project Creation Failed");
    } finally {
      setLoading(false);
    }
  };
  
  const addTask = async (taskData) => {
    if (!user) {
      handleError(new Error("User not authenticated"), "Task Creation Failed", "You must be logged in to create tasks.");
      return null;
    }
    setLoading(true);
    try {
      // Map frontend property names to database column names
      const transformedTaskData = {
        project_id: taskData.projectId,
        title: taskData.title,
        description: taskData.description,
        status: taskData.status || 'Pending',
        assigned_to_user_id: taskData.assignedToUserId, // Corrected column name
        due_date: taskData.dueDate,
        created_by_user_id: user.id,
      };
      const newTask = await createTaskService(transformedTaskData);
      toast({title: "Task Created", description: `Task "${taskData.title}" has been successfully created.`});
      // Update global tasks state by adding the new task (more performant than refetching all)
      setTasks(prev => [...prev, newTask]);

      return newTask;
    } catch (error) {
      handleError(error, "Task Creation Failed");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const assignWorkerToProject = async (userId, projectId) => {
    setLoading(true);
    try {
      await assignWorkerService(userId, projectId);
      toast({title: "Worker Assignment Updated", description: `Worker assignment has been updated for project.`});
      setProjectAssignments(await fetchAllProjectAssignments());

      // Update the user state if the assigned user is the currently logged-in user
      if (user && user.id === userId) {
        setUser(prevUser => ({
          ...prevUser,
          assignedProjectId: projectId
        }));
        console.log(`User ${userId} assigned to project ${projectId}. User state updated.`);
      }

    } catch (error) {
      handleError(error, "Worker Assignment Failed");
    } finally {
      setLoading(false);
    }
  };
  
  const updateProject = async (updatedProject) => {
    setLoading(true);
    try {
      // Ensure we have the manager information
      const manager = allUsers.find(u => u.id === updatedProject.manager_id);
      if (!manager) {
        throw new Error('Selected manager not found');
      }

      // Prepare the project data with manager information
      const projectData = {
        ...updatedProject,
        manager: manager.name
      };

      const updated = await updateProjectService(projectData);
      
      // Update the projects state with the new data
      setProjects(prev =>
        prev.map(p => p.id === updatedProject.id ? {
          ...p,
          ...updated,
          manager_id: updatedProject.manager_id,
          manager: manager.name
        } : p)
      );

      toast({ title: "Project Updated", description: `${updatedProject.name} has been updated.` });
      return updated;
    } catch (error) {
      handleError(error, "Project Update Failed");
      throw error; // Re-throw to handle in the component
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (projectId) => {
    setLoading(true);
    try {
      await deleteProjectService(projectId); // Llama al backend primero
      setProjects(prev => prev.filter(p => p.id !== projectId));
      toast({ title: "Project Deleted", description: "The project has been deleted." });
    } catch (error) {
      handleError(error, "Project Deletion Failed");
    } finally {
      setLoading(false);
    }
  };

  const getProjectById = (projectId) => projects.find(p => p.id === projectId);

  const refreshAllUsers = useCallback(async () => {
    if (user && user.role === 'admin') {
      setLoading(true);
      try {
        const fetchedUsers = await fetchAllUsersAdminService();
        setAllUsers(fetchedUsers || []);
      } catch (error) {
        handleError(error, "Error refreshing user list");
      } finally {
        setLoading(false);
      }
    }
  }, [user, handleError]);

  const fetchProjectManagers = useCallback(async () => {
    if (!user || user.role !== 'admin') {
      toast({ variant: "destructive", title: "Unauthorized", description: "Only admins can fetch project managers." });
      return [];
    }
    try {
      const allUsers = await fetchAllUsersAdminService(); // Fetch all users
      return allUsers.filter(user => user.role === 'project_manager'); // Filter by role
    } catch (error) {
      handleError(error, "Error fetching project managers");
      return []; // Return an empty array on error to avoid blocking
    }
  }, [user, handleError, toast]);

  const fetchAttendanceStatus = useCallback(async (userId) => {
    if (!userId) return null;
    try {
      // Consulta directa a Supabase para obtener el último registro de asistencia
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', userId)
        .order('check_in_time', { ascending: false })
        .limit(1);

      if (error && error.code !== 'PGRST116') throw error;
      if (!data || data.length === 0) return "No attendance record";

      const last = data[0];
      if (last.check_in_time && !last.check_out_time) return "Checked In";
      if (last.check_in_time && last.check_out_time) return "Checked Out";
      return "No attendance record";
    } catch (error) {
      handleError(error, "Error fetching attendance status");
      return null;
    }
  }, [handleError]);

  const getActivityLogs = useCallback(async () => {
    try {
      const response = await fetch('/api/activity-logs'); // Replace with your actual API endpoint
      if (!response.ok) {
        const errorText = await response.text(); // Log the actual response for debugging
        console.error(`Failed to fetch activity logs: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Failed to fetch activity logs: ${response.status}`);
      }
      const data = await response.json();
      console.log("API Response:", data); // Debugging log
      return data;
    } catch (error) {
      console.error("Error in getActivityLogs:", error);
      return []; // Return an empty array as a fallback
    }
  }, []);

  const fetchDashboardStats = useCallback(async () => {
    try {
      const response = await fetch('/api/dashboard-stats'); // Replace with actual API endpoint
      if (!response.ok) throw new Error('Failed to fetch dashboard stats');
      const data = await response.json();
      return [
        {
          title: "Total Users",
          value: data.totalUsers || 0,
          icon: <Users className="h-6 w-6 text-primary" />,
          color: "text-primary",
          link: "/admin/users",
        },
        {
          title: "Active Projects",
          value: data.activeProjects || 0,
          icon: <Briefcase className="h-6 w-6 text-tertiary" />,
          color: "text-tertiary",
          link: "/admin/projects",
        },
        {
          title: "Tasks Completed",
          value: data.tasksCompleted || 0,
          icon: <BarChart3 className="h-6 w-6 text-accent" />,
          color: "text-accent",
          link: "#",
        },
      ];
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      return [];
    }
  }, []);

  const refreshDashboardData = useCallback(async () => {
    if (!user || user.role !== 'admin') return;
    
    setLoading(true);
    try {
      const [
        updatedUsers,
        updatedProjects,
        updatedTasks
      ] = await Promise.all([
        fetchAllUsersAdminService(),
        fetchAllProjects(),
        fetchAllTasks()
      ]);

      setAllUsers(updatedUsers || []);
      setProjects(updatedProjects || []);
      setTasks(updatedTasks || []);
    } catch (error) {
      handleError(error, "Error refreshing dashboard data");
    } finally {
      setLoading(false);
    }
  }, [user, handleError]);

  const value = {
    user,
    allUsers,
    loading,
    projects,
    tasks,
    projectAssignments,
    login,
    logout,
    addUser,
    addProject,
    addTask,
    assignWorkerToProject,
    getProjectById,
    updateProject,
    deleteProject,
    fetchProjects: useCallback(async () => {
      setLoading(true);
      try { setProjects(await fetchAllProjects()); }
      catch (e) { handleError(e, "Error fetching projects"); }
      finally { setLoading(false); }
    }, [handleError]),
    fetchTasks: useCallback(async () => {
      setLoading(true);
      try {
        const fetchedTasks = await fetchAllTasks();
        console.log("AuthContext: fetchTasks executed. Fetched tasks count:", fetchedTasks.length);
        setTasks(fetchedTasks);
      } 
      catch (e) { handleError(e, "Error fetching tasks"); }
      finally { setLoading(false); }
    }, [handleError]),
    fetchProjectAssignments: useCallback(async () => {
      setLoading(true);
      try { setProjectAssignments(await fetchAllProjectAssignments()); }
      catch (e) { handleError(e, "Error fetching assignments"); }
      finally { setLoading(false); }
    }, [handleError]),
    fetchAllUsers: refreshAllUsers,
    fetchProjectManagers,
    fetchAttendanceStatus,
    getActivityLogs,
    fetchDashboardStats,
    refreshDashboardData,
    users: allUsers,
    getActiveProjects: useCallback(() => 
      projects.filter(project => project.status === 'Active'),
    [projects]),
    getCompletedTasks: useCallback(() => 
      tasks.filter(task => task.status === 'Completed'),
    [tasks]),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const AuthProvider = ({ children }) => {
  return <AuthProviderInternal>{children}</AuthProviderInternal>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
