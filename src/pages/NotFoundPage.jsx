
    import React from 'react';
    import { Link } from 'react-router-dom';
    import { Button } from '@/components/ui/button';
    import { AlertTriangle } from 'lucide-react';
    import { motion } from 'framer-motion';

    export default function NotFoundPage() {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gradient-bg text-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, type: "spring", stiffness: 120 }}
          >
            <AlertTriangle size={80} className="text-accent-foreground mx-auto mb-6" />
            <h1 className="text-6xl font-bold text-accent-foreground mb-4">404</h1>
            <h2 className="text-3xl font-semibold text-accent-foreground mb-6">Page Not Found</h2>
            <p className="text-lg text-accent-foreground/80 mb-8 max-w-md">
              Oops! The page you're looking for doesn't exist. It might have been moved or deleted.
            </p>
            <Button asChild variant="secondary" size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
              <Link to="/">Go Back Home</Link>
            </Button>
          </motion.div>
        </div>
      );
    }
  