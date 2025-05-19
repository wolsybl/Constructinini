import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Marker, Circle } from '@react-google-maps/api';
import Maps from '@/lib/Maps';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function ProjectReadOnlyPage() {
  const { id } = useParams();
  const { projects } = useAuth();
  const navigate = useNavigate();

  const project = projects.find(p => String(p.id) === String(id));
  if (!project) return <div className="p-8 text-center">Project not found.</div>;

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <Card className="glassmorphism-card max-w-xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-tertiary">
            Project Details (Read Only)
          </CardTitle>
          <CardDescription>View all details for this project.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 py-3">
            <div>
              <Label>Name</Label>
              <Input value={project.name} readOnly className="bg-background/70" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={project.description} readOnly className="bg-background/70" />
            </div>
            <div>
              <Label>Location Name</Label>
              <Input value={project.locationName} readOnly className="bg-background/70" />
            </div>
            <div className="flex flex-row gap-3">
              <div className="flex-1">
                <Label>Latitude</Label>
                <Input value={project.latitude} readOnly className="bg-background/70" />
              </div>
              <div className="flex-1">
                <Label>Longitude</Label>
                <Input value={project.longitude} readOnly className="bg-background/70" />
              </div>
            </div>
            <div>
              <Label>Manager</Label>
              <Input value={project.manager} readOnly className="bg-background/70" />
            </div>
            <div>
              <Label>Radius (meters)</Label>
              <Input value={project.radius} readOnly className="bg-background/70" />
            </div>
            <div className="col-span-4 h-64 mt-2">
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
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
        </CardFooter>
      </Card>
    </div>
  );
}