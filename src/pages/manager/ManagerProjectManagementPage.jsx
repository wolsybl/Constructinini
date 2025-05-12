
    import React, { useState } from 'react';
    import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Eye, Search, Edit, Users, MapPin, ListPlus } from 'lucide-react';
    import { motion } from 'framer-motion';
    import { useAuth } from '@/contexts/AuthContext';
    import { Link, useNavigate } from 'react-router-dom';

    export default function ManagerProjectManagementPage() {
      const { projects, user } = useAuth();
      const [searchTerm, setSearchTerm] = useState("");
      const navigate = useNavigate();

      const managerProjects = projects.filter(p => p.manager === user?.name || p.manager === 'Unassigned' || user?.role === 'admin');


      const filteredProjects = managerProjects.filter(project => 
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.locationName.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      const handleManageTasks = (projectId) => {
        navigate(`/project_manager/tasks/${projectId}`);
      };


      return (
        <div className="container mx-auto py-8 px-4 md:px-6">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4"
          >
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-tertiary">
              My Projects
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Card className="glassmorphism-card mb-8">
              <CardHeader>
                <CardTitle>Filter My Projects</CardTitle>
                <CardDescription>Search or filter your assigned projects.</CardDescription>
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
            
            {filteredProjects.length === 0 && (
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
              {filteredProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index + 0.3, duration: 0.4 }}
                >
                  <Card className="glassmorphism-card h-full flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-xl text-primary">{project.name}</CardTitle>
                      <CardDescription className="flex items-center text-muted-foreground">
                        <MapPin size={14} className="mr-1" /> {project.locationName} (Lat: {project.latitude.toFixed(2)}, Lon: {project.longitude.toFixed(2)})
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <p className="text-sm mb-2">{project.description}</p>
                      <p className="text-sm mb-1"><span className="font-semibold">Status:</span> {project.status}</p>
                      <p className="text-sm flex items-center"><Users size={14} className="mr-1 text-tertiary" /> <span className="font-semibold">Team Size:</span> {project.teamSize || 0} workers</p>
                    </CardContent>
                    <CardFooter className="p-4 border-t border-border/20 flex flex-wrap justify-end gap-2 pt-4">
                       <Button variant="outline" size="sm" className="hover:bg-primary/10 text-primary border-primary/50">
                        <Eye size={16} className="mr-1" /> View Details
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleManageTasks(project.id)} className="hover:bg-tertiary/10 text-tertiary border-tertiary/50">
                        <ListPlus size={16} className="mr-1" /> Manage Tasks
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      );
    }
  