import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ui/use-toast';
import Cookies from 'js-cookie';
import { handleError } from './utils/errorHandler';
import { loadInitialData } from './utils/dataLoader';
import { login, logout } from './utils/authActions';
import { addUser, refreshAllUsers } from './utils/userActions';

export const AuthProviderInternal = ({ children }) => {
  const [user, setUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [projectAssignments, setProjectAssignments] = useState([]);

  const navigate = useNavigate();
  const { toast } = useToast();

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
        if (isMounted) handleError(error, "Error initializing session from cookies", toast);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeSession();

    return () => { isMounted = false; };
  }, [toast, navigate]);

  useEffect(() => {
    if (user) {
      loadInitialData(user, setProjects, setTasks, setProjectAssignments, setAllUsers, setLoading, toast);
    } else {
      setProjects([]);
      setTasks([]);
      setProjectAssignments([]);
      setAllUsers([]);
    }
  }, [user, toast]);

  const value = {
    user,
    allUsers,
    loading,
    projects,
    tasks,
    projectAssignments,
    login: (email, password) => login(email, password, setUser, setLoading, toast, navigate),
    logout: () => logout(setUser, setAllUsers, setProjects, setTasks, setProjectAssignments, setLoading, toast, navigate),
    addUser: (newUserData) => addUser(newUserData, user, setLoading, toast, refreshAllUsers),
    fetchAllUsers: () => refreshAllUsers(user, setLoading, setAllUsers, toast),
    // Other context values...
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
