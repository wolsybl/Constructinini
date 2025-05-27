import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Search, CheckCircle, XCircle, Clock, Package, DollarSign, Edit2, Plus, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';

export default function ResourceRequestsPage() {
  console.log('ResourceRequestsPage component rendered');
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
  const [isResourcePricesCollapsed, setIsResourcePricesCollapsed] = useState(true);

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
      console.log('=== Starting Status Update ===');
      console.log('Request ID:', requestId);
      console.log('New Status:', newStatus);

      // Find the request being updated from the local state
      const requestToUpdate = requests.find(req => req.id === requestId);
      console.log('Current Request State:', requestToUpdate);
      
      if (!requestToUpdate) {
        console.error('Request not found in local state');
        toast({
          variant: "destructive",
          title: "Error",
          description: "Request not found."
        });
        return;
      }

      // If approving or completing the request, perform budget check and update item statuses
      if (newStatus === 'approved' || newStatus === 'completed') {
        console.log('Processing approval/completion...');
        const project = requestToUpdate.projects;
        const requestedItems = requestToUpdate.resource_request_items;
        console.log('Project:', project);
        console.log('Requested Items:', requestedItems);

        // Calculate the total cost of requested items (only if status is approved)
        let requestCost = 0;
        // Only calculate cost and update budget if the request is moving TO 'approved'
        if (newStatus === 'approved' && requestToUpdate.status !== 'approved') {
            console.log('Calculating request cost...');
            if (requestedItems && requestedItems.length > 0) {
              requestCost = requestedItems.reduce((sum, item) => {
                const quantity = item.quantity ? parseFloat(item.quantity) : 0;
                const resourceType = resourceTypes.find(rt => rt.id === item.resource_type_id);
                const costPerUnit = resourceType?.cost ? parseFloat(resourceType.cost) : 0;

                console.log('Item calculation:', {
                  itemId: item.id,
                  quantity,
                  resourceType,
                  costPerUnit,
                  itemCost: quantity * costPerUnit
                });

                if (!isNaN(quantity) && quantity > 0 && !isNaN(costPerUnit)) {
                  return sum + (quantity * costPerUnit);
                } else {
                  console.warn('Invalid quantity or cost for item:', item, resourceType);
                  return sum;
                }
              }, 0);
            }
            console.log('Total request cost:', requestCost);

            const projectBudget = project?.budget ? parseFloat(project.budget) : null;
            const spentBudget = project?.spent_budget ? parseFloat(project.spent_budget) : 0;
            console.log('Budget check:', { projectBudget, spentBudget, requestCost });

            if (projectBudget !== null && !isNaN(projectBudget)) {
              if (spentBudget + requestCost > projectBudget) {
                console.error('Budget exceeded:', {
                  spentBudget,
                  requestCost,
                  total: spentBudget + requestCost,
                  budget: projectBudget
                });
                toast({
                  variant: "destructive",
                  title: "Approval Failed",
                  description: `Approving this request exceeds the project budget. Remaining: ${(projectBudget - spentBudget).toFixed(2)} USD. Request cost: ${requestCost.toFixed(2)} USD.`
                });
                return;
              }
            }

            if (project && project.id) {
              const newSpentBudget = (spentBudget || 0) + requestCost;
              console.log('Updating project budget:', {
                projectId: project.id,
                oldSpentBudget: spentBudget,
                newSpentBudget
              });

              const { error: updateBudgetError } = await supabase
                .from('projects')
                .update({ spent_budget: newSpentBudget })
                .eq('id', project.id);

              if (updateBudgetError) {
                console.error('Budget update failed:', updateBudgetError);
                toast({
                  variant: "destructive",
                  title: "Budget Update Failed",
                  description: "Failed to update project spent budget in database."
                });
                return;
              }
              console.log('Budget updated successfully');
            }
        }

        // Update status of associated resource_request_items
        // For both 'approved' and 'completed' status, items should be marked as 'approved'
        const newItemStatus = 'approved';
        console.log('Updating items status:', {
          requestId,
          newItemStatus,
          itemsCount: requestedItems?.length
        });

        const { error: updateItemsError } = await supabase
          .from('resource_request_items')
          .update({ status: newItemStatus })
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
        console.log('Items updated successfully');
      } else if (newStatus === 'rejected') {
        // Update status of associated resource_request_items to rejected
        console.log('Updating items status to rejected:', {
          requestId,
          itemsCount: requestToUpdate.resource_request_items?.length
        });

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
        console.log('Items updated to rejected successfully');
      }

      // Update the main request status
      console.log('Updating main request status:', {
        requestId,
        newStatus,
        oldStatus: requestToUpdate.status
      });

      const { error: updateStatusError } = await supabase
        .from('resource_requests')
        .update({ status: newStatus })
        .eq('id', requestId);

      if (updateStatusError) {
        console.error('Main request update failed:', updateStatusError);
        throw updateStatusError;
      }
      console.log('Main request updated successfully');

      // Update local state
      console.log('Updating local state...');
      setRequests(prevRequests => {
        const updatedRequests = prevRequests.map(request =>
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
        );
        console.log('New local state:', updatedRequests.find(r => r.id === requestId));
        return updatedRequests;
      });

      // Close modal and clear selected request
      setIsDetailsModalOpen(false);
      setSelectedRequest(null);

      // Show success message
      toast({
        title: "Status Updated",
        description: `Request status has been updated to ${newStatus}.`
      });

      console.log('=== Status Update Completed ===');

    } catch (error) {
      console.error('=== Status Update Failed ===', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update request status."
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
      case 'pending': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
      case 'approved': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'rejected': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      case 'completed': return 'bg-blue-100 dark:bg-gray-700 text-blue-700 dark:text-gray-400';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
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
        <AnimatePresence>
          {isOpen && (
            <motion.div
              key={request?.id || 'dialog'}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
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
                          onClick={() => {
                            console.log('Approve button clicked for request ID:', request.id);
                            handleStatusUpdate(request.id, 'approved');
                          }}
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
            </motion.div>
          )}
        </AnimatePresence>
      </Dialog>
    );
  };

  return (
    <div className="container mx-auto py-12 px-4 md:px-6">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row justify-between items-center mb-10 gap-4"
      >
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-tertiary animated-gradient-text">
          Resource Requests
        </h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <Card className="glassmorphism-card mb-10">
          <CardHeader className="flex flex-row items-center justify-between cursor-pointer" onClick={() => setIsResourcePricesCollapsed(!isResourcePricesCollapsed)}>
            <div>
              <CardTitle>Resource Prices</CardTitle>
              <CardDescription>Manage prices for available resources</CardDescription>
            </div>
            <div className="flex items-center">
               <Button
                onClick={(e) => { // Prevent click event from toggling collapse
                  e.stopPropagation();
                  setIsNewResourceModalOpen(true);
                }}
                className="bg-primary hover:bg-primary/90 mr-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Resource
              </Button>
              <motion.div
                animate={{ rotate: isResourcePricesCollapsed ? 0 : 180 }}
                transition={{ duration: 0.3 }}
              >
                 <ChevronDown className="h-5 w-5 text-muted-foreground" />
              </motion.div>
            </div>
          </CardHeader>
          {!isResourcePricesCollapsed && (
            <CardContent className="p-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {resourceTypes.map((resource) => (
                <Card key={resource.id} className="glassmorphism-card p-4 flex items-center justify-between hover:shadow-md transition-shadow duration-200">
                  <div className="flex-grow">
                    <h3 className="font-medium text-primary">{resource.name}</h3>
                    <p className="text-sm text-muted-foreground">{resource.unit}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-accent">${resource.cost || 0}</span>
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
                </Card>
              ))}
            </CardContent>
          )}
        </Card>

        <Card className="glassmorphism-card mb-10">
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

        {/* Scrollable container for requests list */}
        <div className="mb-8 max-h-[600px] overflow-y-auto pr-2 rounded-b-lg">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredRequests.map((request, index) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index, duration: 0.4 }}
              >
                <Card className={`glassmorphism-card h-full flex flex-col hover:shadow-xl hover:bg-white/10 dark:hover:bg-gray-800/10 transition-all duration-300 border-l-4 ${getStatusColor(request.status).replace('bg', 'border').replace('-100', '-500')}`}>
                  <CardHeader>
                    <CardTitle className="text-xl text-primary">{request.projects?.name}</CardTitle>
                    <CardDescription className="flex items-center text-muted-foreground">
                      <Package size={14} className="mr-1" /> Resource Request
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow p-6 space-y-3">
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
                  </CardContent>
                  <CardFooter className="flex justify-between items-center pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
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
                          className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50"
                          onClick={() => handleStatusUpdate(request.id, 'rejected')}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 text-white hover:bg-green-700"
                          onClick={() => {
                            console.log('Approve button clicked for request ID:', request.id);
                            handleStatusUpdate(request.id, 'approved');
                          }}
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