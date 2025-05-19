import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FolderKanban, ListChecks, Users2, Building } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function ProjectManagerDashboardPage() {
  const { projects, tasks, user } = useAuth(); // Fetch projects and tasks from context
  const [activeProjects, setActiveProjects] = useState(0);
  const [pendingTasks, setPendingTasks] = useState(0);
  const [teamMembers, setTeamMembers] = useState(0);

  useEffect(() => {
    // Calculate active projects assigned to the current manager
    const managerProjects = projects.filter(
      (project) => project.manager === user?.name
    );
    setActiveProjects(managerProjects.length);

    // Calculate pending tasks assigned to the current manager
    const managerTasks = tasks.filter(
      (task) => task.assignedTo === user?.name && task.status !== 'Completed'
    );
    setPendingTasks(managerTasks.length);

    // Calculate team members assigned to the manager's projects
    const uniqueTeamMembers = new Set(
      managerProjects.flatMap((project) => project.teamMembers || [])
    );
    setTeamMembers(uniqueTeamMembers.size);
  }, [projects, tasks, user]);

  const projectStats = [
    {
      title: 'My Active Projects',
      value: activeProjects,
      icon: <FolderKanban className="h-6 w-6 text-primary" />,
      color: 'text-primary',
      link: '/project_manager/projects',
    },
    {
      title: 'Pending Tasks',
      value: pendingTasks,
      icon: <ListChecks className="h-6 w-6 text-tertiary" />,
      color: 'text-tertiary',
      link: '#',
    },
    {
      title: 'Team Members Assigned',
      value: teamMembers,
      icon: <Users2 className="h-6 w-6 text-accent" />,
      color: 'text-accent',
      link: '/project_manager/workers',
    },
  ];

  const managementLinks = [
    { title: 'Manage My Projects', path: '/project_manager/projects', icon: <Building className="mr-2 h-5 w-5" /> },
    { title: 'Manage Workers', path: '/project_manager/workers', icon: <Users2 className="mr-2 h-5 w-5" /> },
    { title: 'View Tasks', path: '#', icon: <ListChecks className="mr-2 h-5 w-5" /> },
  ];

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <motion.h1
        className="text-4xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-primary to-tertiary"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Project Manager Dashboard
      </motion.h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {projectStats.map((stat, index) => (
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
            <CardTitle className="text-xl">Project Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">A list or chart of your projects will be displayed here...</p>
            <ul className="mt-4 space-y-2">
              {projects
                .filter(project => project.manager === user?.name)
                .map(project => (
                  <li
                    key={project.id}
                    className="text-sm p-2 bg-secondary/30 rounded-md flex justify-between items-center"
                  >
                    <span>{project.name}</span>
                    <span className="ml-2 font-semibold text-primary">{project.progress ?? 0}% Complete</span>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
