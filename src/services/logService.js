import { useAuth } from '@/contexts/AuthContext';

export const fetchActivityLogs = async (getActivityLogs) => {
  try {
    const logs = await getActivityLogs(); // Use the passed function to fetch logs
    if (!Array.isArray(logs)) {
      throw new Error("Invalid response format: Expected an array of logs.");
    }
    return logs;
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    return []; // Return an empty array as a fallback
  }
};
