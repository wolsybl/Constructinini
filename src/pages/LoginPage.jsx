
    import React, { useState, useEffect } from 'react';
    import { useAuth } from '@/contexts/AuthContext';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
    import { Building, LogIn } from 'lucide-react';
    import { motion } from 'framer-motion';

    export default function LoginPage() {
      const [email, setEmail] = useState('');
      const [password, setPassword] = useState('');
      const { login, loading: authLoading } = useAuth();
      const [isSubmitting, setIsSubmitting] = useState(false);

      const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        await login(email, password);
        setIsSubmitting(false);
      };
      
      const isLoading = authLoading || isSubmitting;

      return (
        <div className="min-h-screen flex items-center justify-center p-4 gradient-bg">
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="w-full max-w-md glassmorphism-card shadow-2xl">
              <CardHeader className="text-center">
                <motion.div 
                  className="mx-auto mb-4 text-primary"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 20 }}
                >
                  <Building size={48} />
                </motion.div>
                <CardTitle className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-gray-400">
                  Consstructini
                </CardTitle>
                <CardDescription className="text-muted-foreground pt-1">
                  Manage your construction projects efficiently.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-background/70"
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-background/70"
                      disabled={isLoading}
                    />
                  </div>
                  <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold" disabled={isLoading}>
                    {isLoading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-t-transparent border-white rounded-full mr-2"
                      ></motion.div>
                    ) : (
                      <LogIn size={18} className="mr-2" />
                    )}
                    {isLoading ? 'Signing In...' : 'Sign In'}
                  </Button>
                </form>
              </CardContent>
              <CardFooter className="text-center text-xs text-muted-foreground">
                <p>
                  Hint: password123
                </p>
              </CardFooter>
            </Card>
          </motion.div>
        </div>
      );
    }
  