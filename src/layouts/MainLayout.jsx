
    import React from 'react';
    import { useAuth } from '@/contexts/AuthContext';
    import { Button } from '@/components/ui/button';
    import { LogOut, UserCircle, Building } from 'lucide-react';
    import { Link } from 'react-router-dom';
    import { motion } from 'framer-motion';

    export default function MainLayout({ children }) {
      const { user, logout } = useAuth();

      return (
        <div className="min-h-screen flex flex-col bg-secondary/30">
          <motion.header 
            className="sticky top-0 z-50 shadow-md bg-gradient-to-r from-primary to-purple-600 text-primary-foreground"
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', stiffness: 100 }}
          >
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <Link to="/" className="flex items-center space-x-2">
                  <Building size={28} />
                  <span className="text-2xl font-bold tracking-tight">Constructini</span>
                </Link>
                <div className="flex items-center space-x-4">
                  {user && (
                    <div className="flex items-center space-x-2">
                      <UserCircle size={20} />
                      <span className="text-sm font-medium">{user.name} ({user.role.replace('_', ' ')})</span>
                    </div>
                  )}
                  <Button variant="ghost" size="sm" onClick={logout} className="hover:bg-primary-foreground/10">
                    <LogOut size={18} className="mr-1" /> Logout
                  </Button>
                </div>
              </div>
            </div>
          </motion.header>
          
          <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>

          <footer className="py-6 text-center text-sm text-muted-foreground border-t border-border bg-background">
            &copy; {new Date().getFullYear()} Consstructini. All rights reserved.
          </footer>
        </div>
      );
    }
  