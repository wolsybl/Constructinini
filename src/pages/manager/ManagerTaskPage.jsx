import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea'; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { PlusCircle, Edit, Trash2, ListChecks, ArrowLeft, User, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';

// Nueva función para obtener los workers asignados a este proyecto
async function fetchAssignedWorkers(projectId) {
  const { data: assignments, error: assignmentError } = await supabase
    .from('project_assignments')
    .select('user_id')
    .eq('project_id', projectId);
  if (assignmentError) {
    console.error('Error fetching assignments:', assignmentError);
    return [];
  }
  const userIds = assignments.map(a => a.user_id);
  if (userIds.length === 0) return [];
  const { data: workers, error: workersError } = await supabase
    .from('profiles')
    .select('id, name')
    .in('id', userIds)
    .eq('role', 'worker');
  if (workersError) {
    console.error('Error fetching workers:', workersError);
    return [];
  }
  return workers;
}

const CreateTaskModal = ({ isOpen, setIsOpen, projectId, onTaskCreate, workersOnProject, onTaskCreatedLocally }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedToUserId, setAssignedToUserId] = useState(null);
  const [dueDate, setDueDate] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !description) {
      toast({ variant: "destructive", title: "Error", description: "Please fill title and description." });
      return;
    }
    const newTaskData = {
      projectId,
      title,
      description,
      status: 'Pending',
      assignedToUserId: assignedToUserId || null,
      dueDate: dueDate || null,
    };
    
    const createdTask = await onTaskCreate(newTaskData);

    if (createdTask) {
      onTaskCreatedLocally(createdTask);
      setTitle('');
      setDescription('');
      setAssignedToUserId(null);
      setDueDate('');
      setIsOpen(false);
    }
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
              <Textarea 
                id="taskDescription" 
                key="task-description-textarea"
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                className="col-span-3 bg-background/70" 
                placeholder="Detailed task instructions" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dueDate" className="text-right text-muted-foreground">Due Date</Label>
              <Input 
                id="dueDate" 
                type="date" 
                value={dueDate} 
                onChange={(e) => setDueDate(e.target.value)} 
                className="col-span-3 bg-background/70"
                min={new Date().toISOString().split('T')[0]} // No dates before today
              />
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

