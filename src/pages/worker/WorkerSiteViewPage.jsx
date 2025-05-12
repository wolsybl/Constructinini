
    import React from 'react';
    import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
    import { Button } from '@/components/ui/button';
    import { MapPin, Users, ListChecks, AlertTriangle, CheckCircle2 } from 'lucide-react';
    import { motion } from 'framer-motion';
    import { Link } from 'react-router-dom';

    export default function WorkerSiteViewPage() {
      const siteDetails = {
        name: "Sky Tower Project - Site A",
        location: "123 Main Street, Metropolis",
        manager: "Bob The Builder",
        safetyOfficer: "Sarah Connor",
        activeWorkers: 25,
        emergencyContact: "911",
        currentPhase: "Structural Steel Erection",
        safetyBriefing: "Daily at 8:00 AM, mandatory.",
        hazards: ["Working at height", "Heavy machinery operation", "Welding fumes"],
      };

      const tasks = [
        { id: 1, title: "Install safety netting - Sector 3", status: "Pending" },
        { id: 2, title: "Weld support beams - Grid C4", status: "In Progress" },
        { id: 3, title: "Inspect crane cables", status: "Completed" },
      ];

      return (
        <div className="container mx-auto py-8 px-4 md:px-6">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-tertiary">
              {siteDetails.name}
            </h1>
            <p className="text-muted-foreground flex items-center mt-1">
              <MapPin size={16} className="mr-2 text-tertiary" /> {siteDetails.location}
            </p>
          </motion.div>

          <div className="grid gap-8 lg:grid-cols-3">
            <motion.div 
              className="lg:col-span-2 space-y-8"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <Card className="glassmorphism-card">
                <CardHeader>
                  <CardTitle className="text-xl">Site Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p><span className="font-semibold text-muted-foreground">Project Manager:</span> {siteDetails.manager}</p>
                  <p><span className="font-semibold text-muted-foreground">Safety Officer:</span> {siteDetails.safetyOfficer}</p>
                  <p><span className="font-semibold text-muted-foreground">Active Workers Today:</span> <span className="text-primary font-bold">{siteDetails.activeWorkers}</span></p>
                  <p><span className="font-semibold text-muted-foreground">Emergency Contact:</span> {siteDetails.emergencyContact}</p>
                  <p><span className="font-semibold text-muted-foreground">Current Phase:</span> {siteDetails.currentPhase}</p>
                </CardContent>
              </Card>

              <Card className="glassmorphism-card">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center"><AlertTriangle size={22} className="mr-2 text-destructive" /> Safety Briefing & Hazards</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold mb-2 text-muted-foreground">Daily Briefing: <span className="font-normal text-foreground">{siteDetails.safetyBriefing}</span></p>
                  <h4 className="font-semibold mb-1 text-muted-foreground">Identified Hazards:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {siteDetails.hazards.map((hazard, i) => <li key={i}>{hazard}</li>)}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <Card className="glassmorphism-card">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center"><ListChecks size={22} className="mr-2 text-tertiary" /> My Tasks on this Site</CardTitle>
                </CardHeader>
                <CardContent>
                  {tasks.length > 0 ? (
                    <ul className="space-y-3">
                      {tasks.map(task => (
                        <li key={task.id} className="p-3 bg-secondary/30 rounded-md flex justify-between items-center">
                          <span className="text-sm">{task.title}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            task.status === 'Pending' ? 'bg-yellow-500 text-white' : 
                            task.status === 'In Progress' ? 'bg-blue-500 text-white' : 
                            'bg-green-500 text-white'
                          }`}>
                            {task.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground text-sm">No tasks assigned to you on this site currently.</p>
                  )}
                  <Button asChild className="w-full mt-6 bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Link to="/worker/attendance">
                      <CheckCircle2 size={18} className="mr-2" /> Mark My Attendance
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      );
    }
  