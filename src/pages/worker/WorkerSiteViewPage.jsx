import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Users, ListChecks, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function WorkerSiteViewPage() {
  const { user, projects, tasks, projectAssignments } = useAuth();

  // Find the assigned project using data from AuthContext
  const assignedProjectAssignment = projectAssignments.find(assignment => assignment.user_id === user?.id);
  const project = assignedProjectAssignment ? projects.find(p => p.id === assignedProjectAssignment.project_id) : null;

  // Filter tasks for the assigned project
  const projectTasks = project ? tasks.filter(task => task.project_id === project.id) : [];

  // Calculate progress
  const completedTasks = projectTasks.filter(task => task.status === 'Completed').length;
  const totalTasks = projectTasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  if (!project) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6">
        <Card className="glassmorphism-card max-w-xl mx-auto">
          <CardHeader>
            <CardTitle>No Assigned Project</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">You are not currently assigned to any project site.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-tertiary">
          {project.name}
        </h1>
        <p className="text-muted-foreground flex items-center mt-1">
          <MapPin size={16} className="mr-2 text-tertiary" /> {project.location_name || project.locationName || 'No location'}
        </p>
      </motion.div>

      <div className="grid gap-8 lg:grid-cols-3">
        <motion.div 
          className="lg:col-span-2 space-y-8"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Card className="glassmorphism-card">
            <CardHeader>
              <CardTitle className="text-xl">Site Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p><span className="font-semibold text-muted-foreground">Project Manager:</span> {project.manager || '-'}</p>
              <p><span className="font-semibold text-muted-foreground">Status:</span> {project.status}</p>
              <p><span className="font-semibold text-muted-foreground">Progress:</span> <span className="text-primary font-bold">{progress}%</span></p>
              <p><span className="font-semibold text-muted-foreground">Location:</span> {project.location_name || project.locationName || '-'}</p>
              <p><span className="font-semibold text-muted-foreground">Radius:</span> {project.radius} m</p>
            </CardContent>
          </Card>
          {/* Puedes agregar más tarjetas con información de seguridad si lo deseas */}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Card className="glassmorphism-card">
            <CardHeader>
              <CardTitle className="text-xl flex items-center"><ListChecks size={22} className="mr-2 text-tertiary" /> Tasks on this Site</CardTitle>
            </CardHeader>
            <CardContent>
              {projectTasks.length > 0 ? (
                <ul className="space-y-3">
                  {projectTasks.map(task => (
                    <li key={task.id} className="p-3 bg-secondary/30 rounded-md flex justify-between items-center">
                      <span className="text-sm">{task.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        task.status === 'Pending' ? 'bg-yellow-500 text-white' : 
                        task.status === 'In Progress' ? 'bg-blue-500 text-white' : 
                        'bg-green-500 text-white'
                      }`}>
                        {task.status}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">No tasks assigned to you on this site currently.</p>
              )}
              <Button asChild className="w-full mt-6 bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link to="/worker/attendance">
                  <CheckCircle2 size={18} className="mr-2" /> Mark My Attendance
                </Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
