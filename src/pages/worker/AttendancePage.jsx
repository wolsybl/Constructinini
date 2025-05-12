
    import React, { useState, useRef, useEffect } from 'react';
    import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
    import { Button } from '@/components/ui/button';
    import { Camera, MapPin, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';
    import { motion } from 'framer-motion';
    import { useToast } from '@/components/ui/use-toast';
    import { useAuth } from '@/contexts/AuthContext';

    function calculateDistance(lat1, lon1, lat2, lon2) {
      const R = 6371e3; 
      const φ1 = lat1 * Math.PI/180; 
      const φ2 = lat2 * Math.PI/180;
      const Δφ = (lat2-lat1) * Math.PI/180;
      const Δλ = (lon2-lon1) * Math.PI/180;

      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

      const d = R * c; 
      return d; 
    }

    export default function AttendancePage() {
      const [isCameraActive, setIsCameraActive] = useState(false);
      const [currentLocation, setCurrentLocation] = useState(null);
      const [locationError, setLocationError] = useState(null);
      const [photo, setPhoto] = useState(null);
      const [isProcessing, setIsProcessing] = useState(false);
      const [isWithinRange, setIsWithinRange] = useState(null);
      const videoRef = useRef(null);
      const canvasRef = useRef(null);
      const { toast } = useToast();
      const { user, getProjectById } = useAuth();

      const assignedProject = user?.assignedProjectId ? getProjectById(user.assignedProjectId) : null;

      const startCamera = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          setIsCameraActive(true);
          setPhoto(null);
        } catch (err) {
          console.error("Error accessing camera:", err);
          toast({ variant: "destructive", title: "Camera Error", description: "Could not access camera. Please check permissions." });
        }
      };

      const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
          videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }
        setIsCameraActive(false);
      };

      const takePhoto = () => {
        if (videoRef.current && canvasRef.current) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const context = canvas.getContext('2d');
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg');
          setPhoto(dataUrl);
          stopCamera();
        }
      };

      const getLocation = () => {
        setLocationError(null);
        setIsWithinRange(null);
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const loc = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              };
              setCurrentLocation(loc);
              if (assignedProject) {
                const distance = calculateDistance(loc.latitude, loc.longitude, assignedProject.latitude, assignedProject.longitude);
                setIsWithinRange(distance <= assignedProject.radius);
              } else {
                setIsWithinRange(false); 
              }
            },
            (error) => {
              console.error("Error getting location:", error);
              setLocationError("Could not get location. Please enable location services.");
              toast({ variant: "destructive", title: "Location Error", description: "Could not get location. Please enable location services." });
              setIsWithinRange(false);
            }
          );
        } else {
          setLocationError("Geolocation is not supported by this browser.");
          toast({ variant: "destructive", title: "Location Error", description: "Geolocation is not supported by this browser." });
          setIsWithinRange(false);
        }
      };
      
      useEffect(() => {
        getLocation();
        return () => stopCamera();
      }, [assignedProject]);

      const handleSubmitAttendance = async (type) => {
        if (!photo) {
          toast({ variant: "destructive", title: "Missing Photo", description: "Please take a photo for verification." });
          return;
        }
        if (!currentLocation && !locationError) {
           toast({ variant: "destructive", title: "Missing Location", description: "Please allow location access." });
          return;
        }
        if (locationError) {
           toast({ variant: "destructive", title: "Location Error", description: locationError });
          return;
        }
        if (!assignedProject) {
            toast({ variant: "destructive", title: "No Project", description: "You are not assigned to a project." });
            return;
        }
        if (!isWithinRange) {
            toast({ variant: "destructive", title: "Out of Range", description: `You must be within ${assignedProject.radius} meters of the project site.` });
            return;
        }


        setIsProcessing(true);
        await new Promise(resolve => setTimeout(resolve, 1500)); 

        setIsProcessing(false);
        toast({ title: `Successfully Checked ${type === 'in' ? 'In' : 'Out'}`, description: `Your attendance for ${assignedProject.name} has been recorded at ${new Date().toLocaleTimeString()}` });
        setPhoto(null); 
      };


      return (
        <div className="container mx-auto py-8 px-4 md:px-6">
          <motion.h1 
            className="text-3xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-primary to-tertiary text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Mark Attendance {assignedProject ? `for ${assignedProject.name}` : ""}
          </motion.h1>

          <Card className="max-w-lg mx-auto glassmorphism-card">
            <CardHeader>
              <CardTitle className="text-xl">Attendance Verification</CardTitle>
              <CardDescription>Provide photo and allow location for verification. Must be within {assignedProject?.radius || 100}m of site.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Facial Verification</h3>
                {isCameraActive ? (
                  <div className="relative">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-auto rounded-md border bg-muted aspect-video"></video>
                    <Button onClick={takePhoto} className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-primary/80 hover:bg-primary text-primary-foreground">
                      <Camera size={18} className="mr-2" /> Capture
                    </Button>
                  </div>
                ) : photo ? (
                  <div className="relative">
                    <img  alt="Captured attendance photo" className="w-full h-auto rounded-md border aspect-video object-cover" src="https://images.unsplash.com/photo-1671109705925-bd56f2efae54" />
                    <Button onClick={startCamera} variant="outline" size="sm" className="absolute top-2 right-2 bg-background/70">Retake</Button>
                  </div>
                ) : (
                  <Button onClick={startCamera} className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground">
                    <Camera size={18} className="mr-2" /> Start Camera
                  </Button>
                )}
                <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Geolocation</h3>
                {!assignedProject && (
                    <div className="flex items-center p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-md text-yellow-700 dark:text-yellow-400">
                        <AlertTriangle size={18} className="mr-2" />
                        <span>Not assigned to any project. Location check disabled.</span>
                    </div>
                )}
                {currentLocation && assignedProject && (
                  <div className={`flex items-center p-3 rounded-md ${isWithinRange ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                    <MapPin size={18} className="mr-2" /> 
                    <span>
                      {isWithinRange ? 'Location Verified: Within range.' : `Out of Range. Be within ${assignedProject.radius}m.`} (Lat: {currentLocation.latitude.toFixed(4)}, Lon: {currentLocation.longitude.toFixed(4)})
                    </span>
                  </div>
                )}
                {locationError && (
                  <div className="flex items-center p-3 bg-red-100 dark:bg-red-900/30 rounded-md text-red-700 dark:text-red-400">
                    <XCircle size={18} className="mr-2" /> 
                    <span>{locationError}</span>
                    <Button onClick={getLocation} variant="link" size="sm" className="ml-auto">Retry</Button>
                  </div>
                )} 
                {!currentLocation && !locationError && assignedProject && (
                  <div className="flex items-center p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-md text-yellow-700 dark:text-yellow-400">
                    <Loader2 size={18} className="mr-2 animate-spin" /> 
                    <span>Acquiring location...</span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-4">
                <Button 
                  onClick={() => handleSubmitAttendance('in')} 
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  disabled={isProcessing || !photo || (!currentLocation && !locationError) || !isWithinRange}
                >
                  {isProcessing ? <Loader2 size={18} className="animate-spin mr-2" /> : <CheckCircle size={18} className="mr-2" />}
                  Check In
                </Button>
                <Button 
                  onClick={() => handleSubmitAttendance('out')} 
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  disabled={isProcessing || !photo || (!currentLocation && !locationError) || !isWithinRange}
                >
                  {isProcessing ? <Loader2 size={18} className="animate-spin mr-2" /> : <XCircle size={18} className="mr-2" />}
                  Check Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
  