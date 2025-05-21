import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, UserCircle, Building, Package, Users, Settings, Briefcase, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function MainLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const isActive = (path) => {
    return location.pathname === path;
  };

  const getAdminLinks = () => {
    return [
      { path: '/admin/dashboard', label: 'Dashboard', icon: <Briefcase size={20} /> },
      { path: '/admin/users', label: 'Users', icon: <Users size={20} /> },
      { path: '/admin/projects', label: 'Projects', icon: <Building size={20} /> },
      { path: '/admin/resource-requests', label: 'Resource Requests', icon: <Package size={20} /> },
      { path: '/admin/settings', label: 'Settings', icon: <Settings size={20} /> },
    ];
  };

  const getManagerLinks = () => {
    return [
      { path: '/project_manager/dashboard', label: 'Dashboard', icon: <Briefcase size={20} /> },
      { path: '/project_manager/projects', label: 'Projects', icon: <Building size={20} /> },
      { path: '/project_manager/workers', label: 'Workers', icon: <Users size={20} /> },
    ];
  };

  const getWorkerLinks = () => {
    return [
      { path: '/worker/dashboard', label: 'Dashboard', icon: <Briefcase size={20} /> },
      { path: '/worker/site', label: 'Site View', icon: <Building size={20} /> },
      { path: '/worker/attendance', label: 'Attendance', icon: <UserCircle size={20} /> },
    ];
  };

  const getLinks = () => {
    switch (user?.role) {
      case 'admin':
        return getAdminLinks();
      case 'project_manager':
        return getManagerLinks();
      case 'worker':
        return getWorkerLinks();
      default:
        return [];
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <motion.header 
        className="sticky top-0 z-50 shadow-lg bg-white/70 backdrop-blur-xl border-b border-white/20"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 100 }}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center space-x-2">
              <Building size={28} className="text-primary" />
              <span className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
                Constructini
              </span>
            </Link>
            <div className="flex items-center space-x-4">
              {user && (
                <div className="flex items-center space-x-2 bg-white/50 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/20">
                  <UserCircle size={20} className="text-primary" />
                  <span className="text-sm font-medium text-gray-700">{user.name} ({user.role.replace('_', ' ')})</span>
                </div>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={logout} 
                className="hover:bg-white/50 text-gray-700 rounded-full px-4"
              >
                <LogOut size={18} className="mr-1" /> Logout
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="flex flex-1">
        <AnimatePresence mode="wait">
          {isSidebarOpen && (
            <motion.nav 
              className="w-64 bg-white/70 backdrop-blur-xl border-r border-white/20 p-4 hidden md:block"
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="space-y-2">
                {getLinks().map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                      isActive(link.path)
                        ? 'bg-gradient-to-r from-primary/10 to-purple-500/10 text-primary shadow-sm'
                        : 'hover:bg-white/50 text-gray-600 hover:text-primary'
                    }`}
                  >
                    {link.icon}
                    <span className="font-medium">{link.label}</span>
                  </Link>
                ))}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>

        <div className="relative flex-grow">
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-4 -translate-x-1/2 bg-white/70 backdrop-blur-xl border border-white/20 rounded-full shadow-lg hover:bg-white/80 hover:scale-110 transition-all duration-200 z-10 hidden md:flex w-8 h-8"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? 
              <ChevronLeft size={18} className="text-primary" /> : 
              <ChevronRight size={18} className="text-primary" />
            }
          </Button>
          
          <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </div>
      </div>

      <footer className="py-6 text-center text-sm text-gray-600 border-t border-white/20 bg-white/70 backdrop-blur-xl">
        &copy; {new Date().getFullYear()} Constructini. All rights reserved.
      </footer>
    </div>
  );
}
  