import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, User, Camera, AlertCircle, RefreshCcw, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { fetchTaskComments, createTaskComment } from '@/services/dataService';

export default function ManagerPendingTasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const { toast } = useToast();
  const [commentInputs, setCommentInputs] = useState({});
  const [postingComment, setPostingComment] = useState(false);

  const fetchPendingTasks = useCallback(async () => {
    if (!user?.id) {
      console.log('fetchPendingTasks: No user ID, returning.');
      setTasks([]);
      setLoading(false);
      return;
    }
    console.log('fetchPendingTasks: Fetching for user ID:', user.id);
    setLoading(true);
    try {
      // Get projects managed by this user directly from DB
      console.log('fetchPendingTasks: Fetching projects managed by user...');
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id')
        .eq('manager_id', user.id);
      
      if (projectsError) {
        console.error('fetchPendingTasks: Error fetching projects:', projectsError);
        throw projectsError;
      }
      
      const projectIds = (projects || []).map(p => p.id);
      console.log('fetchPendingTasks: Managed project IDs:', projectIds);

      if (projectIds.length === 0) {
        console.log('fetchPendingTasks: No managed projects found.');
        setTasks([]);
        setLoading(false);
        return;
      }

      // Get pending tasks with photo for these projects (simplified query)
      console.log('fetchPendingTasks: Fetching pending task IDs with photos for projects:', projectIds);
      const { data: pendingTasksIds, error: tasksError } = await supabase
        .from('tasks')
        .select('id') // Only select IDs initially
        .in('project_id', projectIds)
        .eq('status', 'Pending')
        .not('completion_photo_url', 'is', null);

      if (tasksError) {
        console.error('fetchPendingTasks: Error fetching task IDs:', tasksError);
        throw tasksError;
      }
      
      const taskIds = (pendingTasksIds || []).map(t => t.id);
      console.log('fetchPendingTasks: Found task IDs:', taskIds);

      if (taskIds.length === 0) {
        console.log('fetchPendingTasks: No matching task IDs found.');
        setTasks([]);
        setLoading(false);
        return;
      }

      // Now fetch full task data including relations for the found IDs
      console.log('fetchPendingTasks: Fetching full task data for IDs:', taskIds);
      const { data: fullPendingTasks, error: fullTasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          profiles:assigned_to_user_id (
            name,
            email
          ),
          projects (
            name,
            location_name
          )
        `)
        .in('id', taskIds) // Filter by the IDs found in the first query
        .order('created_at', { ascending: false });

      if (fullTasksError) {
        console.error('fetchPendingTasks: Error fetching full task data:', fullTasksError);
        throw fullTasksError;
      }

      // Fetch comments for each task
      const tasksWithComments = await Promise.all((fullPendingTasks || []).map(async task => {
        const comments = await fetchTaskComments(task.id);
        return { ...task, comments: comments || [] };
      }));

      console.log('fetchPendingTasks: Full pending tasks data with comments:', tasksWithComments);
      setTasks(tasksWithComments || []);
    } catch (error) {
      console.error('fetchPendingTasks: Caught error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch pending tasks. Please try again.",
      });
      setTasks([]);
    } finally {
      setLoading(false);
      console.log('fetchPendingTasks: Loading finished.');
    }
  }, [user, toast]);

  useEffect(() => {
    fetchPendingTasks();
  }, [fetchPendingTasks]);

  const handleApprove = async (taskId) => {
    setApproving(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'Completed' })
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: "Task Approved",
        description: "The task has been marked as completed.",
      });
      fetchPendingTasks();
    } catch (error) {
      console.error('Error approving task:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to approve the task. Please try again.",
      });
    } finally {
      setApproving(false);
    }
  };

  const handleCommentInputChange = (taskId, text) => {
    setCommentInputs(prev => ({ ...prev, [taskId]: text }));
  };

  const handlePostComment = async (task) => {
    const commentText = commentInputs[task.id]?.trim();
    if (!commentText) return; // Don't post empty comments
    if (!user?.id) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to post a comment." });
      return;
    }
    setPostingComment(true);
    try {
      const newComment = await createTaskComment({
        task_id: task.id,
        user_id: user.id,
        content: commentText,
      });

      if (newComment) {
        // Optimistically update the task's comments locally
        setTasks(prevTasks =>
          prevTasks.map(prevTask =>
            prevTask.id === task.id
              ? { ...prevTask, comments: [...prevTask.comments, { ...newComment, authorName: user.name }] }
              : prevTask
          )
        );
        setCommentInputs(prev => ({ ...prev, [task.id]: '' })); // Clear the input
        toast({ title: "Comment Posted", description: "Your comment has been added." });
      }

    } catch (error) {
      console.error('Error posting comment:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to post comment. Please try again.",
      });
    } finally {
      setPostingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading pending tasks...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text bg-gradient-to-r from-primary to-tertiary">
            Pending Tasks for Approval
          </h1>
          <p className="text-muted-foreground mt-1">Review and approve tasks completed by your workers.</p>
        </div>
        <Button variant="outline" onClick={fetchPendingTasks} disabled={loading}>
          <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </motion.div>

      <AnimatePresence>
        <div className="grid gap-6">
          {tasks.length > 0 ? (
            tasks.map((task, index) => (
              <motion.div key={task.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3, delay: index * 0.1 }}>
                <Card className="glassmorphism-card hover:shadow-lg transition-shadow duration-300">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl">{task.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">{task.projects?.name || 'N/A'}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{task.profiles?.name || 'N/A'}</span>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending Review</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">{task.description || 'No description provided'}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <Calendar className="h-4 w-4" />
                      <span>Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}</span>
                    </div>
                    <div className="flex gap-4 items-center">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="hover:bg-primary hover:text-primary-foreground transition-colors">
                            <Camera className="h-4 w-4 mr-2" />View Photo
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-[90vw] w-full md:max-w-4xl p-0 overflow-hidden">
                          <DialogHeader className="p-6 pb-2">
                            <DialogTitle>Task Completion Photo</DialogTitle>
                            <DialogDescription>Photo submitted by worker for this task.</DialogDescription>
                          </DialogHeader>
                          <div className="relative w-full aspect-[4/3] md:aspect-[16/9] bg-black/5">
                            <motion.img
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.3 }}
                              src={task.completion_photo_url}
                              alt="Task completion"
                              className="absolute inset-0 w-full h-full object-contain"
                            />
                          </div>
                          <div className="p-6 pt-2">
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() => window.open(task.completion_photo_url, '_blank')}
                            >
                              Open in New Tab
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button 
                        variant="success" 
                        size="sm" 
                        disabled={approving} 
                        onClick={() => handleApprove(task.id)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        Approve Task
                      </Button>
                    </div>

                    {/* Comment Section */}
                    <div className="mt-6 pt-4 border-t border-border/20">
                      <h4 className="text-md font-semibold mb-3 text-muted-foreground">Comments</h4>
                      <div className="space-y-4">
                        {task.comments && task.comments.length > 0 ? (
                          task.comments.map(comment => (
                            <div
                              key={comment.id}
                              className="p-3 rounded-lg shadow-sm backdrop-filter backdrop-blur-lg bg-white/10 border border-white/20"
                              style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                                backdropFilter: 'blur(10px)',
                                WebkitBackdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                              }}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-bold text-accent">{comment.authorName}</span>
                                <span className="text-xs text-muted-foreground">{format(new Date(comment.created_at), 'PPpp')}</span>
                              </div>
                              <p className="text-sm text-foreground/80">{comment.content}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground italic">No comments yet.</p>
                        )}
                      </div>

                      {/* New Comment Input */}
                      <div className="mt-4 flex gap-2">
                        <Input
                          placeholder="Add a comment..."
                          value={commentInputs[task.id] || ''}
                          onChange={(e) => handleCommentInputChange(task.id, e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handlePostComment(task);
                            }
                          }}
                          className="flex-grow bg-background/70"
                          disabled={postingComment}
                        />
                        <Button
                          onClick={() => handlePostComment(task)}
                          size="icon"
                          className="bg-primary hover:bg-primary/90 text-primary-foreground"
                          disabled={postingComment || !commentInputs[task.id]?.trim()}
                        >
                          {postingComment ? (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="w-4 h-4 border-2 border-t-transparent border-primary-foreground rounded-full"
                            ></motion.div>
                          ) : (
                            <Send size={16} />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
              <Card className="glassmorphism-card">
                <CardContent className="py-8">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No pending tasks to review at the moment.</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </AnimatePresence>
    </div>
  );
} 