import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardList, CalendarClock, UserCheck, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';

export default function WorkerDashboardPage() {
  const { user, projects, tasks, fetchAttendanceStatus } = useAuth(); // Fetch attendance status from context
  const [assignedSite, setAssignedSite] = useState(null);
  const [pendingTasks, setPendingTasks] = useState(0);
  const [attendanceStatus, setAttendanceStatus] = useState('Not Checked In');
  const [isFirstTime, setIsFirstTime] = useState(false); // Track if it's the user's first time

  useEffect(() => {
    // Find the assigned site for the worker
    const fetchAssignedSite = async () => {
      try {
        const { data: assignment, error: assignmentError } = await supabase
          .from('project_assignments')
          .select('project_id')
          .eq('user_id', user?.id)
          .maybeSingle();

        if (assignmentError) throw assignmentError;
        if (!assignment) {
          setAssignedSite(null);
          return;
        }

        const site = projects.find(project => project.id === assignment.project_id);
        setAssignedSite(site);
      } catch (error) {
        console.error('Error fetching assigned site:', error);
        setAssignedSite(null);
      }
    };

    // Calculate pending tasks for the worker
    const workerTasks = tasks.filter(
      (task) => task.assigned_to_user_id === user?.id && task.status !== 'Completed'
    );
    setPendingTasks(workerTasks.length);

    // Fetch attendance status from the database
    const loadAttendanceStatus = async () => {
      try {
        const status = await fetchAttendanceStatus(user?.id);
        if (!status) {
          setIsFirstTime(true); // Mark as first time if no status exists
          setAttendanceStatus('Welcome! Please check in for the first time.');
        } else {
          setAttendanceStatus(status);
        }
      } catch (error) {
        console.error('Failed to fetch attendance status:', error);
        setAttendanceStatus('Not Checked In'); // Default on error
      }
    };

    if (user?.id) {
      fetchAssignedSite();
      loadAttendanceStatus();
    }
  }, [projects, tasks, user, fetchAttendanceStatus]);

  const workerInfo = [
    {
      title: 'Assigned Site',
      value: assignedSite ? assignedSite.name : 'No Site Assigned',
      icon: <MapPin className="h-6 w-6 text-primary" />,
      color: 'text-primary',
      actionText: assignedSite ? 'View Site Details' : null,
      link: assignedSite ? `/worker/site` : '#',
    },
    {
      title: "Today's Tasks",
      value: `${pendingTasks} Pending`,
      icon: <ClipboardList className="h-6 w-6 text-tertiary" />,
      color: 'text-tertiary',
      actionText: 'View My Tasks',
      link: '/worker/tasks',
    },
    {
      title: 'Attendance',
      value: attendanceStatus,
      icon: <UserCheck className="h-6 w-6 text-accent" />,
      color: 'text-accent',
      actionText: isFirstTime ? 'Check In Now' : 'Mark Attendance',
      link: '/worker/attendance',
    },
  ];

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <motion.h1
        className="text-4xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-primary to-tertiary"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Worker Dashboard
      </motion.h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {workerInfo.map((info, index) => (
          <motion.div
            key={info.title}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card className="glassmorphism-card hover:shadow-lg transition-shadow duration-300 h-full flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{info.title}</CardTitle>
                {info.icon}
              </CardHeader>
              <CardContent className="flex-grow">
                <div className={`text-2xl font-bold ${info.color}`}>{info.value}</div>
                <p className="text-xs text-muted-foreground pt-1">
                  Your current status
                </p>
              </CardContent>
              {info.actionText && (
                <div className="p-4 pt-0">
                  <Button asChild className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground">
                    <Link to={info.link}>{info.actionText}</Link>
                  </Button>
                </div>
              )}
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="mt-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <Card className="glassmorphism-card">
          <CardHeader>
            <CardTitle className="text-xl">My Tasks Overview</CardTitle>
            <CardDescription>Quick look at your current assignments.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {tasks
                .filter((task) => task.assigned_to_user_id === user?.id)
                .map((task) => (
                  <li
                    key={task.id}
                    className="flex justify-between items-center p-3 bg-secondary/30 rounded-md"
                  >
                    <span>{task.title}</span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        task.status === 'Completed'
                          ? 'bg-green-500 text-white'
                          : task.status === 'In Progress'
                          ? 'bg-yellow-500 text-white'
                          : 'bg-red-500 text-white'
                      }`}
                    >
                      {task.status}
                    </span>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
