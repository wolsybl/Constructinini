import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Search, CheckCircle, XCircle, Clock, Package, DollarSign, Edit2, Plus } from 'lucide-react';
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
  const [resourceTypes, setResourceTypes] = useState([]);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [isNewResourceModalOpen, setIsNewResourceModalOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [newPrice, setNewPrice] = useState('');
  const [newResource, setNewResource] = useState({
    name: '',
    unit: '',
    cost: ''
  });

  useEffect(() => {
    fetchRequests();
    fetchResourceTypes();
  }, []);

  const fetchResourceTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('resource_types')
        .select('*')
        .order('name');

      if (error) throw error;
      setResourceTypes(data || []);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch resource types."
      });
    }
  };

  const handlePriceUpdate = async (resourceId, newPrice) => {
    try {
      const { error } = await supabase
        .from('resource_types')
        .update({ cost: parseFloat(newPrice) })
        .eq('id', resourceId);

      if (error) throw error;

      // Update local state
      setResourceTypes(resourceTypes.map(resource =>
        resource.id === resourceId
          ? { ...resource, cost: parseFloat(newPrice) }
          : resource
      ));

      toast({
        title: "Price Updated",
        description: "Resource price has been updated successfully."
      });

      setIsPriceModalOpen(false);
      setSelectedResource(null);
      setNewPrice('');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update resource price."
      });
    }
  };

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('resource_requests')
        .select(`
          *,
          profiles (name),
          projects (
            name,
            budget,
            spent_budget
          ),
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
      // Find the request being updated from the local state
      const requestToUpdate = requests.find(req => req.id === requestId);
      if (!requestToUpdate) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Request not found."
        });
        return;
      }

      // If approving the request, perform budget check
      if (newStatus === 'approved') {
        const project = requestToUpdate.projects;
        const requestedItems = requestToUpdate.resource_request_items;

        // Calculate the total cost of requested items
        let requestCost = 0;
        if (requestedItems && requestedItems.length > 0) {
          requestCost = requestedItems.reduce((sum, item) => {
            // Ensure item and resource_types and cost are available and are numbers
            const quantity = item.quantity ? parseFloat(item.quantity) : 0;
            const costPerUnit = item.resource_types?.cost ? parseFloat(item.resource_types.cost) : 0;
            if (!isNaN(quantity) && !isNaN(costPerUnit)) {
              return sum + (quantity * costPerUnit);
            } else {
              console.warn('Invalid quantity or cost for item:', item);
              return sum; // Skip invalid items
            }
          }, 0);
        }

        // Get project budget and spent budget
        const projectBudget = project?.budget ? parseFloat(project.budget) : null;
        const spentBudget = project?.spent_budget ? parseFloat(project.spent_budget) : 0;

        // Perform budget check if project has a budget set
        if (projectBudget !== null && !isNaN(projectBudget)) {
          if (spentBudget + requestCost > projectBudget) {
            toast({
              variant: "destructive",
              title: "Approval Failed",
              description: `Approving this request exceeds the project budget. Remaining: ${(projectBudget - spentBudget).toFixed(2)} USD. Request cost: ${requestCost.toFixed(2)} USD.`
            });
            return; // Stop here if budget is exceeded
          }
        }

        // If budget is not exceeded, update spent budget in the project
        if (project && project.id) {
          const newSpentBudget = spentBudget + requestCost;
          const { error: updateBudgetError } = await supabase
            .from('projects')
            .update({ spent_budget: newSpentBudget })
            .eq('id', project.id);

          if (updateBudgetError) {
            console.error('Error updating spent budget:', updateBudgetError);
            // Optionally, revert the request status update if budget update fails
            // For now, we'll just log and show an error, assuming status update might still be useful.
            toast({
              variant: "destructive",
              title: "Budget Update Failed",
              description: "Failed to update project spent budget in database."
            });
             // Decide if you want to return here or proceed with status update anyway
             // return; // Uncomment to stop if budget update fails
          }
           // Update local state for the project's spent budget
            setRequests(requests.map(req =>
              req.projects?.id === project.id
                ? { ...req, projects: { ...req.projects, spent_budget: newSpentBudget } }
                : req
            ));
        }
      }

      // Proceed with updating the request status
      const { error: updateStatusError } = await supabase
        .from('resource_requests')
        .update({ status: newStatus })
        .eq('id', requestId);

      if (updateStatusError) throw updateStatusError; // Throw this error to be caught below

      // Update local state for the request status
      setRequests(requests.map(request => 
        request.id === requestId 
          ? { ...request, status: newStatus } // Update only the status of the request
          : request
      ));

      toast({
        title: "Status Updated",
        description: `Request status has been updated to ${newStatus}.`
      });

      // Re-fetch requests to ensure data consistency across all requests if needed
      // fetchRequests(); // Optional: Uncomment if you need to fully refresh all data

    } catch (error) {
      console.error('Error updating request status or budget:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update request status or budget."
      });
    }
  };

  const handleCreateResource = async () => {
    try {
      if (!newResource.name || !newResource.unit || !newResource.cost) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please fill in all fields."
        });
        return;
      }

      const { data, error } = await supabase
        .from('resource_types')
        .insert([{
          name: newResource.name,
          unit: newResource.unit,
          cost: parseFloat(newResource.cost)
        }])
        .select();

      if (error) throw error;

      setResourceTypes([...resourceTypes, data[0]]);
      setNewResource({ name: '', unit: '', cost: '' });
      setIsNewResourceModalOpen(false);

      toast({
        title: "Success",
        description: "New resource type created successfully."
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create new resource type."
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

    // Calculate remaining budget
    const remainingBudget = request.projects?.budget != null 
      ? (request.projects.budget - (request.projects.spent_budget || 0)).toFixed(2) 
      : 'N/A';
    const budgetDisplay = request.projects?.budget != null ? `${request.projects.budget.toFixed(2)} USD` : 'Not set';
    const spentDisplay = request.projects?.spent_budget != null ? `${request.projects.spent_budget.toFixed(2)} USD` : '0.00 USD';

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

            {/* Add Budget Information */}
            {request.projects?.budget != null && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Project Budget</Label>
                  <div className="text-sm font-medium">{budgetDisplay}</div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Budget Spent</Label>
                  <div className="text-sm font-medium">{spentDisplay}</div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Remaining Budget</Label>
                  <div className={`text-sm font-medium ${parseFloat(remainingBudget) < 0 ? 'text-red-600' : 'text-green-600'}`}>{remainingBudget} USD</div>
                </div>
              </div>
            )}

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
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Resource Prices</CardTitle>
              <CardDescription>Manage prices for available resources</CardDescription>
            </div>
            <Button
              onClick={() => setIsNewResourceModalOpen(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Resource
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {resourceTypes.map((resource) => (
                <Card key={resource.id} className="glassmorphism-card">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">{resource.name}</h3>
                        <p className="text-sm text-muted-foreground">{resource.unit}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold">${resource.cost || 0}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedResource(resource);
                            setNewPrice(resource.cost?.toString() || '');
                            setIsPriceModalOpen(true);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

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
                      <span className="font-semibold text-muted-foreground">Project Budget:</span> {request.projects?.budget != null ? `${request.projects.budget.toFixed(2)} USD` : 'Not set'}
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

      {/* Price Update Modal */}
      <Dialog open={isPriceModalOpen} onOpenChange={setIsPriceModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update Resource Price</DialogTitle>
            <DialogDescription>
              Set the price for {selectedResource?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right">
                Price ($)
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsPriceModalOpen(false);
                setSelectedResource(null);
                setNewPrice('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handlePriceUpdate(selectedResource.id, newPrice)}
            >
              Update Price
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Resource Modal */}
      <Dialog open={isNewResourceModalOpen} onOpenChange={setIsNewResourceModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Resource</DialogTitle>
            <DialogDescription>
              Create a new resource type with its price
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={newResource.name}
                onChange={(e) => setNewResource({ ...newResource, name: e.target.value })}
                className="col-span-3"
                placeholder="e.g., Cement, Steel, etc."
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="unit" className="text-right">
                Unit
              </Label>
              <Input
                id="unit"
                value={newResource.unit}
                onChange={(e) => setNewResource({ ...newResource, unit: e.target.value })}
                className="col-span-3"
                placeholder="e.g., kg, m³, etc."
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cost" className="text-right">
                Price ($)
              </Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                min="0"
                value={newResource.cost}
                onChange={(e) => setNewResource({ ...newResource, cost: e.target.value })}
                className="col-span-3"
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsNewResourceModalOpen(false);
                setNewResource({ name: '', unit: '', cost: '' });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateResource}>
              Create Resource
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RequestDetailsModal
        request={selectedRequest}
        isOpen={isDetailsModalOpen}
        setIsOpen={setIsDetailsModalOpen}
      />
    </div>
  );
} 