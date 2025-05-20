import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Users, ListChecks, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';

export default function WorkerSiteViewPage() {
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjectAndTasks = async () => {
      setLoading(true);
      try {
        // Buscar el proyecto asignado al usuario
        const { data: assignment, error: assignmentError } = await supabase
          .from('project_assignments')
          .select('project_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (assignmentError) throw assignmentError;
        if (!assignment) {
          setProject(null);
          setTasks([]);
          setLoading(false);
          return;
        }

        // Obtener datos del proyecto
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', assignment.project_id)
          .single();

        if (projectError) throw projectError;
        setProject(projectData);

        // Obtener tareas asignadas al usuario en ese proyecto
        const { data: userTasks, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .eq('assigned_to_user_id', user.id)
          .eq('project_id', assignment.project_id);

        if (tasksError) throw tasksError;
        setTasks(userTasks || []);
      } catch (err) {
        setProject(null);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) fetchProjectAndTasks();
  }, [user]);

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6">
        <p className="text-center text-muted-foreground">Loading site information...</p>
      </div>
    );
  }

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
              <p><span className="font-semibold text-muted-foreground">Progress:</span> <span className="text-primary font-bold">{project.progress ?? 0}%</span></p>
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
              <CardTitle className="text-xl flex items-center"><ListChecks size={22} className="mr-2 text-tertiary" /> My Tasks on this Site</CardTitle>
            </CardHeader>
            <CardContent>
              {tasks.length > 0 ? (
                <ul className="space-y-3">
                  {tasks.map(task => (
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
