import Cookies from 'js-cookie';
import { loginWithProfile, logoutProfile } from '@/services/authService';

export const login = async (email, password, setUser, setLoading, toast, navigate) => {
  setLoading(true);
  try {
    const loggedInUser = await loginWithProfile(email, password);
    setUser(loggedInUser);
    Cookies.set('sessionUser', JSON.stringify(loggedInUser), { expires: 7 });
    toast({ title: "Login Successful", description: `Welcome back, ${loggedInUser.name}!` });
    navigate(`/${loggedInUser.role}/dashboard`);
    return true;
  } catch (error) {
    toast({ variant: "destructive", title: "Login Failed", description: error.message });
    setUser(null);
    return false;
  } finally {
    setLoading(false);
  }
};

export const logout = async (setUser, setAllUsers, setProjects, setTasks, setProjectAssignments, setLoading, toast, navigate) => {
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
    toast({ variant: "destructive", title: "Logout Failed", description: error.message });
  } finally {
    setLoading(false);
  }
};
