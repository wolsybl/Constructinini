import React, { useState, useEffect } from 'react';
import { Marker, Circle } from '@react-google-maps/api';
import Maps from '@/lib/Maps';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';

export default function WorkerSiteViewPage() {
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

  const project = projects.find(p => String(p.id) === String(id));
  if (!project) return <div className="p-8 text-center">Project not found.</div>;

  useEffect(() => {
    fetchProjectResources();
    fetchResourceTypes();
  }, [id]);

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
    } catch (error) {
      console.error('Error submitting request:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit resource request. Please try again later."
      });
    }
  };

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

          {/* Info Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20">
              <div className="flex border-b border-gray-200/50">
                <button
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                    activeTab === 'info'
                      ? 'text-blue-600 border-b-2 border-blue-500 bg-blue-50/50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                  }`}
                  onClick={() => setActiveTab('info')}
                >
                  Project Info
                </button>
                <button
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                    activeTab === 'details'
                      ? 'text-blue-600 border-b-2 border-blue-500 bg-blue-50/50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                  }`}
                  onClick={() => setActiveTab('details')}
                >
                  Details
                </button>
              </div>
              
              <div className="p-6">
                {activeTab === 'info' ? (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                      <div className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-lg text-gray-700 select-none shadow-sm">
                        {project.name}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                      <div className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-lg text-gray-700 select-none shadow-sm">
                        {project.description}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Location Name</label>
                      <div className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-lg text-gray-700 select-none shadow-sm">
                        {project.locationName}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Latitude</label>
                        <div className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-lg text-gray-700 select-none shadow-sm">
                          {project.latitude}
                        </div>
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Longitude</label>
                        <div className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-lg text-gray-700 select-none shadow-sm">
                          {project.longitude}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Manager</label>
                      <div className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-lg text-gray-700 select-none shadow-sm">
                        {project.manager}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Radius (meters)</label>
                      <div className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-lg text-gray-700 select-none shadow-sm">
                        {project.radius}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Resource Management */}
            <div className="mt-4 bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-gray-700">Resource Management</h3>
                {/* Botón de Request Resources eliminado */}
              </div>

              {showRequestForm ? (
                <form onSubmit={handleRequestSubmit} className="space-y-4">
                  {requestData.resources.map((resource, index) => (
                    <div key={index} className="space-y-3 p-3 bg-white/60 rounded-lg border border-gray-200/50">
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-medium text-gray-700">Resource {index + 1}</h4>
                        {index > 0 && (
                          <button
                            type="button"
                            onClick={() => removeResourceField(index)}
                            className="text-red-500 hover:text-red-600"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Type</label>
                          <select
                            value={resource.type}
                            onChange={(e) => updateResource(index, 'type', e.target.value)}
                            className="w-full px-3 py-2 bg-white/60 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          >
                            <option value="">Select a resource</option>
                            {resourceTypes.map(type => (
                              <option key={type.id} value={type.id}>
                                {type.name} ({type.unit})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Quantity</label>
                          <input
                            type="number"
                            value={resource.quantity}
                            onChange={(e) => updateResource(index, 'quantity', e.target.value)}
                            className="w-full px-3 py-2 bg-white/60 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter quantity"
                            min="0"
                            step="0.01"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <button
                    type="button"
                    onClick={addResourceField}
                    className="w-full px-4 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                  >
                    + Add Another Resource
                  </button>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Priority</label>
                    <select
                      value={requestData.priority}
                      onChange={(e) => setRequestData({...requestData, priority: e.target.value})}
                      className="w-full px-3 py-2 bg-white/60 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Notes</label>
                    <textarea
                      value={requestData.notes}
                      onChange={(e) => setRequestData({...requestData, notes: e.target.value})}
                      className="w-full px-3 py-2 bg-white/60 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows="2"
                      placeholder="Additional information..."
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Submit Request
                  </button>
                </form>
              ) : (
                <div className="space-y-3">
                  {loading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                      <p className="text-sm text-gray-500 mt-2">Loading resources...</p>
                    </div>
                  ) : projectResources.length > 0 ? (
                    projectResources.map((resource, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white/60 rounded-lg border border-gray-200/50">
                        <div>
                          <div className="font-medium text-gray-700">{resource.name}</div>
                          <div className="text-sm text-gray-500">{resource.quantity}</div>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          resource.status === 'available' ? 'bg-green-100 text-green-700' :
                          resource.status === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {resource.status === 'available' ? 'Available' :
                            resource.status === 'medium' ? 'Medium' : 'Low'}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500 mt-2">No resources available</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Back Button */}
            <div className="mt-6">
              <button 
                onClick={() => navigate(-1)}
                className="px-6 py-3 bg-white/80 backdrop-blur-xl rounded-xl shadow-lg text-gray-700 hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 border border-white/20"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}