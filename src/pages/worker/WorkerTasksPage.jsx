import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { ListChecks, Clock, CheckCircle2, AlertCircle, Camera, Upload, Calendar, MapPin, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';
import { format } from 'date-fns';
import { fetchTaskComments, createTaskComment } from '@/services/dataService';

export default function WorkerTasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const { toast } = useToast();
  const [commentInputs, setCommentInputs] = useState({});
  const [postingComment, setPostingComment] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const { data: assignment, error: assignmentError } = await supabase
        .from('project_assignments')
        .select('project_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (assignmentError) throw assignmentError;
      if (!assignment) {
        setTasks([]);
        setLoading(false);
        return;
      }

      const { data: userTasks, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          projects (
            name,
            location_name
          )
        `)
        .eq('assigned_to_user_id', user.id)
        .eq('project_id', assignment.project_id)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      const tasksWithComments = await Promise.all((userTasks || []).map(async task => {
        const comments = await fetchTaskComments(task.id);
        return { ...task, comments: comments || [] };
      }));

      setTasks(tasksWithComments || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) fetchTasks();
  }, [user]);

  const handlePhotoUpload = async (file, taskId) => {
    try {
      if (!file) return;

      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${taskId}/${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `tasks/${fileName}`;

      // Upload the file to Supabase Storage
      const { data, error } = await supabase.storage
        .from('tasks_photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        throw new Error(error.message);
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('tasks_photos')
        .getPublicUrl(filePath);

      // Update the task with the photo URL
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ 
          completion_photo_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (updateError) {
        console.error('Error updating task with photo URL:', updateError);
        throw new Error(updateError.message);
      }

      // Refresh the tasks list
      await fetchTasks();
      toast({
        title: "Photo uploaded successfully",
        description: "The task has been updated with the new photo.",
      });

    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        variant: "destructive",
        title: "Error uploading photo",
        description: error.message || "Failed to upload photo. Please try again.",
      });
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'In Progress':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'Pending':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <ListChecks className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCommentInputChange = (taskId, text) => {
    setCommentInputs(prev => ({ ...prev, [taskId]: text }));
  };

  const handlePostComment = async (task) => {
    const commentText = commentInputs[task.id]?.trim();
    if (!commentText) return;
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
        setTasks(prevTasks =>
          prevTasks.map(prevTask =>
            prevTask.id === task.id
              ? { ...prevTask, comments: [...prevTask.comments, { ...newComment, authorName: user.name }] }
              : prevTask
          )
        );
        setCommentInputs(prev => ({ ...prev, [task.id]: '' }));
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center h-64"
        >
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading tasks...</p>
          </div>
        </motion.div>
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
          My Tasks
        </h1>
        <p className="text-muted-foreground mt-1">
          View and manage your assigned tasks
        </p>
      </motion.div>

      <AnimatePresence>
        <div className="grid gap-6">
          {tasks.length > 0 ? (
            tasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card className="glassmorphism-card hover:shadow-lg transition-shadow duration-300">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl">{task.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            {task.projects?.name || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(task.status)}
                        <Badge variant="secondary" className={getStatusColor(task.status)}>
                          {task.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">{task.description || 'No description provided'}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
                      </span>
                    </div>
                    <div className="flex justify-end">
                      {task.status !== 'Completed' ? (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="hover:bg-primary hover:text-primary-foreground transition-colors"
                              onClick={() => setSelectedTask(task)}
                              disabled={uploading}
                            >
                              {task.completion_photo_url ? (
                                <><Upload className="h-4 w-4 mr-2" /> Replace Photo</>
                              ) : (
                                <><Camera className="h-4 w-4 mr-2" /> Complete Task</>
                              )}
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{task.completion_photo_url ? 'Replace Completion Photo' : 'Complete Task: ' + task.title}</DialogTitle>
                              <DialogDescription>
                                {task.completion_photo_url ? 'Upload a new photo to replace the current one for this task.' : 'Upload a photo to mark this task as completed. The photo will be used as proof of completion.'}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="mt-4">
                              <div className="flex flex-col items-center gap-4">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handlePhotoUpload(e.target.files[0], task.id)}
                                  className="block w-full text-sm text-slate-500
                                    file:mr-4 file:py-2 file:px-4
                                    file:rounded-full file:border-0
                                    file:text-sm file:font-semibold
                                    file:bg-primary file:text-primary-foreground
                                    hover:file:bg-primary/90"
                                  disabled={uploading}
                                />
                                {uploading && (
                                  <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-sm text-muted-foreground"
                                  >
                                    Uploading photo...
                                  </motion.p>
                                )}
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      ) : task.completion_photo_url ? (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="hover:bg-primary hover:text-primary-foreground transition-colors"
                              onClick={() => setSelectedPhoto(task.completion_photo_url)}
                            >
                              View Photo
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-[90vw] w-full md:max-w-4xl p-0 overflow-hidden">
                            <DialogHeader className="p-6 pb-2">
                              <DialogTitle>Task Completion Photo</DialogTitle>
                              <DialogDescription>
                                Photo submitted for task completion
                              </DialogDescription>
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
                      ) : null}
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
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="glassmorphism-card">
                <CardContent className="py-8">
                  <p className="text-center text-muted-foreground">
                    No tasks assigned to you at the moment.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </AnimatePresence>
    </div>
  );
} 