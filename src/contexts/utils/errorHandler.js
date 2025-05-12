export const handleError = (error, title, toast, customDescription) => {
  console.error(`${title}:`, error.message, error.details || error.stack || error);
  const description = customDescription || error.message || "An unexpected error occurred.";
  toast({ variant: "destructive", title: title, description: description });
  if (error.message === "TypeError: Failed to fetch" || (error.message && error.message.includes("Network error"))) {
    toast({ variant: "destructive", title: "Network Error", description: "Could not connect to the server. Please check your internet connection and Supabase CORS settings." });
  }
};
