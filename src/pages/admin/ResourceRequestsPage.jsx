import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Search, CheckCircle, XCircle, Clock, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';

export default function ResourceRequestsPage() {
  const { toast } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

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
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
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
      const { error } = await supabase
        .from('resource_requests')
        .update({ status: newStatus })
        .eq('id', requestId);

      if (error) throw error;

      // Update local state
      setRequests(requests.map(request => 
        request.id === requestId 
          ? { ...request, status: newStatus }
          : request
      ));

      toast({
        title: "Status Updated",
        description: `Request status has been updated to ${newStatus}.`
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update request status."
      });
    }
  };

  const filteredRequests = requests.filter(request => 
    request.projects?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-tertiary">
          Resource Requests
        </h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <Card className="glassmorphism-card mb-8">
          <CardHeader>
            <CardTitle>Filter Requests</CardTitle>
            <CardDescription>Search requests by project, requester, or status.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-grow">
              <Input 
                type="search" 
                placeholder="Search requests..." 
                className="pl-10 bg-background/70" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredRequests.map((request, index) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index + 0.3, duration: 0.4 }}
            >
              <Card className="glassmorphism-card h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="text-xl text-primary">{request.projects?.name}</CardTitle>
                  <CardDescription className="flex items-center text-muted-foreground">
                    <Package size={14} className="mr-1" /> Resource Request
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="font-semibold text-muted-foreground">Requester:</span> {request.profiles?.name}
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold text-muted-foreground">Priority:</span> {request.priority}
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold text-muted-foreground">Status:</span>
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold text-muted-foreground">Requested Items:</span> {request.resource_request_items?.length}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between items-center pt-4 border-t border-gray-200/50">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedRequest(request);
                      setIsDetailsModalOpen(true);
                    }}
                  >
                    View Details
                  </Button>
                  {request.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-red-50 text-red-600 hover:bg-red-100"
                        onClick={() => handleStatusUpdate(request.id, 'rejected')}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-600 text-white hover:bg-green-700"
                        onClick={() => handleStatusUpdate(request.id, 'approved')}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>

        {filteredRequests.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <Package size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-xl">No resource requests found.</p>
            {searchTerm && (
              <p className="text-muted-foreground">Try adjusting your search criteria.</p>
            )}
          </motion.div>
        )}
      </motion.div>

      <RequestDetailsModal
        request={selectedRequest}
        isOpen={isDetailsModalOpen}
        setIsOpen={setIsDetailsModalOpen}
      />
    </div>
  );
} 