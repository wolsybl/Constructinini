import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FolderKanban, ListChecks, Users2, Building, Calendar, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function ProjectManagerDashboardPage() {
  const { projects, tasks, user, projectAssignments } = useAuth();
  const [activeProjects, setActiveProjects] = useState(0);
  const [pendingTasks, setPendingTasks] = useState(0);
  const [teamMembers, setTeamMembers] = useState(0);

  const getProgressColor = (progress) => {
    if (progress >= 75) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 25) return 'bg-yellow-500';
    return 'bg-red-500';
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

  const projectsWithProgress = useMemo(() => {
    return projects
      .filter(project => project.manager_id === user?.id)
      .map(project => {
        const projectTasks = tasks.filter(task => task.project_id === project.id);
        const completedTasks = projectTasks.filter(task => task.status === 'Completed').length;
        const totalTasks = projectTasks.length;
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        return {
          ...project,
          progress,
          completedTasks,
          totalTasks,
          pendingTasks: totalTasks - completedTasks
        };
      });
  }, [projects, tasks, user]);

  useEffect(() => {
    if (!user || !projects || !tasks || !projectAssignments) return;

    // Calculate active projects assigned to the current manager
    const managerProjects = projects.filter(
      (project) => project.manager_id === user.id
    );
    setActiveProjects(managerProjects.length);

    // Calculate pending tasks for the manager's projects
    const managerProjectIds = managerProjects.map(p => p.id);
    const managerTasks = tasks.filter(
      (task) => managerProjectIds.includes(task.project_id) && task.status !== 'Completed'
    );
    setPendingTasks(managerTasks.length);

    // Calculate unique team members using project_assignments
    const managerProjectIdsSet = new Set(managerProjectIds);
    const uniqueTeamMembers = new Set(
      projectAssignments
        .filter(assignment => managerProjectIdsSet.has(assignment.project_id))
        .map(assignment => assignment.user_id)
    );
    setTeamMembers(uniqueTeamMembers.size);
  }, [projects, tasks, user, projectAssignments]);

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
    { title: 'Tasks For Approval', path: '/project_manager/pending-tasks', icon: <ListChecks className="mr-2 h-5 w-5" /> },
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
            <div className="space-y-6">
              {projectsWithProgress.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 bg-secondary/30 rounded-lg"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-primary">{project.name}</h3>
                      <p className="text-sm text-muted-foreground">{project.location_name}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(project.status)} bg-opacity-10`}>
                      {project.status || 'Not Set'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center">
                          <Calendar size={14} className="mr-1 text-tertiary" />
                          <span>Start: {new Date(project.start_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock size={14} className="mr-1 text-tertiary" />
                          <span>Due: {new Date(project.due_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-green-500">{project.completedTasks} completed</span>
                        <span className="text-sm text-muted-foreground">/</span>
                        <span className="text-sm font-semibold">{project.totalTasks} total</span>
                      </div>
                    </div>

                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${project.progress}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={`h-full ${getProgressColor(project.progress)}`}
                      />
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">{project.pendingTasks} tasks pending</span>
                      <span className="text-xs text-muted-foreground">{project.progress}% complete</span>
                      <Link
                        to={`/project_manager/projects/${project.id}/view`}
                        className="text-xs text-accent hover:text-accent-foreground hover:underline"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
