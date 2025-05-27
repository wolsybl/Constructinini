import React, { useState, useEffect } from 'react';
import { Marker, Circle } from '@react-google-maps/api';
import Maps from '@/lib/Maps';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { XCircle, PlusCircle, MinusCircle, Package, MapPin, ListChecks } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

export default function ProjectReadOnlyPage() {
  const { id } = useParams();
  const { projects, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('info');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [projectResources, setProjectResources] = useState([]);
  const [approvedResources, setApprovedResources] = useState([]);
  const [resourceTypes, setResourceTypes] = useState([]);
  const [requestData, setRequestData] = useState({
    resources: [{ type: '', quantity: '' }],
    priority: 'medium',
    notes: ''
  });
  const [totalRequestCost, setTotalRequestCost] = useState(0);
  const [currentProject, setCurrentProject] = useState(null);
  const [calculatedSpentBudget, setCalculatedSpentBudget] = useState(0);
  const [isMapApiLoaded, setIsMapApiLoaded] = useState(false);

  const fetchResourceTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('resource_types')
        .select('*')
        .order('name');

      if (error) throw error;
      
      if (data) {
        setResourceTypes(data);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No resource types found. Please contact the administrator."
        });
      }
    } catch (error) {
      console.error('Error fetching resource types:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch resource types. Please try again later."
      });
    }
  };

  const calculateTotalCost = () => {
    let total = 0;
    if (requestData.resources && resourceTypes.length > 0) {
      requestData.resources.forEach(item => {
        const resourceType = resourceTypes.find(type => String(type.id) === String(item.type));
        const quantity = parseFloat(item.quantity);
        const costPerUnit = parseFloat(resourceType?.cost);

        if (resourceType && !isNaN(quantity) && quantity > 0 && !isNaN(costPerUnit)) {
          total += quantity * costPerUnit;
        }
      });
    }
    setTotalRequestCost(total);
  };

  const fetchProjectResources = async () => {
    // Implementation of fetchProjectResources
    // ... existing code ...
  };

  const fetchApprovedResources = async () => {
    try {
      setLoading(true);
      console.log('Fetching approved resources for project ID:', id);
      const { data, error } = await supabase
        .from('resource_request_items')
        .select(`
          quantity,
          status,
          resource_type_id,
          resource_types (name, unit),
          resource_requests (project_id)
        `)
        .eq('status', 'approved')
        .eq('resource_requests.project_id', id);

      if (error) throw error;

      console.log('Data received from Supabase for approved items:', data);
      console.log('Error fetching approved items:', error);

      const formattedData = data
        .filter(item => item.resource_requests && String(item.resource_requests.project_id) === String(id))
        .map(item => ({
          quantity: item.quantity,
          status: item.status,
          resource_type_id: item.resource_type_id,
          name: item.resource_types?.name,
          unit: item.resource_types?.unit
        }))
        .filter(item => item.name);

      console.log('Formatted data for approved items:', formattedData);

      setApprovedResources(formattedData || []);
    } catch (error) {
      console.error('Error fetching approved resources:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch approved resources."
      });
      setApprovedResources([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Code inside useEffect that calls these functions
    // ... existing code ...
  }, [id, resourceTypes, supabase, calculateTotalCost]);

  useEffect(() => {
    const foundProject = projects.find(p => String(p.id) === String(id));
    setCurrentProject(foundProject);
    if (foundProject) {
      fetchProjectResources();
      fetchApprovedResources();
      fetchResourceTypes();

      // Fetch manager details if manager_id exists
      if (foundProject.manager_id) {
        const fetchManager = async () => {
          try {
            const { data, error } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', foundProject.manager_id)
              .single();

            if (error) throw error;
            
            if (data) {
              setCurrentProject(prevProject => ({
                ...prevProject,
                manager: data // Add the manager's name to the project state
              }));
            }
          } catch (error) {
            console.error('Error fetching manager details:', error);
            // Optionally toast an error, but page should still load
          }
        };
        fetchManager();
      }

      const resourceItemsChannel = supabase
        .channel(`resource_request_items_all_changes`)
        .on('postgres_changes', { 
            event: '*',
            schema: 'public',
            table: 'resource_request_items',
          }, payload => {
            console.log('Resource item change received!', payload);
            fetchApprovedResources();
          }
        )
        .subscribe();

      const projectsChannel = supabase
        .channel(`projects:id=eq.${id}`)
        .on('postgres_changes', { 
            event: 'UPDATE',
            schema: 'public',
            table: 'projects',
            filter: `id=eq.${id}`
          }, payload => {
            console.log('Project change received!', payload);
            console.log('Received updated spent_budget:', payload.new?.spent_budget);
            if (payload.new) {
              setCurrentProject(prevProject => ({
                ...prevProject,
                ...payload.new,
                manager: prevProject?.manager || payload.new?.manager
              }));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(resourceItemsChannel);
        supabase.removeChannel(projectsChannel);
      };

    } else {
        setLoading(false);
    }
  }, [id, projects]);

  useEffect(() => {
    calculateTotalCost();
  }, [requestData.resources, resourceTypes]);

  useEffect(() => {
    // Calculate spent budget from approved resources
    console.log('Calculating spent budget...');
    console.log('Approved Resources:', approvedResources);
    console.log('Resource Types:', resourceTypes);
    console.log('Current Project for budget calculation:', currentProject);
    let spent = 0;
    if (approvedResources.length > 0 && resourceTypes.length > 0) {
      approvedResources.forEach(approvedItem => {
        console.log('Processing approved item:', approvedItem);
        const resourceType = resourceTypes.find(type => type.id === approvedItem.resource_type_id); // Assuming resource_type_id is available in approvedResources
        console.log('Found resource type:', resourceType);
        const quantity = parseFloat(approvedItem.quantity);
        const costPerUnit = parseFloat(resourceType?.cost);

        if (resourceType && !isNaN(quantity) && quantity > 0 && !isNaN(costPerUnit)) {
          spent += quantity * costPerUnit;
          console.log(`Item cost: ${quantity} * ${costPerUnit} = ${quantity * costPerUnit}. Current spent: ${spent}`);
        }
        else {
            console.log('Skipping item due to missing resource type or invalid data:', approvedItem, resourceType, quantity, costPerUnit);
        }
      });
    }
    setCalculatedSpentBudget(spent);
    console.log('Final calculated spent budget:', spent);
  }, [approvedResources, resourceTypes, currentProject]);

  if (!currentProject) return <div className="p-8 text-center text-red-600 dark:text-red-400">Project not found or you do not have access.</div>;

  const getResourceStatus = (quantity, minQuantity) => {
    if (quantity <= minQuantity * 0.3) return 'low';
    if (quantity <= minQuantity * 0.7) return 'medium';
    return 'available';
  };

  const addResourceField = () => {
    setRequestData({
      ...requestData,
      resources: [...requestData.resources, { type: '', quantity: '' }]
    });
  };

  const removeResourceField = (index) => {
    const newResources = requestData.resources.filter((_, i) => i !== index);
    setRequestData({
      ...requestData,
      resources: newResources
    });
  };

  const updateResource = (index, field, value) => {
    const newResources = requestData.resources.map((resource, i) => {
      if (i === index) {
        return { ...resource, [field]: value };
      }
      return resource;
    });
    setRequestData({
      ...requestData,
      resources: newResources
    });
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();

    if (!user?.id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to submit a request."
      });
      return;
    }

    try {
      const { data: request, error: requestError } = await supabase
        .from('resource_requests')
        .insert([{
          project_id: id,
          requester_id: user.id,
          priority: requestData.priority,
          status: 'pending',
          notes: requestData.notes
        }])
        .select()
        .single();

      if (requestError) throw requestError;

      const requestItems = requestData.resources.map(resource => ({
        request_id: request.id,
        resource_type_id: resource.type,
        quantity: resource.quantity,
        status: 'pending'
      }));

      const { error: itemsError } = await supabase
        .from('resource_request_items')
        .insert(requestItems);

      if (itemsError) throw itemsError;

      toast({
        title: "Success",
        description: "Resource request submitted successfully."
      });

      setShowRequestForm(false);
      setRequestData({
        resources: [{ type: '', quantity: '' }],
        priority: 'medium',
        notes: ''
      });
      setTotalRequestCost(0);
      fetchApprovedResources();
    } catch (error) {
      console.error('Error submitting request:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to submit resource request. Please try again later."
      });
    }
  };

  const remainingBudget = (currentProject?.budget || 0) - calculatedSpentBudget;
  const canAffordRequest = totalRequestCost <= remainingBudget;

  // Simulated data for demonstration
  const projectStats = {
    lastUpdated: '2024-03-20',
    totalVisits: 156,
    activeUsers: 23,
    completionRate: '85%'
  };

  // Check if project data is available and has coordinates
  const hasCoordinates = currentProject?.latitude != null && currentProject?.longitude != null;

  const handleMapLoaded = (loaded) => {
    setIsMapApiLoaded(loaded);
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Map Section */}
          <div className="lg:col-span-2">
            <div className="relative h-[500px] md:h-[600px] rounded-2xl overflow-hidden shadow-2xl border border-border/20">
              <Maps
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={hasCoordinates ? { lat: parseFloat(currentProject.latitude), lng: parseFloat(currentProject.longitude) } : { lat: 4.8133, lng: -75.6967 }}
                zoom={hasCoordinates ? 14 : 12}
                mapId="5795a66c547e6becbb38a780"
                mapLoaded={handleMapLoaded}
              >
                {/* Render Marker and Circle only if project data with coordinates is available AND Maps API is loaded */}
                {hasCoordinates && isMapApiLoaded && currentProject && (
                  <>
                    <Marker
                      position={{ lat: parseFloat(currentProject.latitude), lng: parseFloat(currentProject.longitude) }}
                      title={currentProject.name || "Project Location"}
                      options={{
                        optimized: true,
                        collisionBehavior: google.maps.CollisionBehavior.OPTIONAL_AND_HIDES_LOWER_PRIORITY
                      }}
                    />
                    <Circle
                      center={{ lat: parseFloat(currentProject.latitude), lng: parseFloat(currentProject.longitude) }}
                      radius={currentProject.radius || 100}
                      options={{
                        fillColor: '#007bff',
                        fillOpacity: 0.2,
                        strokeColor: '#007bff',
                        strokeOpacity: 0.6,
                        strokeWeight: 2,
                        clickable: false,
                        draggable: false,
                        editable: false,
                        visible: true,
                        zIndex: 1
                      }}
                    />
                  </>
                )}
              </Maps>
            </div>

            {/* Approved Resources List */}
            <Card className="glassmorphism-card mt-4">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-foreground">Approved Resources</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">Materials approved for this project.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center text-muted-foreground">Loading approved resources...</div>
                ) : approvedResources.length === 0 ? (
                  <div className="text-center text-muted-foreground">No approved resources for this project yet.</div>
                ) : (
                  <ul className="space-y-3">
                    {approvedResources.map((resource, index) => (
                      <li key={index} className="p-3 bg-secondary/30 dark:bg-secondary/50 rounded-md flex justify-between items-center border border-border/20">
                        <div className="flex items-center gap-2">
                           <Package size={16} className="text-green-600 dark:text-green-400"/>
                           <span className="text-foreground">{resource.name}</span>
                        </div>
                        <span className="font-medium text-foreground">{resource.quantity} {resource.unit}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Project Info and Request Section */}
          <div className="lg:col-span-1 space-y-6">
            {/* Project Info Card */}
            <Card className="glassmorphism-card">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-foreground">{currentProject.name}</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">{currentProject.locationName}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-foreground text-sm leading-relaxed">{currentProject.description || 'No description provided.'}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Manager:</p>
                    <p className="font-medium text-foreground">{currentProject.manager?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status:</p>
                    <Badge className="capitalize" variant="secondary">{currentProject.status || 'N/A'}</Badge>
                  </div>
                  {currentProject.budget != null && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Project Budget:</p>
                      <p className="font-medium text-foreground">${currentProject.budget.toFixed(2)} USD</p>
                    </div>
                  )}
                  {currentProject.spent_budget != null && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Budget Spent:</p>
                      <p className="font-medium text-red-600 dark:text-red-400">${calculatedSpentBudget.toFixed(2)} USD</p>
                    </div>
                   )}
                   {currentProject.budget != null && (
                    <div className="col-span-2">
                       <p className="text-muted-foreground">Remaining Budget:</p>
                       <p className={`font-medium ${(parseFloat(currentProject.budget) - calculatedSpentBudget) < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>${(parseFloat(currentProject.budget) - calculatedSpentBudget).toFixed(2)} USD</p>
                    </div>
                   )}
                </div>
              </CardContent>
            </Card>

            {/* Request Resources Card */}
            <Card className="glassmorphism-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl font-bold text-foreground">Request Resources</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setShowRequestForm(!showRequestForm)} className="bg-secondary/50 dark:bg-secondary/70 hover:bg-secondary/80 dark:hover:bg-secondary/90">
                  {showRequestForm ? 'Cancel' : 'New Request'}
                </Button>
              </CardHeader>
              <AnimatePresence>
              {showRequestForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <CardContent className="space-y-4">
                    <form onSubmit={handleRequestSubmit} className="space-y-4">
                      {requestData.resources.map((resource, index) => (
                        <div key={index} className="flex gap-2 items-center p-3 bg-background/50 dark:bg-background/70 rounded-md border border-border/20">
                          <div className="flex-grow grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor={`resource-type-${index}`} className="text-sm text-muted-foreground">Resource Type</Label>
                              <Select
                                value={resource.type}
                                onValueChange={(value) => updateResource(index, 'type', value)}
                              >
                                <SelectTrigger id={`resource-type-${index}`} className="bg-background/70 dark:bg-background/50">
                                  <SelectValue placeholder="Select resource" />
                                </SelectTrigger>
                                <SelectContent>
                                  {resourceTypes.map(type => (
                                    <SelectItem key={type.id} value={String(type.id)}>{`${type.name} (${type.unit})`}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor={`quantity-${index}`} className="text-sm text-muted-foreground">Quantity</Label>
                              <Input
                                id={`quantity-${index}`}
                                type="number"
                                min="1"
                                value={resource.quantity}
                                onChange={(e) => updateResource(index, 'quantity', e.target.value)}
                                placeholder="Qty"
                                className="bg-background/70 dark:bg-background/50"
                              />
                            </div>
                          </div>
                         {requestData.resources.length > 1 && (
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeResourceField(index)} className="text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/30">
                               <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}

                      <Button type="button" variant="outline" size="sm" onClick={addResourceField} className="w-full bg-secondary/50 dark:bg-secondary/70 hover:bg-secondary/80 dark:hover:bg-secondary/90">
                        <PlusCircle className="h-4 w-4 mr-2" /> Add Another Resource
                      </Button>

                      <div>
                        <Label htmlFor="priority" className="text-sm text-muted-foreground">Priority</Label>
                        <Select
                          value={requestData.priority}
                          onValueChange={(value) => setRequestData({ ...requestData, priority: value })}
                        >
                          <SelectTrigger id="priority" className="bg-background/70 dark:bg-background/50">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="notes" className="text-sm text-muted-foreground">Notes (Optional)</Label>
                        <Textarea
                          id="notes"
                          value={requestData.notes}
                          onChange={(e) => setRequestData({ ...requestData, notes: e.target.value })}
                          placeholder="Add any relevant notes..."
                          className="bg-background/70 dark:bg-background/50"
                          rows={3}
                        />
                      </div>

                      {/* Cost and Budget Info */}
                      <div className="mt-4 p-4 bg-secondary/50 dark:bg-secondary/70 rounded-md">
                         <div className="flex justify-between text-sm font-medium text-foreground">
                            <span>Total Request Cost:</span>
                            <span>${totalRequestCost.toFixed(2)} USD</span>
                         </div>
                         {currentProject.budget != null && (
                           <div className="flex justify-between text-sm font-medium mt-2 text-foreground">
                             <span>Remaining Project Budget:</span>
                             <span className={`${remainingBudget < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>${remainingBudget.toFixed(2)} USD</span>
                           </div>
                         )}
                         {!canAffordRequest && currentProject.budget != null && (
                            <p className="text-red-600 dark:text-red-400 text-xs mt-2">Warning: This request exceeds the remaining project budget.</p>
                         )}
                      </div>

                      <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={!canAffordRequest && currentProject.budget != null}>
                        Submit Request
                      </Button>
                    </form>
                  </CardContent>
                </motion.div>
              )}
              </AnimatePresence>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}