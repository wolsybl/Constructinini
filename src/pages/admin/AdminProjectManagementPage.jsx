import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { PlusCircle, Search, Edit, Trash2, MapPin, Globe, Users, Building2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Marker, Circle } from '@react-google-maps/api';
import Maps from '@/lib/Maps';
import { Badge } from '@/components/ui/badge';
import { fetchManagers } from '@/services/dataService';

// Modal para crear proyecto
const CreateProjectModal = ({ isOpen, setIsOpen, onProjectCreate }) => {
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [selectedManager, setSelectedManager] = useState('');
  const [managers, setManagers] = useState([]);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [radius, setRadius] = useState(100);
  const { toast } = useToast();

  useEffect(() => {
    const loadManagers = async () => {
      setLoadingManagers(true);
      try {
        const managersList = await fetchManagers();
        setManagers(managersList);
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to load project managers." });
      } finally {
        setLoadingManagers(false);
      }
    };
    loadManagers();
  }, [toast]);

  const handleMapClick = (e) => {
    setLatitude(e.latLng.lat());
    setLongitude(e.latLng.lng());
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!projectName || !locationName || !latitude || !longitude || !selectedManager) {
      toast({ variant: "destructive", title: "Error", description: "Please fill all required fields." });
      return;
    }
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      toast({ variant: "destructive", title: "Invalid Coordinates", description: "Latitude must be between -90 and 90. Longitude must be between -180 and 180." });
      return;
    }

    onProjectCreate({ 
      name: projectName, 
      description: projectDescription, 
      locationName, 
      latitude: lat, 
      longitude: lon,
      status: 'Planning', 
      manager_id: selectedManager,
      radius
    });
    setProjectName('');
    setProjectDescription('');
    setLocationName('');
    setLatitude('');
    setLongitude('');
    setSelectedManager('');
    setRadius(100);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[525px] bg-card glassmorphism-card max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-tertiary">Create New Project</DialogTitle>
          <DialogDescription>Fill in the details below to create a new construction project.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-3 py-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="projectName" className="text-muted-foreground">Name</Label>
              <Input id="projectName" value={projectName} onChange={(e) => setProjectName(e.target.value)} className="bg-background/70" placeholder="e.g., Skyscraper Alpha" />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="projectDescription" className="text-muted-foreground">Description</Label>
              <Input id="projectDescription" value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} className="bg-background/70" placeholder="Brief project overview" />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="locationName" className="text-muted-foreground">Location Name</Label>
              <Input id="locationName" value={locationName} onChange={(e) => setLocationName(e.target.value)} className="bg-background/70" placeholder="e.g., City Center Plaza" />
            </div>
            <div className="flex flex-row gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <Label htmlFor="latitude" className="text-muted-foreground">Latitude</Label>
                <Input id="latitude" type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} className="bg-background/70" placeholder="e.g., 40.7128" />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <Label htmlFor="longitude" className="text-muted-foreground">Longitude</Label>
                <Input id="longitude" type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} className="bg-background/70" placeholder="e.g., -74.0060" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="manager" className="text-muted-foreground">Manager</Label>
              {loadingManagers ? (
                <p className="text-muted-foreground">Loading managers...</p>
              ) : (
                <select 
                  id="manager" 
                  value={selectedManager} 
                  onChange={(e) => setSelectedManager(e.target.value)} 
                  className="bg-background/70 p-2 rounded-md border border-border"
                >
                  <option value="" disabled>Select a manager</option>
                  {managers.map(manager => (
                    <option key={manager.id} value={manager.id}>{manager.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex flex-col gap-2 bg-secondary/30 rounded-md p-3">
              <Label htmlFor="radius" className="text-muted-foreground flex items-center gap-2">
                <Globe size={16} className="inline" />
                Project radius for worker check-in (meters)
              </Label>
              <input
                id="radius"
                type="range"
                min={50}
                max={1000}
                step={10}
                value={radius}
                onChange={e => setRadius(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="text-xs text-muted-foreground text-right">
                {radius} meters
              </div>
            </div>
            <div className="col-span-4 h-64">
              <Maps
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={{ lat: parseFloat(latitude) || 4.8133, lng: parseFloat(longitude) || -75.6967 }}
                zoom={12}
                onClick={handleMapClick}
                mapId="5795a66c547e6becbb38a780"
              >
                {latitude && longitude && (
                  <>
                    <Marker position={{ lat: parseFloat(latitude), lng: parseFloat(longitude) }} />
                    <Circle
                      center={{ lat: parseFloat(latitude), lng: parseFloat(longitude) }}
                      radius={radius}
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
                  </>
                )}
              </Maps>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="bg-secondary/50 hover:bg-secondary/80">Cancel</Button>
            <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground">Create Project</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Modal para editar proyecto
const EditProjectModal = ({ isOpen, setIsOpen, project, onProjectUpdate }) => {
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [selectedManager, setSelectedManager] = useState('');
  const [managers, setManagers] = useState([]);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [radius, setRadius] = useState(100);
  const { toast } = useToast();

  useEffect(() => {
    if (project) {
      setProjectName(project.name || '');
      setProjectDescription(project.description || '');
      setLocationName(project.locationName || '');
      setLatitude(project.latitude || '');
      setLongitude(project.longitude || '');
      setSelectedManager(project.manager || '');
      setRadius(project.radius || 100);
    }
  }, [project]);

  useEffect(() => {
    const loadManagers = async () => {
      setLoadingManagers(true);
      try {
        const managersList = await fetchManagers();
        setManagers(managersList);
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to load project managers." });
      } finally {
        setLoadingManagers(false);
      }
    };
    loadManagers();
  }, [toast]);

  const handleMapClick = (e) => {
    setLatitude(e.latLng.lat());
    setLongitude(e.latLng.lng());
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!projectName || !locationName || !latitude || !longitude || !selectedManager) {
      toast({ variant: "destructive", title: "Error", description: "Please fill all required fields." });
      return;
    }
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      toast({ variant: "destructive", title: "Invalid Coordinates", description: "Latitude must be between -90 and 90. Longitude must be between -180 and 180." });
      return;
    }

    onProjectUpdate({ 
      ...project,
      name: projectName, 
      description: projectDescription, 
      locationName, 
      latitude: lat, 
      longitude: lon,
      manager_id: selectedManager,
      radius
    });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[525px] bg-card glassmorphism-card">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-tertiary">Edit Project</DialogTitle>
          <DialogDescription>Modify the details below and save changes.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="editProjectName" className="text-muted-foreground">Name</Label>
              <Input id="editProjectName" value={projectName} onChange={(e) => setProjectName(e.target.value)} className="bg-background/70" />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="editProjectDescription" className="text-muted-foreground">Description</Label>
              <Input id="editProjectDescription" value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} className="bg-background/70" />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="editLocationName" className="text-muted-foreground">Location Name</Label>
              <Input id="editLocationName" value={locationName} onChange={(e) => setLocationName(e.target.value)} className="bg-background/70" />
            </div>
            <div className="flex flex-row gap-4">
              <div className="flex flex-col gap-1 flex-1">
                <Label htmlFor="editLatitude" className="text-muted-foreground">Latitude</Label>
                <Input id="editLatitude" type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} className="bg-background/70" />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <Label htmlFor="editLongitude" className="text-muted-foreground">Longitude</Label>
                <Input id="editLongitude" type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} className="bg-background/70" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="editManager" className="text-muted-foreground">Manager</Label>
              {loadingManagers ? (
                <p className="text-muted-foreground">Loading managers...</p>
              ) : (
                <select
                  id="editManager"
                  value={selectedManager}
                  onChange={(e) => setSelectedManager(e.target.value)}
                  className="bg-background/70 p-2 rounded-md border border-border"
                >
                  <option value="" disabled>Select a manager</option>
                  {managers.map(manager => (
                    <option key={manager.id} value={manager.id}>{manager.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex flex-col gap-2 bg-secondary/30 rounded-md p-3">
              <Label htmlFor="radius" className="text-muted-foreground flex items-center gap-2">
                <Globe size={16} className="inline" />
                Project radius for worker check-in (meters)
              </Label>
              <input
                id="radius"
                type="range"
                min={50}
                max={1000}
                step={10}
                value={radius}
                onChange={e => setRadius(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="text-xs text-muted-foreground text-right">
                {radius} meters
              </div>
            </div>
            <div className="col-span-4 h-64">
              <Maps
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={{ lat: parseFloat(latitude) || 4.8133, lng: parseFloat(longitude) || -75.6967 }}
                zoom={12}
                onClick={handleMapClick}
                mapId="5795a66c547e6becbb38a780"
              >
                {latitude && longitude && (
                  <>
                    <Marker position={{ lat: parseFloat(latitude), lng: parseFloat(longitude) }} />
                    <Circle
                      center={{ lat: parseFloat(latitude), lng: parseFloat(longitude) }}
                      radius={radius}
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
                  </>
                )}
              </Maps>
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

export default function AdminProjectManagementPage() {
  const { projects, addProject, updateProject, deleteProject } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 4.8133, lng: -75.6967 });
  const [mapZoom, setMapZoom] = useState(12);

  const filteredProjects = projects.filter(project => 
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.locationName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditClick = (project) => {
    setProjectToEdit(project);
    setIsEditModalOpen(true);
  };

  const handleProjectUpdate = (updatedProject) => {
    updateProject(updatedProject);
    setIsEditModalOpen(false);
  };

  const handleDeleteClick = (projectId) => {
    if (window.confirm("Are you sure you want to delete this project?")) {
      deleteProject(projectId);
    }
  };

  const handleProjectClick = (project) => {
    setSelectedProject(project);
    setMapCenter({ lat: project.latitude, lng: project.longitude });
    setMapZoom(14);
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4"
      >
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-gray-600">
          Project Management (Admin)
        </h1>
        <Button onClick={() => setIsModalOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <PlusCircle size={18} className="mr-2" /> Create New Project
        </Button>
      </motion.div>

      <CreateProjectModal isOpen={isModalOpen} setIsOpen={setIsModalOpen} onProjectCreate={addProject} />
      <EditProjectModal isOpen={isEditModalOpen} setIsOpen={setIsEditModalOpen} project={projectToEdit} onProjectUpdate={handleProjectUpdate} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Projects List Section */}
        <div className="space-y-6">
          <Card className="glassmorphism-card">
            <CardHeader>
              <CardTitle>Filter Projects</CardTitle>
              <CardDescription>Search projects by name or location.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-grow">
                <Input 
                  type="search" 
                  placeholder="Search projects..." 
                  className="pl-10 bg-background/70" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {filteredProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index, duration: 0.4 }}
              >
                <Card 
                  className={`glassmorphism-card cursor-pointer transition-all duration-200 ${
                    selectedProject?.id === project.id ? 'ring-2 ring-primary' : 'hover:shadow-lg'
                  }`}
                  onClick={() => handleProjectClick(project)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl text-primary">{project.name}</CardTitle>
                        <CardDescription className="flex items-center text-muted-foreground">
                          <MapPin size={14} className="mr-1" /> {project.locationName}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="capitalize">
                          {project.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Manager</p>
                        <p className="font-medium">{project.manager}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Radius</p>
                        <p className="font-medium">{project.radius}m</p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t border-border/20 flex justify-end space-x-2 pt-4">
                    <Button variant="ghost" size="sm" className="hover:bg-primary/10 text-primary" onClick={(e) => {
                      e.stopPropagation();
                      handleEditClick(project);
                    }}>
                      <Edit size={16} className="mr-1" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover:bg-destructive/10 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(project.id);
                      }}
                    >
                      <Trash2 size={16} className="mr-1" /> Delete
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}

            {filteredProjects.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <Globe size={48} className="mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-xl">No projects found.</p>
                {searchTerm && <p className="text-muted-foreground">Try a different search term.</p>}
                {!searchTerm && <p className="text-muted-foreground">Click "Create New Project" to get started.</p>}
              </motion.div>
            )}
          </div>
        </div>

        {/* Map Section */}
        <div className="space-y-6">
          <Card className="glassmorphism-card h-[600px]">
            <CardHeader>
              <CardTitle>Project Locations</CardTitle>
              <CardDescription>Click on a project to view its details</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Maps
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={mapCenter}
                zoom={mapZoom}
                mapId="5795a66c547e6becbb38a780"
              >
                {filteredProjects.map((project) => (
                  <React.Fragment key={project.id}>
                    <Marker
                      position={{ lat: project.latitude, lng: project.longitude }}
                      onClick={() => handleProjectClick(project)}
                      icon={{
                        url: selectedProject?.id === project.id 
                          ? 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                          : 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                        scaledSize: new window.google.maps.Size(40, 40)
                      }}
                    />
                    <Circle
                      center={{ lat: project.latitude, lng: project.longitude }}
                      radius={project.radius}
                      options={{
                        fillColor: selectedProject?.id === project.id ? '#3b82f6' : '#ef4444',
                        fillOpacity: 0.2,
                        strokeColor: selectedProject?.id === project.id ? '#3b82f6' : '#ef4444',
                        strokeOpacity: 0.6,
                        strokeWeight: 2,
                        clickable: false,
                        draggable: false,
                        editable: false,
                        visible: true,
                      }}
                    />
                  </React.Fragment>
                ))}
              </Maps>
            </CardContent>
          </Card>

          {/* Selected Project Details */}
          {selectedProject && (
            <Card className="glassmorphism-card">
              <CardHeader>
                <CardTitle>Project Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{selectedProject.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">{selectedProject.locationName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="font-medium capitalize">{selectedProject.status}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Manager</p>
                    <p className="font-medium">{selectedProject.manager}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Coordinates</p>
                    <p className="font-medium">
                      {selectedProject.latitude.toFixed(4)}, {selectedProject.longitude.toFixed(4)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Radius</p>
                    <p className="font-medium">{selectedProject.radius}m</p>
                  </div>
                </div>
                {selectedProject.description && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="font-medium">{selectedProject.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
