import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Search, Package, CheckCircle, XCircle, Clock, Users, Building2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';

export default function AdminDashboardPage() {
  const { toast } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0
  });

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('resource_requests')
        .select(`
          *,
          profiles (name),
          projects (name),
          resource_request_items (
            *,
            resource_types (name, unit)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRequests(data || []);

      // Calculate stats
      const total = data?.length || 0;
      const pending = data?.filter(r => r.status === 'pending').length || 0;
      const approved = data?.filter(r => r.status === 'approved').length || 0;
      const rejected = data?.filter(r => r.status === 'rejected').length || 0;

      setStats({
        totalRequests: total,
        pendingRequests: pending,
        approvedRequests: approved,
        rejectedRequests: rejected
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch resource requests."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (requestId, newStatus) => {
    try {
      // Find the request being updated from the local state to get the old status
      const requestToUpdate = requests.find(req => req.id === requestId);
      if (!requestToUpdate) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Request not found."
        });
        return;
      }

      const oldStatus = requestToUpdate.status;

      // If approving or completing the request, update item statuses
      if (newStatus === 'approved' || newStatus === 'completed') {
        // Update status of associated resource_request_items to approved
        const { error: updateItemsError } = await supabase
          .from('resource_request_items')
          .update({ status: 'approved' })
          .eq('request_id', requestId);

        if (updateItemsError) {
          console.error('Items update failed:', updateItemsError);
          toast({
            variant: "destructive",
            title: "Error",
            description: `Failed to update item statuses for request ${requestId}.`
          });
          return;
        }
      } else if (newStatus === 'rejected') {
        // Update status of associated resource_request_items to rejected
        const { error: updateItemsError } = await supabase
          .from('resource_request_items')
          .update({ status: 'rejected' })
          .eq('request_id', requestId);

        if (updateItemsError) {
          console.error('Items update failed:', updateItemsError);
          toast({
            variant: "destructive",
            title: "Error",
            description: `Failed to update item statuses for request ${requestId}.`
          });
          return;
        }
      }

      // Update the main request status in the database
      const { error } = await supabase
        .from('resource_requests')
        .update({ status: newStatus })
        .eq('id', requestId);

      if (error) throw error;

      // Update local state
      setRequests(requests.map(request => 
        request.id === requestId 
          ? {
              ...request,
              status: newStatus,
              resource_request_items: request.resource_request_items.map(item => ({
                ...item,
                status: newStatus === 'rejected' ? 'rejected' : 'approved'
              }))
            }
          : request
      ));

      // Update stats based on status transition
      setStats(prev => {
        const updatedStats = { ...prev };
        
        // Decrement old status count
        if (oldStatus === 'pending') updatedStats.pendingRequests--;
        else if (oldStatus === 'approved') updatedStats.approvedRequests--;
        else if (oldStatus === 'rejected') updatedStats.rejectedRequests--;

        // Increment new status count
        if (newStatus === 'pending') updatedStats.pendingRequests++;
        else if (newStatus === 'approved') updatedStats.approvedRequests++;
        else if (newStatus === 'rejected') updatedStats.rejectedRequests++;
        // Note: 'completed' requests don't affect the visible stats (pending, approved, rejected)

        return updatedStats;
      });

      // Close the modal after successful update
      setIsDetailsModalOpen(false);
      setSelectedRequest(null); // Clear selected request

      toast({
        title: "Status Updated",
        description: `Request status has been updated to ${newStatus}.`
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update request status."
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'approved': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const RequestDetailsModal = ({ request, isOpen, setIsOpen }) => {
    if (!request) return null;

    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px] bg-card glassmorphism-card">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-tertiary">
              Request Details
            </DialogTitle>
            <DialogDescription>
              Review and manage resource request details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Project</Label>
                <div className="text-sm font-medium">{request.projects?.name}</div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Requester</Label>
                <div className="text-sm font-medium">{request.profiles?.name}</div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Priority</Label>
                <div className="text-sm font-medium capitalize">{request.priority}</div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Status</Label>
                <div className={`text-sm font-medium px-2 py-1 rounded-full inline-block ${getStatusColor(request.status)}`}>
                  {request.status}
                </div>
              </div>
            </div>

            <div>
              <Label className="text-sm text-muted-foreground">Requested Resources</Label>
              <div className="mt-2 space-y-2">
                {request.resource_request_items?.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-white/60 rounded-lg">
                    <div>
                      <div className="font-medium">{item.resource_types?.name}</div>
                      <div className="text-sm text-muted-foreground">{item.quantity} {item.resource_types?.unit}</div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                      {item.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {request.notes && (
              <div>
                <Label className="text-sm text-muted-foreground">Notes</Label>
                <div className="mt-1 p-2 bg-white/60 rounded-lg text-sm">
                  {request.notes}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              {request.status === 'pending' && (
                <>
                  <Button
                    variant="outline"
                    className="bg-red-50 text-red-600 hover:bg-red-100"
                    onClick={() => handleStatusUpdate(request.id, 'rejected')}
                  >
                    <XCircle className="mr-2 h-4 w-4" /> Reject
                  </Button>
                  <Button
                    className="bg-green-600 text-white hover:bg-green-700"
                    onClick={() => handleStatusUpdate(request.id, 'approved')}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" /> Approve
                  </Button>
                </>
              )}
              {request.status === 'approved' && (
                <Button
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  onClick={() => handleStatusUpdate(request.id, 'completed')}
                >
                  <CheckCircle className="mr-2 h-4 w-4" /> Mark as Completed
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4"
      >
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-gray-600">
          Admin Dashboard
        </h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8"
      >
        <Card className="glassmorphism-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRequests}</div>
            <p className="text-xs text-muted-foreground">All time resource requests</p>
          </CardContent>
        </Card>

        <Card className="glassmorphism-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingRequests}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card className="glassmorphism-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Requests</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approvedRequests}</div>
            <p className="text-xs text-muted-foreground">Successfully approved</p>
          </CardContent>
        </Card>

        <Card className="glassmorphism-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected Requests</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rejectedRequests}</div>
            <p className="text-xs text-muted-foreground">Declined requests</p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <Card className="glassmorphism-card mb-8">
          <CardHeader>
            <CardTitle>Recent Resource Requests</CardTitle>
            <CardDescription>Latest resource requests from projects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {requests.map((request, index) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index + 0.4, duration: 0.4 }}
                  className="flex items-center justify-between p-4 bg-white/60 rounded-lg hover:bg-white/80 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{request.projects?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Requested by {request.profiles?.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                      {request.status}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover:bg-primary/10 text-primary"
                      onClick={() => {
                        setSelectedRequest(request);
                        setIsDetailsModalOpen(true);
                      }}
                    >
                      View Details
                    </Button>
                  </div>
                </motion.div>
              ))}

              {requests.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-8"
                >
                  <Package size={48} className="mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-xl">No resource requests found.</p>
                </motion.div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <RequestDetailsModal
        request={selectedRequest}
        isOpen={isDetailsModalOpen}
        setIsOpen={setIsDetailsModalOpen}
      />
    </div>
  );
} 