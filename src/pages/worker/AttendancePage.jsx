import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, MapPin, CheckCircle, XCircle, Loader2, AlertTriangle, RotateCcw, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';

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
  const [facingMode, setFacingMode] = useState('user'); // 'user' for front camera, 'environment' for back camera
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [attendanceStatus, setAttendanceStatus] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const { toast } = useToast();
  const { user, getProjectById, projectAssignments } = useAuth();
  const [isRetaking, setIsRetaking] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);

  const assignedProjectAssignment = projectAssignments.find(assignment => assignment.user_id === user?.id);
  const assignedProject = assignedProjectAssignment ? getProjectById(assignedProjectAssignment.project_id) : null;

  const getAvailableCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setAvailableCameras(videoDevices);
      if (videoDevices.length > 0) {
        setSelectedCamera(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error('Error getting cameras:', err);
      toast({
        variant: "destructive",
        title: "Camera Error",
        description: "Could not get list of available cameras."
      });
    }
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast({
        variant: "destructive",
        title: "Camera Error",
        description: "Your browser does not support camera access."
      });
      return;
    }

    try {
      // Detener cualquier stream existente
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      setIsVideoReady(false);

      const constraints = {
        video: {
          facingMode: facingMode,
          ...(selectedCamera && { deviceId: { exact: selectedCamera } }),
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().then(() => {
            setIsVideoReady(true);
          }).catch(console.error);
        };
      }

      setIsCameraActive(true);
      setPhoto(null);
    } catch (err) {
      console.error("Error accessing camera:", err);
      let errorMessage = "Could not access camera.";
      if (err.name === "NotAllowedError") {
        errorMessage = "Camera access denied. Please grant permission in your browser settings.";
      } else if (err.name === "NotFoundError") {
        errorMessage = "No camera found on this device.";
      } else if (err.name === "NotReadableError") {
        errorMessage = "Camera is already in use by another application.";
      } else if (err.name === "OverconstrainedError") {
        errorMessage = "Camera constraints not supported.";
      }
      toast({
        variant: "destructive",
        title: "Camera Error",
        description: errorMessage
      });
      setIsVideoReady(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      toast({
        variant: "destructive",
        title: "Camera Error",
        description: "Camera or canvas not initialized properly."
      });
      return;
    }
    if (!isVideoReady) {
      toast({
        variant: "destructive",
        title: "Camera Not Ready",
        description: "Please wait for the camera to finish loading before taking a photo."
      });
      return;
    }
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        toast({
          variant: "destructive",
          title: "Camera Error",
          description: "Please wait for the camera to be ready."
        });
        return;
      }
      
      // Configurar dimensiones del canvas
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Could not get canvas context');
      }

      // Limpiar el canvas
      context.clearRect(0, 0, canvas.width, canvas.height);
      
      // Aplicar transformación para la cámara frontal
      if (facingMode === 'user') {
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
      }
      
      // Dibujar el frame actual del video
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Restaurar la transformación
      if (facingMode === 'user') {
        context.setTransform(1, 0, 0, 1, 0, 0);
      }
      
      // Convertir a base64 con mejor calidad
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      
      // Verificar que la imagen se generó correctamente
      if (!dataUrl || dataUrl === 'data:,') {
        throw new Error('Failed to capture image');
      }

      setPhoto(dataUrl);
      
      // Detener la cámara después de un breve retraso
      setTimeout(() => {
        stopCamera();
        setIsRetaking(false);
      }, 500);

    } catch (error) {
      console.error('Error taking photo:', error);
      toast({
        variant: "destructive",
        title: "Photo Error",
        description: error.message || "Failed to take photo. Please try again."
      });
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

  useEffect(() => {
    getAvailableCameras();
    return () => stopCamera();
  }, []);

  useEffect(() => {
    if (isCameraActive) {
      startCamera();
    }
  }, [facingMode, selectedCamera]);

  // Función para verificar el estado actual de asistencia
  const checkAttendanceStatus = async () => {
    if (!user?.id || !assignedProject?.id) return;

    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .eq('project_id', assignedProject.id)
        .is('check_out_time', null)
        .order('check_in_time', { ascending: false })
        .limit(1);

      if (error) {
        if (error.code === 'PGRST116') {
          // No se encontró ningún registro de check-in activo
          setAttendanceStatus('checked-out');
          return;
        }
        throw error;
      }

      // Si hay datos, el usuario está checked-in
      if (data && data.length > 0) {
        setAttendanceStatus('checked-in');
      } else {
        setAttendanceStatus('checked-out');
      }
    } catch (err) {
      console.error('Error checking attendance status:', err);
      setAttendanceStatus('error');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to check attendance status. Please try again."
      });
    }
  };

  useEffect(() => {
    checkAttendanceStatus();
  }, [user?.id, assignedProject?.id]);

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

    try {
      // Upload photo to Supabase Storage
      const file = await fetch(photo).then(res => res.blob());
      // Extraer extensión correctamente
      const matches = photo.match(/^data:image\/([a-zA-Z0-9+]+);base64,/);
      const fileExt = matches ? matches[1] : 'jpg'; // fallback a jpg si no se detecta
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = `attendance-photos/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('attendance-photos')
        .upload(fileName, file, {
          contentType: `image/${fileExt}`,
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('attendance-photos')
        .getPublicUrl(fileName);

      const photoUrl = urlData.publicUrl;

      let attendanceRecord;
      if (type === 'in') {
        // Verificar si ya hay un check-in activo
        if (attendanceStatus === 'checked-in') {
          throw new Error('You are already checked in. Please check out first.');
        }

        // Insertar nuevo registro de check-in
        const { data, error } = await supabase
          .from('attendance')
          .insert([{
            user_id: user.id,
            project_id: assignedProject.id,
            check_in_time: new Date().toISOString(),
            check_in_latitude: currentLocation.latitude,
            check_in_longitude: currentLocation.longitude,
            check_in_photo_url: photoUrl,
          }])
          .select()
          .single();
        if (error) throw error;
        attendanceRecord = data;
        setAttendanceStatus('checked-in');
      } else if (type === 'out') {
        // Buscar el último registro de check-in sin check-out
        const { data: lastAttendance, error: fetchError } = await supabase
          .from('attendance')
          .select('*')
          .eq('user_id', user.id)
          .eq('project_id', assignedProject.id)
          .is('check_out_time', null)
          .order('check_in_time', { ascending: false })
          .limit(1)
          .single();

        if (fetchError || !lastAttendance) {
          throw new Error('No active check-in found. Please check in first.');
        }

        // Actualizar el registro con check-out
        const { error: updateError } = await supabase
          .from('attendance')
          .update({
            check_out_time: new Date().toISOString(),
            check_out_latitude: currentLocation.latitude,
            check_out_longitude: currentLocation.longitude,
            check_out_photo_url: photoUrl,
          })
          .eq('id', lastAttendance.id);
        if (updateError) throw updateError;
        attendanceRecord = { ...lastAttendance, check_out_time: new Date().toISOString() };
        setAttendanceStatus('checked-out');
      }

      setIsProcessing(false);
      toast({
        title: `Successfully Checked ${type === 'in' ? 'In' : 'Out'}`,
        description: `Your attendance for ${assignedProject.name} has been recorded at ${new Date().toLocaleTimeString()}`,
      });
      setPhoto(null);
    } catch (err) {
      setIsProcessing(false);
      toast({ variant: "destructive", title: "Attendance Error", description: err.message || "Failed to record attendance." });
    }
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
          <CardDescription>
            Provide photo and allow location for verification. Must be within {assignedProject?.radius || 100}m of site.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Camera Preview */}
            <div className="relative aspect-video bg-black/10 rounded-lg overflow-hidden">
              {isCameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {!isVideoReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                      <span className="ml-2 text-white">Loading camera...</span>
                    </div>
                  )}
                </>
              ) : photo ? (
                <img
                  src={photo}
                  alt="Captured photo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Camera className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>

            {/* Camera Controls */}
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              {!photo ? (
                <>
                  <Button
                    onClick={startCamera}
                    disabled={isCameraActive}
                    className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Start Camera
                  </Button>
                  {isCameraActive && (
                    <>
                      <Button
                        onClick={switchCamera}
                        variant="outline"
                        className="hover:bg-secondary w-full sm:w-auto"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Switch Camera
                      </Button>
                      <Button
                        onClick={takePhoto}
                        className="bg-accent hover:bg-accent/90 w-full sm:w-auto text-lg py-6"
                        disabled={!isVideoReady}
                      >
                        Take Photo
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <>
                  <Button
                    onClick={() => {
                      setPhoto(null);
                      setIsRetaking(true);
                      startCamera();
                    }}
                    variant="outline"
                    className="hover:bg-secondary w-full sm:w-auto"
                  >
                    Retake Photo
                  </Button>
                  {attendanceStatus === 'checked-out' ? (
                    <Button
                      onClick={() => handleSubmitAttendance('in')}
                      disabled={isProcessing || !isWithinRange}
                      className="bg-primary hover:bg-primary/90 w-full sm:w-auto text-lg py-6"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      Check In
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleSubmitAttendance('out')}
                      disabled={isProcessing || !isWithinRange}
                      className="bg-red-600 hover:bg-red-700 w-full sm:w-auto text-lg py-6"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <LogOut className="w-4 h-4 mr-2" />
                      )}
                      Check Out
                    </Button>
                  )}
                </>
              )}
            </div>

            {/* Location Status */}
            <div className="mt-4 p-4 rounded-lg bg-secondary/30">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                <span className="font-medium">Location Status:</span>
                {isWithinRange === null ? (
                  <span className="text-muted-foreground">Checking...</span>
                ) : isWithinRange ? (
                  <span className="text-green-500 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Within Range
                  </span>
                ) : (
                  <span className="text-red-500 flex items-center gap-1">
                    <XCircle className="w-4 h-4" />
                    Out of Range
                  </span>
                )}
              </div>
              {locationError && (
                <div className="mt-2 text-red-500 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  {locationError}
                </div>
              )}
            </div>

            {/* Attendance Status */}
            <div className="mt-4 p-4 rounded-lg bg-secondary/30">
              <div className="flex items-center gap-2">
                <span className="font-medium">Current Status:</span>
                {attendanceStatus === 'checked-in' ? (
                  <span className="text-green-500 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Checked In
                  </span>
                ) : attendanceStatus === 'checked-out' ? (
                  <span className="text-blue-500 flex items-center gap-1">
                    <LogOut className="w-4 h-4" />
                    Checked Out
                  </span>
                ) : (
                  <span className="text-muted-foreground">Not Checked In</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
