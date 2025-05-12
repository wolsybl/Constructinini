
    import React from 'react';
    import { Navigate, Outlet } from 'react-router-dom';
    import { useAuth } from '@/contexts/AuthContext';
    import { Loader2 } from 'lucide-react';

    const ProtectedRoute = ({ allowedRoles }) => {
      const { user, loading } = useAuth();

      if (loading) {
        return (
          <div className="min-h-screen flex items-center justify-center gradient-bg">
            <Loader2 className="h-16 w-16 animate-spin text-primary-foreground" />
          </div>
        );
      }

      if (!user) {
        return <Navigate to="/login" replace />;
      }

      if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Redirect to a generic dashboard or an unauthorized page if preferred
        // For now, redirecting to their own dashboard to prevent access errors
        // A proper unauthorized page might be better in a full app
        return <Navigate to={`/${user.role}/dashboard`} replace />; 
      }

      return <Outlet />;
    };

    export default ProtectedRoute;
  