import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { PlusCircle, Search, Edit, Trash2, MapPin, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { GoogleMap, Marker, useLoadScript } from '@react-google-maps/api';

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
  const { toast } = useToast();
  const { isLoaded } = useLoadScript({ googleMapsApiKey: 'AIzaSyDxWwPaA-_LKw_lGzEP4-f9lmWIhecP-Uw' });
  const { fetchProjectManagers } = useAuth();

  useEffect(() => {
    const loadManagers = async () => {
      setLoadingManagers(true);
      try {
        const managersList = await fetchProjectManagers();
        setManagers(managersList);
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to load project managers." });
      } finally {
        setLoadingManagers(false);
      }
    };
    loadManagers();
  }, [fetchProjectManagers, toast]);

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
      manager: selectedManager 
    });
    setProjectName('');
    setProjectDescription('');
    setLocationName('');
    setLatitude('');
    setLongitude('');
    setSelectedManager('');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[525px] bg-card glassmorphism-card">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-tertiary">Create New Project</DialogTitle>
          <DialogDescription>Fill in the details below to create a new construction project.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-4 py-4">
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
            <div className="flex flex-row gap-4">
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
                    <option key={manager.id} value={manager.name}>{manager.name}</option>
                  ))}
                </select>
              )}
            </div>
            {isLoaded && (
              <div className="col-span-4 h-64">
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={{ lat: parseFloat(latitude) || 4.8133, lng: parseFloat(longitude) || -75.6967 }}
                  zoom={12}
                  onClick={handleMapClick}
                >
                  {latitude && longitude && <Marker position={{ lat: parseFloat(latitude), lng: parseFloat(longitude) }} />}
                </GoogleMap>
              </div>
            )}
            <div className="col-span-4">
              <div className="p-3 bg-secondary/30 rounded-md text-sm text-muted-foreground">
                <Globe size={16} className="inline mr-2" />
                For now, please enter coordinates manually. Map integration will be added later.
                The project radius for worker check-in is 100 meters by default.
              </div>
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
  const { toast } = useToast();
  const { isLoaded } = useLoadScript({ googleMapsApiKey: 'AIzaSyDxWwPaA-_LKw_lGzEP4-f9lmWIhecP-Uw' });
  const { fetchProjectManagers } = useAuth();

  useEffect(() => {
    if (project) {
      setProjectName(project.name || '');
      setProjectDescription(project.description || '');
      setLocationName(project.locationName || '');
      setLatitude(project.latitude || '');
      setLongitude(project.longitude || '');
      setSelectedManager(project.manager || '');
    }
  }, [project]);

  useEffect(() => {
    const loadManagers = async () => {
      setLoadingManagers(true);
      try {
        const managersList = await fetchProjectManagers();
        setManagers(managersList);
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to load project managers." });
      } finally {
        setLoadingManagers(false);
      }
    };
    loadManagers();
  }, [fetchProjectManagers, toast]);

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
      manager: selectedManager 
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
                    <option key={manager.id} value={manager.name}>{manager.name}</option>
                  ))}
                </select>
              )}
            </div>
            {isLoaded && (
              <div className="col-span-4 h-64">
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={{ lat: parseFloat(latitude) || 4.8133, lng: parseFloat(longitude) || -75.6967 }}
                  zoom={12}
                  onClick={handleMapClick}
                >
                  {latitude && longitude && <Marker position={{ lat: parseFloat(latitude), lng: parseFloat(longitude) }} />}
                </GoogleMap>
              </div>
            )}
            <div className="col-span-4">
              <div className="p-3 bg-secondary/30 rounded-md text-sm text-muted-foreground">
                <Globe size={16} className="inline mr-2" />
                For now, please enter coordinates manually. Map integration will be added later.
                The project radius for worker check-in is 100 meters by default.
              </div>
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

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <Card className="glassmorphism-card mb-8">
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

        {filteredProjects.length === 0 && searchTerm && (
             <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-8"
            >
                <p className="text-muted-foreground text-lg">No projects found matching "{searchTerm}".</p>
            </motion.div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index + 0.3, duration: 0.4 }}
            >
              <Card className="glassmorphism-card h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="text-xl text-primary">{project.name}</CardTitle>
                  <CardDescription className="flex items-center text-muted-foreground">
                    <MapPin size={14} className="mr-1" /> {project.locationName}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-sm mb-2">{project.description}</p>
                  <p className="text-sm mb-1"><span className="font-semibold text-muted-foreground">Status:</span> {project.status}</p>
                  <p className="text-sm mb-1"><span className="font-semibold text-muted-foreground">Manager:</span> {project.manager}</p>
                  <p className="text-sm"><span className="font-semibold text-muted-foreground">Coordinates:</span> Lat: {project.latitude.toFixed(4)}, Lon: {project.longitude.toFixed(4)}</p>
                   <p className="text-sm text-muted-foreground mt-1">(Radius: {project.radius}m)</p>
                </CardContent>
                <CardFooter className="border-t border-border/20 flex justify-end space-x-2 pt-4">
                   <Button variant="ghost" size="sm" className="hover:bg-primary/10 text-primary" onClick={() => handleEditClick(project)}>
                    <Edit size={16} className="mr-1" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hover:bg-destructive/10 text-destructive"
                    onClick={() => handleDeleteClick(project.id)}
                  >
                    <Trash2 size={16} className="mr-1" /> Delete
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
         {filteredProjects.length === 0 && !searchTerm && (
             <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
            >
                <Globe size={48} className="mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-xl">No projects created yet.</p>
                <p className="text-muted-foreground">Click "Create New Project" to get started.</p>
            </motion.div>
        )}
      </motion.div>
    </div>
  );
}
