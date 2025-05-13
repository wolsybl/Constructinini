import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import Cookies from 'js-cookie';
import { 
  loginWithProfile, 
  logoutProfile, 
  getProfileSession,
  createProfileUser,
  checkUserExistsByEmail,
  fetchAllUsersAdminService
} from '@/services/authService';
import { 
  fetchAllProjects, 
  createProject as createProjectService, 
  fetchAllTasks, 
  createTask as createTaskService, 
  fetchAllProjectAssignments, 
  assignWorker as assignWorkerService 
} from '@/services/dataService';

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

      setProjects(fetchedProjects || []);
      setTasks(fetchedTasks || []);
      setProjectAssignments(fetchedAssignments || []);
      if (user.role === 'admin') {
        setAllUsers(fetchedUsers || []);
      } else {
        setAllUsers([]);
      }
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
      setProjects(prev => [...prev, ...(newProjects || [])]);
    } catch (error) {
      handleError(error, "Project Creation Failed");
    } finally {
      setLoading(false);
    }
  };
  
  const addTask = async (taskData) => {
    if (!user) {
      handleError(new Error("User not authenticated"), "Task Creation Failed", "You must be logged in to create tasks.");
      return;
    }
    setLoading(true);
    try {
      const newTasks = await createTaskService({...taskData, created_by_user_id: user.id });
      toast({title: "Task Created", description: `Task "${taskData.title}" has been successfully created.`});
      setTasks(prev => [...prev, ...(newTasks || [])]);
    } catch (error) {
      handleError(error, "Task Creation Failed");
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
    } catch (error) {
      handleError(error, "Worker Assignment Failed");
    } finally {
      setLoading(false);
    }
  };
  
  const updateProject = async (updatedProject) => {
    setLoading(true);
    try {
      // Si tienes un servicio para actualizar en el backend, llama aquí:
      // await updateProjectService(updatedProject);

      setProjects(prev =>
        prev.map(p => p.id === updatedProject.id ? { ...p, ...updatedProject } : p)
      );
      toast({ title: "Project Updated", description: `${updatedProject.name} has been updated.` });
    } catch (error) {
      handleError(error, "Project Update Failed");
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
      // Replace with actual API call to fetch attendance status
      const response = await fetch(`/api/attendance/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch attendance status');
      const data = await response.json();
      return data.status; // Assuming the API returns { status: "Checked In" }
    } catch (error) {
      handleError(error, "Error fetching attendance status");
      return null; // Return null on error
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

  const value = {
    user, allUsers, loading, projects, tasks, projectAssignments,
    login, logout, addUser, addProject, addTask, assignWorkerToProject,
    getProjectById,
    updateProject,
    fetchProjects: useCallback(async () => {
      setLoading(true);
      try { setProjects(await fetchAllProjects()); }
      catch (e) { handleError(e, "Error fetching projects"); }
      finally { setLoading(false); }
    }, [handleError]),
    fetchTasks: useCallback(async () => {
      setLoading(true);
      try { setTasks(await fetchAllTasks()); }
      catch (e) { handleError(e, "Error fetching tasks"); }
      finally { setLoading(false); }
    }, [handleError]),
    fetchProjectAssignments: useCallback(async () => {
      setLoading(true);
      try { setProjectAssignments(await fetchAllProjectAssignments()); }
      catch (e) { handleError(e, "Error fetching assignments"); }
      finally { setLoading(false); }
    }, [handleError]),
    fetchAllUsers: refreshAllUsers, // Expose refreshAllUsers
    fetchProjectManagers,
    fetchAttendanceStatus,
    getActivityLogs,
    fetchDashboardStats,
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
