import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea'; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { PlusCircle, Edit, Trash2, ListChecks, ArrowLeft, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

const CreateTaskModal = ({ isOpen, setIsOpen, projectId, onTaskCreate, workersOnProject }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedToUserId, setAssignedToUserId] = useState(null); // Use null instead of an empty string
  const { toast } = useToast();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !description) {
      toast({ variant: "destructive", title: "Error", description: "Please fill title and description." });
      return;
    }
    onTaskCreate({
      projectId,
      title,
      description,
      status: 'Pending',
      assignedToUserId: assignedToUserId || null, 
    });
    setTitle('');
    setDescription('');
    setAssignedToUserId(null); // Reset to null
    setIsOpen(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[525px] bg-card glassmorphism-card">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-tertiary">Create New Task</DialogTitle>
          <DialogDescription>Fill in the details for the new task.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="taskTitle" className="text-right text-muted-foreground">Title</Label>
              <Input id="taskTitle" value={title} onChange={(e) => setTitle(e.target.value)} className="col-span-3 bg-background/70" placeholder="e.g., Install Fixtures" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="taskDescription" className="text-right text-muted-foreground">Description</Label>
              <Textarea id="taskDescription" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3 bg-background/70" placeholder="Detailed task instructions" />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="assignedTo" className="text-right text-muted-foreground">Assign To</Label>
              <Select value={assignedToUserId} onValueChange={setAssignedToUserId}>
                <SelectTrigger className="col-span-3 bg-background/70">
                  <SelectValue placeholder="Assign to a worker (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {workersOnProject.length > 0 ? (
                    workersOnProject.map(worker => (
                      <SelectItem key={worker.id} value={worker.id}>{worker.name}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No workers available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="bg-secondary/50 hover:bg-secondary/80">Cancel</Button>
            <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground">Create Task</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default function ManagerTaskPage() {
  const { projectId } = useParams();
  const { tasks, addTask, getProjectById, projectAssignments, allUsers } = useAuth(); // Use allUsers for workers
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [project, setProject] = useState(null); // State for the project
  const [workersOnThisProject, setWorkersOnThisProject] = useState([]); // State for workers
  const [projectTasks, setProjectTasks] = useState([]); // State for tasks
  const { toast } = useToast();

  useEffect(() => {
    // Fetch project details
    const fetchProject = () => {
      const fetchedProject = getProjectById(projectId);
      console.log("Fetched Project:", fetchedProject); // Debugging log
      setProject(fetchedProject);
    };

    // Fetch workers assigned to this project
    const fetchWorkers = () => {
      const workers = projectAssignments
        .filter(pa => pa.projectId === projectId)
        .map(pa => allUsers.find(user => user.id === pa.userId))
        .filter(Boolean);
      console.log("Workers on this project:", workers); // Debugging log
      setWorkersOnThisProject(workers);
    };

    // Fetch tasks for this project
    const fetchTasks = () => {
      const tasksForProject = tasks.filter(task => task.projectId === projectId);
      console.log("Tasks for this project:", tasksForProject); // Debugging log
      setProjectTasks(tasksForProject);
    };

    fetchProject();
    fetchWorkers();
    fetchTasks();
  }, [projectId, getProjectById, projectAssignments, allUsers, tasks]);

  const getWorkerName = (userId) => {
    if (!userId) return <span className="italic text-muted-foreground">Unassigned</span>;
    const worker = allUsers.find(user => user.id === userId);
    return worker ? worker.name : <span className="italic text-red-500">Unknown Worker</span>;
  };

  if (!project) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 text-center">
        <h1 className="text-2xl font-bold text-destructive">Project Not Found</h1>
        <p className="text-muted-foreground">The project you are looking for does not exist.</p>
        <Button asChild variant="link" className="mt-4">
          <Link to="/project_manager/projects">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4"
      >
        <div>
          <Button asChild variant="outline" size="sm" className="mb-2 text-muted-foreground hover:text-primary">
            <Link to="/project_manager/projects">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects
            </Link>
          </Button>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-tertiary">
            Manage Tasks for: {project.name}
          </h1>
          <p className="text-muted-foreground">{project.description}</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <PlusCircle size={18} className="mr-2" /> Create New Task
        </Button>
      </motion.div>

      <CreateTaskModal 
        isOpen={isModalOpen} 
        setIsOpen={setIsModalOpen} 
        projectId={projectId} 
        onTaskCreate={addTask}
        workersOnProject={workersOnThisProject}
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        {projectTasks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <ListChecks size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-xl">No tasks created for this project yet.</p>
            <p className="text-muted-foreground">Click "Create New Task" to get started.</p>
          </motion.div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projectTasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index + 0.3, duration: 0.4 }}
              >
                <Card className="glassmorphism-card h-full flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-xl text-primary">{task.title}</CardTitle>
                    <CardDescription className="text-muted-foreground">Status: {task.status}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm mb-2">{task.description}</p>
                    <p className="text-sm flex items-center"><User size={14} className="mr-2 text-tertiary" /> 
                      <span className="font-semibold text-muted-foreground">Assigned to:</span>&nbsp; 
                      {getWorkerName(task.assignedToUserId)}
                    </p>
                  </CardContent>
                  <CardFooter className="border-t border-border/20 flex justify-end space-x-2 pt-4">
                    <Button variant="ghost" size="sm" className="hover:bg-primary/10 text-primary">
                      <Edit size={16} className="mr-1" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="hover:bg-destructive/10 text-destructive">
                      <Trash2 size={16} className="mr-1" /> Delete
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
