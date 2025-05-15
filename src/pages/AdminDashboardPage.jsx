import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Briefcase, BarChart3, Settings, Building } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { fetchActivityLogs } from '@/services/logService'; // Import the refactored service
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth

export default function AdminDashboardPage() {
  const { getActivityLogs, users, projects, tasks } = useAuth(); // Add users, projects, and tasks
  const [activityLogs, setActivityLogs] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeProjects, setActiveProjects] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);

  useEffect(() => {
    const loadActivityLogs = async () => {
      try {
        const logs = await fetchActivityLogs(getActivityLogs);
        console.log("Fetched Activity Logs:", logs);
        setActivityLogs(logs);
      } catch (error) {
        console.error("Error fetching activity logs:", error);
      }
    };

    loadActivityLogs();
  }, [getActivityLogs]);

  useEffect(() => {
    // Calculate total users
    setTotalUsers(users?.length || 0);

    // Calculate active projects
    const active = projects?.filter(project => project.status === 'Planning').length || 0;
    setActiveProjects(active);

    // Calculate completed tasks
    const completed = tasks?.filter(task => task.status === 'Completed').length || 0;
    setCompletedTasks(completed);
  }, [users, projects, tasks]);

  const stats = [
    { 
      title: "Total Users", 
      value: totalUsers.toString(), 
      icon: <Users className="h-6 w-6 text-primary" />, 
      color: "text-primary", 
      link: "/admin/users" 
    },
    { 
      title: "Active Projects", 
      value: activeProjects.toString(), 
      icon: <Briefcase className="h-6 w-6 text-tertiary" />, 
      color: "text-tertiary", 
      link: "/admin/projects" 
    },
    { 
      title: "Tasks Completed", 
      value: completedTasks.toString(), 
      icon: <BarChart3 className="h-6 w-6 text-accent" />, 
      color: "text-accent", 
      link: "#" 
    },
  ];

  const managementLinks = [
    { title: "Manage Users", path: "/admin/users", icon: <Users className="mr-2 h-5 w-5" /> },
    { title: "Manage Projects", path: "/admin/projects", icon: <Building className="mr-2 h-5 w-5" /> },
    { title: "System Settings", path: "/admin/settings", icon: <Settings className="mr-2 h-5 w-5" /> }, // Updated path
  ];

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <motion.h1 
        className="text-4xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-primary to-tertiary"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Admin Dashboard
      </motion.h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card className="glassmorphism-card hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                {stat.icon}
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                <p className="text-xs text-muted-foreground pt-1">
                  <Link to={stat.link} className="hover:underline">View Details</Link>
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div 
        className="mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <Card className="glassmorphism-card">
          <CardHeader>
            <CardTitle className="text-xl">Management Sections</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {managementLinks.map((item) => (
              <Button key={item.title} asChild variant="outline" className="justify-start text-left h-auto py-3 bg-secondary/50 hover:bg-secondary/80">
                <Link to={item.path}>
                  {item.icon}
                  <span className="font-semibold">{item.title}</span>
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <Card className="glassmorphism-card">
          <CardHeader>
            <CardTitle className="text-xl">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activityLogs.length === 0 ? (
              <p className="text-muted-foreground">No recent activity to display.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {activityLogs.map((log, index) => (
                  <li key={index} className="text-sm p-2 bg-secondary/30 rounded-md">
                    {log.message} <span className="text-xs text-muted-foreground">({log.timestamp})</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
