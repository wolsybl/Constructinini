import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { UserPlus, Search, Edit2, Briefcase, Phone, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { fetchAllWorkers } from '@/services/workerService';

const AssignProjectModal = ({ isOpen, setIsOpen, worker, projects, onAssign }) => {
  const [selectedProjectId, setSelectedProjectId] = useState(worker.assignedProjectId || '');
  const { toast } = useToast();
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedProjectId) {
      toast({ variant: "destructive", title: "Error", description: "Please select a project." });
      return;
    }
    onAssign(worker.id, selectedProjectId);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px] bg-card glassmorphism-card">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-tertiary">Assign Project to {worker.name}</DialogTitle>
          <DialogDescription>Select a project to assign to this worker.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="project" className="text-right text-muted-foreground">Project</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="col-span-3 bg-background/70">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="bg-secondary/50 hover:bg-secondary/80">Cancel</Button>
            <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground">Assign Project</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default function WorkerManagementPage() {
  const { projects, projectAssignments, assignWorkerToProject } = useAuth();
  const { toast } = useToast();
  const [workers, setWorkers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const loadWorkers = async () => {
      try {
        const fetchedWorkers = await fetchAllWorkers();
        setWorkers(fetchedWorkers);
      } catch (error) {
        console.error("Error loading workers:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to load workers. Please try again later." });
      }
    };

    loadWorkers();
  }, [toast]);

  const workersWithAssignments = workers.map(worker => {
    // Find the project assignment for this worker
    const assignment = projectAssignments.find(pa => pa.user_id === worker.id);
    
    // Find the project details if there's an assignment
    const project = assignment ? projects.find(p => p.id === assignment.project_id) : null;
    
    return {
      ...worker,
      assignedProjectId: assignment ? assignment.project_id : null,
      currentProject: project ? project.name : 'Unassigned',
    };
  });

  const filteredWorkers = workersWithAssignments.filter(worker =>
    worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (worker.skills?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    worker.currentProject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (worker) => {
    setSelectedWorker(worker);
    setIsModalOpen(true);
  };

  const handleAssignProject = async (workerId, projectId) => {
    try {
      await assignWorkerToProject(workerId, projectId);
      toast({ title: "Success", description: "Worker assigned to project successfully." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to assign worker to project." });
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      {selectedWorker && <AssignProjectModal isOpen={isModalOpen} setIsOpen={setIsModalOpen} worker={selectedWorker} projects={projects} onAssign={handleAssignProject} />}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4"
      >
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-gray-400">
          Worker Management
        </h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <Card className="glassmorphism-card mb-8">
          <CardHeader>
            <CardTitle>Filter Workers</CardTitle>
            <CardDescription>Search workers by name, skills, or project.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-grow">
              <Input 
                type="search" 
                placeholder="Search workers..." 
                className="pl-10 bg-background/70"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        {filteredWorkers.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8"
          >
            <p className="text-muted-foreground text-lg">
              {searchTerm ? `No workers found matching "${searchTerm}".` : "No workers available."}
            </p>
          </motion.div>
        )}

        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {filteredWorkers.map((worker, index) => (
            <motion.div
              key={worker.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index + 0.3, duration: 0.4 }}
            >
              <Card className="glassmorphism-card h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="text-xl text-primary">{worker.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow space-y-2">
                  <p className="text-sm flex items-center">
                    <Briefcase size={14} className="mr-2 text-tertiary" /> 
                    <span className="font-semibold">Current Project:</span>&nbsp; 
                    <span className={worker.currentProject === 'Unassigned' ? 'italic text-muted-foreground' : 'text-primary'}>
                      {worker.currentProject}
                    </span>
                  </p>
                  {worker.phone && (
                    <p className="text-sm flex items-center">
                      <Phone size={14} className="mr-2 text-tertiary" /> 
                      <span className="font-semibold">Phone:</span> {worker.phone}
                    </p>
                  )}
                </CardContent>
                <CardFooter className="p-4 border-t border-border/20 flex justify-end pt-4">
                  <Button 
                    onClick={() => handleOpenModal(worker)} 
                    variant="outline" 
                    size="sm" 
                    className="hover:bg-primary/10 text-primary border-primary/50"
                  >
                    <Edit2 size={16} className="mr-1" /> Manage Assignment
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
