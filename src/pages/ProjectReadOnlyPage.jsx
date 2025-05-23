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
import { XCircle, PlusCircle, MinusCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ProjectReadOnlyPage() {
  const { id } = useParams();
  const { projects, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('info');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [projectResources, setProjectResources] = useState([]);
  const [resourceTypes, setResourceTypes] = useState([]);
  const [requestData, setRequestData] = useState({
    resources: [{ type: '', quantity: '' }],
    priority: 'medium',
    notes: ''
  });
  const [totalRequestCost, setTotalRequestCost] = useState(0);

  const project = projects.find(p => String(p.id) === String(id));
  
  useEffect(() => {
    if (project) {
      fetchProjectResources();
      fetchResourceTypes();
    } else {
        setLoading(false);
    }
  }, [id, project]);

  useEffect(() => {
    calculateTotalCost();
  }, [requestData.resources, resourceTypes]);

  if (!project) return <div className="p-8 text-center text-red-600">Project not found or you do not have access.</div>;

  const fetchProjectResources = async () => {
    try {
      const { data, error } = await supabase
        .from('project_resources')
        .select(`
          *,
          resource_types (
            name,
            unit
          )
        `)
        .eq('project_id', id);

      if (error) throw error;

      setProjectResources(data.map(resource => ({
        name: resource.resource_types.name,
        quantity: `${resource.quantity} ${resource.resource_types.unit}`,
        status: getResourceStatus(resource.quantity, resource.min_quantity)
      })));
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch project resources."
      });
    } finally {
      setLoading(false);
    }
  };

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
      // Create resource request
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

      // Create resource request items
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
      setTotalRequestCost(0); // Reset cost on successful submission
    } catch (error) {
      console.error('Error submitting request:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to submit resource request. Please try again later."
      });
    }
  };

  const calculateTotalCost = () => {
    let total = 0;
    requestData.resources.forEach(item => {
      const resourceType = resourceTypes.find(rt => String(rt.id) === String(item.type));
      if (resourceType && item.quantity) {
        total += parseFloat(item.quantity) * (resourceType.cost || 0);
      }
    });
    setTotalRequestCost(total);
  };

  const remainingBudget = (project.budget || 0) - (project.spent_budget || 0);
  const canAffordRequest = totalRequestCost <= remainingBudget;

  // Simulated data for demonstration
  const projectStats = {
    lastUpdated: '2024-03-20',
    totalVisits: 156,
    activeUsers: 23,
    completionRate: '85%'
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Map Section */}
          <div className="lg:col-span-2">
            <div className="relative h-[500px] md:h-[600px] rounded-2xl overflow-hidden shadow-2xl">
              <Maps
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={{
                  lat: parseFloat(project.latitude) || 4.8133,
                  lng: parseFloat(project.longitude) || -75.6967,
                }}
                zoom={12}
                mapId="5795a66c547e6becbb38a780"
              >
                <Marker position={{
                  lat: parseFloat(project.latitude),
                  lng: parseFloat(project.longitude),
                }} />
                <Circle
                  center={{
                    lat: parseFloat(project.latitude),
                    lng: parseFloat(project.longitude),
                  }}
                  radius={project.radius}
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
                  }}
                />
              </Maps>
            </div>

            {/* Project Statistics */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/80 backdrop-blur-xl rounded-xl p-4 shadow-lg border border-white/20">
                <div className="text-sm text-gray-500">Total Resources</div>
                <div className="text-lg font-semibold text-gray-700">{projectResources.length}</div>
                <div className="text-xs text-gray-400 mt-1">Different types</div>
              </div>
              <div className="bg-white/80 backdrop-blur-xl rounded-xl p-4 shadow-lg border border-white/20">
                <div className="text-sm text-gray-500">Low Stock</div>
                <div className="text-lg font-semibold text-red-600">
                  {projectResources.filter(r => r.status === 'low').length}
                </div>
                <div className="text-xs text-gray-400 mt-1">Need attention</div>
              </div>
              <div className="bg-white/80 backdrop-blur-xl rounded-xl p-4 shadow-lg border border-white/20">
                <div className="text-sm text-gray-500">Available</div>
                <div className="text-lg font-semibold text-green-600">
                  {projectResources.filter(r => r.status === 'available').length}
                </div>
                <div className="text-xs text-gray-400 mt-1">In good condition</div>
              </div>
              <div className="bg-white/80 backdrop-blur-xl rounded-xl p-4 shadow-lg border border-white/20">
                <div className="text-sm text-gray-500">Medium Stock</div>
                <div className="text-lg font-semibold text-yellow-600">
                  {projectResources.filter(r => r.status === 'medium').length}
                </div>
                <div className="text-xs text-gray-400 mt-1">Monitor closely</div>
              </div>
            </div>
          </div>

          {/* Project Info and Request Section */}
          <div className="lg:col-span-1 space-y-6">
            {/* Project Info Card */}
            <Card className="bg-white/80 backdrop-blur-xl shadow-2xl rounded-xl border border-white/20">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-800">{project.name}</CardTitle>
                <CardDescription className="text-sm text-gray-500">{project.locationName}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700 text-sm leading-relaxed">{project.description || 'No description provided.'}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Manager:</p>
                    <p className="font-medium text-gray-700">{project.manager?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Status:</p>
                    <Badge className="capitalize" variant="secondary">{project.status || 'N/A'}</Badge>
                  </div>
                  {project.budget != null && (
                    <div className="col-span-2">
                      <p className="text-gray-500">Project Budget:</p>
                      <p className="font-medium text-gray-700">${project.budget.toFixed(2)} USD</p>
                    </div>
                  )}
                  {project.spent_budget != null && ( // Display spent budget if available
                    <div className="col-span-2">
                      <p className="text-gray-500">Budget Spent:</p>
                      <p className="font-medium text-red-600">${project.spent_budget.toFixed(2)} USD</p>
                    </div>
                   )}
                   {project.budget != null && (
                    <div className="col-span-2">
                       <p className="text-gray-500">Remaining Budget:</p>
                       <p className={`font-medium ${remainingBudget < 0 ? 'text-red-600' : 'text-green-600'}`}>${remainingBudget.toFixed(2)} USD</p>
                    </div>
                   )}
                </div>
              </CardContent>
            </Card>

            {/* Existing Project Resources Card */}
            <Card className="bg-white/80 backdrop-blur-xl shadow-2xl rounded-xl border border-white/20">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-gray-800">Existing Resources</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center text-gray-500">Loading resources...</div>
                ) : projectResources.length === 0 ? (
                  <div className="text-center text-gray-500">No resources assigned to this project yet.</div>
                ) : (
                  <ul className="space-y-3">
                    {projectResources.map((resource, index) => (
                      <li key={index} className="flex justify-between items-center text-sm text-gray-700">
                        <span>{resource.name}</span>
                        <Badge variant={resource.status === 'low' ? 'destructive' : resource.status === 'medium' ? 'secondary' : 'default'} className="capitalize">
                          {resource.quantity}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Request Resources Card */}
            <Card className="bg-white/80 backdrop-blur-xl shadow-2xl rounded-xl border border-white/20">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl font-bold text-gray-800">Request Resources</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setShowRequestForm(!showRequestForm)}>
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
                >
                  <CardContent className="space-y-4">
                    <form onSubmit={handleRequestSubmit} className="space-y-4">
                      {requestData.resources.map((resource, index) => (
                        <div key={index} className="grid grid-cols-3 gap-2 items-center">
                          <div className="col-span-2">
                            <Label htmlFor={`resource-type-${index}`} className="sr-only">Resource Type</Label>
                            <Select
                              value={resource.type}
                              onValueChange={(value) => updateResource(index, 'type', value)}
                            >
                              <SelectTrigger id={`resource-type-${index}`}>
                                <SelectValue placeholder="Select resource" />
                              </SelectTrigger>
                              <SelectContent>
                                {resourceTypes.map(type => (
                                  <SelectItem key={type.id} value={type.id}>{`${type.name} (${type.unit})`}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                             <Label htmlFor={`resource-quantity-${index}`} className="sr-only">Quantity</Label>
                             <Input
                                id={`resource-quantity-${index}`}
                                type="number"
                                min="1"
                                value={resource.quantity}
                                onChange={(e) => updateResource(index, 'quantity', e.target.value)}
                                placeholder="Qty"
                             />
                          </div>
                         {requestData.resources.length > 1 && (
                           <Button type="button" variant="ghost" size="sm" onClick={() => removeResourceField(index)} className="col-span-1">
                              <MinusCircle className="h-4 w-4 text-red-600" />
                           </Button>
                         )}
                        </div>
                      ))}

                      <Button type="button" variant="outline" size="sm" onClick={addResourceField}>
                        <PlusCircle className="h-4 w-4 mr-2" /> Add Another Resource
                      </Button>

                      <div>
                        <Label htmlFor="priority">Priority</Label>
                        <Select
                          value={requestData.priority}
                          onValueChange={(value) => setRequestData({ ...requestData, priority: value })}
                        >
                          <SelectTrigger id="priority">
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
                        <Label htmlFor="notes">Notes (Optional)</Label>
                        <Textarea
                          id="notes"
                          value={requestData.notes}
                          onChange={(e) => setRequestData({ ...requestData, notes: e.target.value })}
                          placeholder="Add any relevant notes..."
                        />
                      </div>

                      {/* Cost and Budget Info */}
                      <div className="mt-4 p-4 bg-gray-100 rounded-md">
                         <div className="flex justify-between text-sm font-medium">
                            <span>Total Request Cost:</span>
                            <span>${totalRequestCost.toFixed(2)} USD</span>
                         </div>
                         {project.budget != null && (
                           <div className="flex justify-between text-sm font-medium mt-2">
                             <span>Remaining Project Budget:</span>
                             <span className={`${remainingBudget < 0 ? 'text-red-600' : 'text-green-600'}`}>${remainingBudget.toFixed(2)} USD</span>
                           </div>
                         )}
                         {!canAffordRequest && project.budget != null && (
                            <p className="text-red-600 text-xs mt-2">Warning: This request exceeds the remaining project budget.</p>
                         )}
                      </div>

                      <Button type="submit" className="w-full" disabled={!canAffordRequest && project.budget != null}>
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