import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { LogOut, UserCircle, Building, Package, Users, Settings, Briefcase, ChevronLeft, ChevronRight, Moon, Sun, Menu } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function MainLayout({ children }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detectar si estamos en móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      // En móvil, la barra lateral comienza cerrada
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Cerrar la barra lateral al cambiar de ruta en móvil
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [location, isMobile]);

  const isActive = (path) => {
    return location.pathname === path;
  };

  const getAdminLinks = () => {
    return [
      { path: '/admin/dashboard', label: 'Dashboard', icon: <Briefcase size={20} /> },
      { path: '/admin/users', label: 'Users', icon: <Users size={20} /> },
      { path: '/admin/projects', label: 'Projects', icon: <Building size={20} /> },
      { path: '/admin/resource-requests', label: 'Resource Requests', icon: <Package size={20} /> },
      { path: '/admin/settings', label: 'Export Data', icon: <Settings size={20} /> },
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <motion.header 
        className="sticky top-0 z-50 shadow-lg bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-white/20 dark:border-gray-800/20"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 100 }}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              {isMobile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="mr-2 hover:bg-white/50 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300 rounded-full p-2"
                >
                  <Menu size={24} className="text-primary" />
                </Button>
              )}
              <Link to="/" className="flex items-center space-x-2">
                <Building size={28} className="text-primary" />
                <span className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
                  Constructini
                </span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="hover:bg-white/50 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300 rounded-full px-4"
              >
                {theme === 'dark' ? <Sun size={18} className="mr-1" /> : <Moon size={18} className="mr-1" />}
                {theme === 'dark' ? 'Light' : 'Dark'}
              </Button>
              {user && (
                <div className="flex items-center space-x-2 bg-white/50 dark:bg-gray-800/50 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/20 dark:border-gray-700/20">
                  <UserCircle size={20} className="text-primary" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{user.name} ({user.role.replace('_', ' ')})</span>
                </div>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={logout} 
                className="hover:bg-white/50 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300 rounded-full px-4"
              >
                <LogOut size={18} className="mr-1" /> Logout
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="relative flex flex-1">
        {/* Overlay para móvil cuando la barra lateral está abierta */}
        <AnimatePresence>
          {isSidebarOpen && isMobile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {isSidebarOpen && (
            <motion.nav 
              className={`fixed md:relative w-64 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-r border-white/20 dark:border-gray-800/20 p-4 flex flex-col z-50 h-[calc(100vh-4rem)] md:h-auto`}
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ 
                type: "spring",
                stiffness: 300,
                damping: 30,
                duration: 0.25
              }}
            >
              {!isMobile && (
                <motion.button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className="absolute -right-5 top-4 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-white/20 dark:border-gray-800/20 rounded-full shadow-lg hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200 w-10 h-10 flex items-center justify-center z-20"
                  whileHover={{ scale: 1.1 }}
                  animate={{ rotate: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30, duration: 0.25 }}
                >
                  <ChevronLeft size={20} className="text-primary" />
                </motion.button>
              )}
              <div className="space-y-2 mt-12">
                {getLinks().map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                      isActive(link.path)
                        ? 'bg-gradient-to-r from-primary/10 to-purple-500/10 text-primary shadow-sm'
                        : 'hover:bg-white/50 dark:hover:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:text-primary'
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

        {/* Toggle button cuando la barra lateral está cerrada (solo en desktop) */}
        {!isSidebarOpen && !isMobile && (
          <motion.button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="fixed md:absolute left-4 top-20 md:top-4 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-white/20 dark:border-gray-800/20 rounded-full shadow-lg hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200 w-10 h-10 flex items-center justify-center z-30"
            whileHover={{ scale: 1.1 }}
            animate={{ rotate: 180 }}
            transition={{ type: "spring", stiffness: 300, damping: 30, duration: 0.25 }}
          >
            <ChevronLeft size={20} className="text-primary" />
          </motion.button>
        )}

        <main className="flex-1 px-4 sm:px-8 lg:px-12 py-8 flex flex-col">
          {children}
        </main>
      </div>

      <footer className="py-6 text-center text-sm text-gray-600 dark:text-gray-400 border-t border-white/20 dark:border-gray-800/20 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl">
        &copy; {new Date().getFullYear()} Constructini. All rights reserved.
      </footer>
    </div>
  );
}
  