const EditTaskModal = ({ isOpen, setIsOpen, task, onTaskEdit, workersOnProject }) => {
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [assignedToUserId, setAssignedToUserId] = useState(task?.assigned_to_user_id || null);
  const [dueDate, setDueDate] = useState(task?.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '');
  const { toast } = useToast();

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setAssignedToUserId(task.assigned_to_user_id);
      setDueDate(task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '');
    }
  }, [task]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !description) {
      toast({ variant: "destructive", title: "Error", description: "Please fill title and description." });
      return;
    }
    onTaskEdit({
      id: task.id,
      title,
      description,
      assigned_to_user_id: assignedToUserId || null,
      due_date: dueDate || null,
    });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[525px] bg-card glassmorphism-card">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-tertiary">Edit Task</DialogTitle>
          <DialogDescription>Update the task details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editTaskTitle" className="text-right text-muted-foreground">Title</Label>
              <Input 
                id="editTaskTitle" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                className="col-span-3 bg-background/70" 
                placeholder="e.g., Install Fixtures" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editTaskDescription" className="text-right text-muted-foreground">Description</Label>
              <Textarea 
                id="editTaskDescription" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                className="col-span-3 bg-background/70" 
                placeholder="Detailed task instructions" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editDueDate" className="text-right text-muted-foreground">Due Date</Label>
              <Input 
                id="editDueDate" 
                type="date" 
                value={dueDate} 
                onChange={(e) => setDueDate(e.target.value)} 
                className="col-span-3 bg-background/70"
                min={new Date().toISOString().split('T')[0]} // No dates before today
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="editAssignedTo" className="text-right text-muted-foreground">Assign To</Label>
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
            <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default function ManagerTaskPage() {
  const { projectId } = useParams();
  const { tasks, addTask, getProjectById, fetchTasks } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [project, setProject] = useState(null);
  const [workersOnThisProject, setWorkersOnThisProject] = useState([]);
  const [projectTasks, setProjectTasks] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    // Fetch project details
    const fetchedProject = getProjectById(projectId);
    if (fetchedProject) {
      setProject(fetchedProject);
    }

    // Fetch workers assigned to this project (directo de Supabase)
    const fetchWorkers = async () => {
      const workers = await fetchAssignedWorkers(projectId);
      setWorkersOnThisProject(workers);
    };

    fetchWorkers();

  }, [projectId, getProjectById]);

  useEffect(() => {
    // Filter tasks whenever the global tasks list or projectId changes
    console.log("ManagerTaskPage: tasks, projectId, or fetchTasks changed.");
    console.log("ManagerTaskPage: Current global tasks state:", tasks);
    const tasksForProject = tasks.filter(task => String(task.project_id) === String(projectId));
    console.log("ManagerTaskPage: Filtered tasks for project:", tasksForProject);
    setProjectTasks(tasksForProject);
  }, [tasks, projectId, fetchTasks]);

  const getWorkerName = (userId) => {
    if (!userId) return <span className="italic text-muted-foreground">Unassigned</span>;
    const worker = workersOnThisProject.find(user => user.id === userId);
    return worker ? worker.name : <span className="italic text-red-500">Unknown Worker</span>;
  };

  const handleDeleteTask = async (taskId) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      // Update both local and global state
      setProjectTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
      await fetchTasks(); // Refresh global tasks state
      
      toast({
        title: "Task Deleted",
        description: "The task has been successfully deleted.",
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete the task. Please try again.",
      });
    }
  };

  const handleEditTask = async (taskId) => {
    const taskToEdit = projectTasks.find(task => task.id === taskId);
    if (taskToEdit) {
      setSelectedTask(taskToEdit);
      setIsEditModalOpen(true);
    }
  };

  const handleTaskEdit = async (updatedTaskData) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: updatedTaskData.title,
          description: updatedTaskData.description,
          assigned_to_user_id: updatedTaskData.assigned_to_user_id,
          due_date: updatedTaskData.due_date
        })
        .eq('id', updatedTaskData.id);

      if (error) throw error;

      // Update both local and global state
      setProjectTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === updatedTaskData.id ? { ...task, ...updatedTaskData } : task
        )
      );
      await fetchTasks(); // Refresh global tasks state

      toast({
        title: "Task Updated",
        description: "The task has been successfully updated.",
      });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update the task. Please try again.",
      });
    }
  };

  const handleMarkAsDone = async (taskId) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      // Update both local and global state
      setProjectTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
      await fetchTasks(); // Refresh global tasks state

      toast({
        title: "Task Completed",
        description: "The completed task has been removed from the list.",
      });
    } catch (error) {
      console.error('Error removing completed task:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove the completed task. Please try again.",
      });
    }
  };

  const handleTaskCreatedLocally = (newTask) => {
    setProjectTasks(prevTasks => [...prevTasks, newTask]);
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
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-gray-500">
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
        onTaskCreatedLocally={handleTaskCreatedLocally}
      />

      <EditTaskModal
        isOpen={isEditModalOpen}
        setIsOpen={setIsEditModalOpen}
        task={selectedTask}
        onTaskEdit={handleTaskEdit}
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
                <Card className={`glassmorphism-card h-full flex flex-col ${
                  task.status === 'Completed' ? 'bg-green-50/50 border-green-200' : ''
                }`}>
                  <CardHeader>
                    <CardTitle className={`text-xl ${
                      task.status === 'Completed' ? 'text-green-600' : 'text-primary'
                    }`}>
                      {task.title}
                    </CardTitle>
                    <CardDescription className={`${
                      task.status === 'Completed' ? 'text-green-600' : 'text-muted-foreground'
                    }`}>
                      Status: {task.status}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm mb-2">{task.description}</p>
                    <p className="text-sm flex items-center">
                      <User size={14} className={`mr-2 ${
                        task.status === 'Completed' ? 'text-green-600' : 'text-tertiary'
                      }`} /> 
                      <span className={`font-semibold ${
                        task.status === 'Completed' ? 'text-green-600' : 'text-muted-foreground'
                      }`}>Assigned to:</span>&nbsp; 
                      {getWorkerName(task.assigned_to_user_id)}
                    </p>
                  </CardContent>
                  <CardFooter className="border-t border-border/20 flex justify-end space-x-2 pt-4">
                    {task.status === 'Completed' ? (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="hover:bg-green-100 text-green-600"
                        onClick={() => handleMarkAsDone(task.id)}
                      >
                        <CheckCircle2 size={16} className="mr-1" /> Done
                      </Button>
                    ) : (
                      <>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="hover:bg-primary/10 text-primary"
                          onClick={() => handleEditTask(task.id)}
                        >
                          <Edit size={16} className="mr-1" /> Edit
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="hover:bg-destructive/10 text-destructive"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          <Trash2 size={16} className="mr-1" /> Delete
                        </Button>
                      </>
                    )}
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
