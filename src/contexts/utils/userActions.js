import { createProfileUser, fetchAllUsersAdminService } from '@/services/authService';

export const addUser = async (newUserData, user, setLoading, toast, refreshAllUsers) => {
  if (!user || user.role !== 'admin') {
    toast({ variant: "destructive", title: "Unauthorized", description: "Only admins can create users." });
    return false;
  }
  setLoading(true);
  try {
    await createProfileUser(newUserData);
    toast({ title: "User Created", description: `User ${newUserData.name} has been successfully created.` });
    await refreshAllUsers(user, setLoading, toast);
    return true;
  } catch (error) {
    toast({ variant: "destructive", title: "User Creation Failed", description: error.message });
    return false;
  } finally {
    setLoading(false);
  }
};

export const refreshAllUsers = async (user, setLoading, setAllUsers, toast) => {
  if (user && user.role === 'admin') {
    setLoading(true);
    try {
      const fetchedUsers = await fetchAllUsersAdminService();
      setAllUsers(fetchedUsers || []);
    } catch (error) {
      toast({ variant: "destructive", title: "Error refreshing user list", description: error.message });
    } finally {
      setLoading(false);
    }
  }
};
