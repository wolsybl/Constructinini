import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, Search, Edit, Users, MapPin, ListPlus, BarChart2, Clock, AlertCircle, CheckCircle2, Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

export default function ManagerProjectManagementPage() {
  const { projects, user, tasks, projectAssignments } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const managerProjects = projects.filter(p => p.manager_id === user?.id || p.manager_id === null || user?.role === 'admin');

  const filteredProjects = managerProjects.filter(project => 
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (project.location_name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  // Calculate project progress and assigned workers
  const projectsWithProgress = useMemo(() => {
    return filteredProjects.map(project => {
      const projectTasks = tasks.filter(task => task.project_id === project.id);
      const completedTasks = projectTasks.filter(task => task.status === 'Completed').length;
      const totalTasks = projectTasks.length;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      // Get assigned workers for this project
      const assignedWorkers = projectAssignments
        .filter(assignment => assignment.project_id === project.id)
        .map(assignment => assignment.profiles?.name || 'Unknown Worker');

      return {
        ...project,
        progress,
        completedTasks,
        totalTasks,
        pendingTasks: totalTasks - completedTasks,
        assignedWorkers
      };
    });
  }, [filteredProjects, tasks, projectAssignments]);
  
  const handleManageTasks = (projectId) => {
    navigate(`/project_manager/tasks/${projectId}`);
  };

  const handleViewDetails = (projectId) => {
    navigate(`/project_manager/projects/${projectId}/view`);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'text-green-500';
      case 'completed':
        return 'text-blue-500';
      case 'on hold':
        return 'text-yellow-500';
      case 'cancelled':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getProgressColor = (progress) => {
    if (progress >= 75) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    },
    hover: {
      scale: 1.02,
      transition: {
        duration: 0.2,
        ease: "easeInOut"
      }
    }
  };

  const contentVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: {
        duration: 0.3,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: {
        duration: 0.3
      }
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4"
      >
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-700 via-blue-500 to-gray-600">
          Project Portfolio
        </h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <Card className="glassmorphism-card mb-8">
          <CardHeader>
            <CardTitle>Filter Projects</CardTitle>
            <CardDescription>Search by project name or location</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-grow">
              <Input 
                type="search" 
                placeholder="Search projects..." 
                className="pl-10 bg-background/70" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        {projectsWithProgress.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8"
          >
            <p className="text-muted-foreground text-lg">
              {searchTerm ? `No projects found matching "${searchTerm}".` : "You are not assigned to any projects yet."}
            </p>
          </motion.div>
        )}

        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          <AnimatePresence>
            {projectsWithProgress.map((project, index) => (
              <motion.div
                key={project.id}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                whileHover="hover"
                className="transform transition-all duration-300"
              >
                <Card className="glassmorphism-card h-full flex flex-col overflow-hidden border-2 border-primary/10 hover:border-primary/30 transition-colors duration-300">
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-tertiary/5 pb-4">
                    <motion.div 
                      variants={contentVariants}
                      initial="hidden"
                      animate="visible"
                      className="flex justify-between items-start"
                    >
                      <div>
                        <motion.div variants={itemVariants}>
                          <CardTitle className="text-2xl text-primary mb-2">{project.name}</CardTitle>
                        </motion.div>
                        <motion.div variants={itemVariants}>
                          <CardDescription className="flex items-center text-muted-foreground">
                            <MapPin size={14} className="mr-1" /> {project.location_name}
                          </CardDescription>
                        </motion.div>
                      </div>
                      <motion.div variants={itemVariants}>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(project.status)} bg-opacity-10`}>
                          {project.status || 'Not Set'}
                        </span>
                      </motion.div>
                    </motion.div>
                  </CardHeader>
                  <CardContent className="flex-grow p-6 space-y-4">
                    <motion.p 
                      variants={itemVariants}
                      className="text-sm text-muted-foreground line-clamp-2"
                    >
                      {project.description}
                    </motion.p>
                    
                    <motion.div 
                      variants={contentVariants}
                      className="space-y-3"
                    >
                      <motion.div variants={itemVariants} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Users size={16} className="mr-2 text-tertiary" />
                          <span className="text-sm font-medium">Assigned Workers</span>
                        </div>
                        <div className="text-sm font-semibold">
                          {project.assignedWorkers.length > 0 ? (
                            <div className="flex flex-wrap gap-1 justify-end">
                              {project.assignedWorkers.map((worker, idx) => (
                                <span key={idx} className="px-2 py-1 bg-secondary/50 rounded-full text-xs">
                                  {worker}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No workers assigned</span>
                          )}
                        </div>
                      </motion.div>
                    </motion.div>

                    <motion.div 
                      variants={contentVariants}
                      className="mt-4"
                    >
                      <motion.div variants={itemVariants} className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Task Progress</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-green-500">{project.completedTasks} completed</span>
                          <span className="text-sm text-muted-foreground">/</span>
                          <span className="text-sm font-semibold">{project.totalTasks} total</span>
                        </div>
                      </motion.div>
                      <motion.div variants={itemVariants} className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${project.progress}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className={`h-full ${getProgressColor(project.progress)}`}
                        />
                      </motion.div>
                      <motion.div variants={itemVariants} className="flex justify-between mt-1">
                        <span className="text-xs text-muted-foreground">{project.pendingTasks} tasks pending</span>
                        <span className="text-xs text-muted-foreground">{project.progress}% complete</span>
                      </motion.div>
                    </motion.div>
                  </CardContent>
                  <CardFooter className="p-4 border-t border-border/20 flex flex-wrap justify-end gap-2 pt-4 bg-gradient-to-r from-primary/5 to-tertiary/5">
                    <motion.div variants={itemVariants}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(project.id)}
                        className="hover:bg-primary/10 text-primary border-primary/50"
                      >
                        <Eye size={16} className="mr-1" /> View Details
                      </Button>
                    </motion.div>
                    <motion.div variants={itemVariants}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleManageTasks(project.id)}
                        className="hover:bg-tertiary/10 text-tertiary border-tertiary/50"
                      >
                        <ListPlus size={16} className="mr-1" /> Manage Tasks
                      </Button>
                    </motion.div>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
