import { fetchAllUsersAdminService } from '@/services/authService'; // Assuming this fetches all users

export const fetchAllWorkers = async () => {
  try {
    const allUsers = await fetchAllUsersAdminService(); // Fetch all users
    return allUsers.filter(user => user.role === 'worker'); // Filter only workers
  } catch (error) {
    console.error("Error fetching workers:", error);
    throw new Error("Failed to fetch workers.");
  }
};
