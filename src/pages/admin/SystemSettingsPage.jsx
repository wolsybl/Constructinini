import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useToast } from '../../components/ui/use-toast';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { FileText, FileSpreadsheet, Users } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SystemSettingsPage() {
  const { toast } = useToast();
  const { user, projects, tasks } = useAuth();
  const [attendanceData, setAttendanceData] = useState([]);

  useEffect(() => {
    const fetchAttendanceData = async () => {
      try {
        // Join directo a profiles y projects
        const { data, error } = await supabase
          .from('attendance')
          .select(`
            id,
            user_id,
            project_id,
            check_in_time,
            check_out_time,
            profiles (
              name
            ),
            projects (
              name
            )
          `);

        if (error) throw error;

        // Formatea los datos para el reporte
        const formatted = (data || []).map(row => {
          const hoursWorked = row.check_in_time && row.check_out_time
            ? ((new Date(row.check_out_time) - new Date(row.check_in_time)) / 3600000) // Difference in hours
            : 0;
          const payment = parseFloat((hoursWorked * 8.33).toFixed(2)); // Calculate payment and fix to 2 decimal places

          return {
            name: row.profiles?.name || 'Unknown',
            project: row.projects?.name || 'Unknown',
            hoursWorked: parseFloat(hoursWorked.toFixed(2)), // Also fix hours to 2 decimal places for consistency
            payment: payment, // Add payment here
            userId: row.user_id,
            projectId: row.project_id,
            checkIn: row.check_in_time, // Keep original times for potential future use
            checkOut: row.check_out_time,
          };
        });

        setAttendanceData(formatted);
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to fetch attendance data.' });
        console.error(error);
      }
    };

    fetchAttendanceData();
  }, [toast]);

  // Helper para obtener tareas asignadas a ese usuario en ese proyecto
  const getUserTasks = (userId, projectId) => {
    return tasks
      .filter(t => t.assigned_to === userId && t.projectId === projectId)
      .map(t => t.title)
      .join(', ') || '-';
  };

  // Ordena por nombre y horas trabajadas
  const sortedAttendance = [...attendanceData].sort((a, b) => {
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return Number(b.hoursWorked) - Number(a.hoursWorked);
  });

  const exportToExcel = () => {
    const header = ['Name', 'Hours Worked', 'Project', 'Payment (USD)'];
    const rows = sortedAttendance.map(row => [
      row.name,
      row.hoursWorked,
      row.project,
      row.payment,
    ]);
    const csvContent = [header, ...rows]
      .map(e => e.map(val => `"${val}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'attendance_report.csv');
    toast({ variant: 'success', title: 'Export Successful', description: 'Excel file has been downloaded.' });
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Attendance Report', 14, 16);
    doc.setFontSize(12);

    const head = [['Name', 'Hours Worked', 'Project', 'Payment (USD)']];
    const body = sortedAttendance.map(row => [
      row.name,
      row.hoursWorked.toFixed(2),
      row.project,
      row.payment,
    ]);

    autoTable(doc, {
      startY: 24,
      head: head,
      body: body,
      styles: { fontSize: 10, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      alternateRowStyles: { fillColor: [240, 240, 240] },
      margin: { left: 10, right: 10 },
    });

    setTimeout(() => {
      doc.save('attendance_report.pdf');
      toast({ variant: 'success', title: 'Export Successful', description: 'PDF file has been downloaded.' });
    }, 100);
  };

  // Resumen de asistencia
  const totalPresent = attendanceData.filter(a => a.attendance === 'Present').length;
  const totalAbsent = attendanceData.filter(a => a.attendance === 'Absent').length;
  const totalHours = attendanceData.reduce((sum, a) => sum + Number(a.hoursWorked), 0);

  return (
    <div className="min-h-screen bg-background py-12 px-2 md:px-0 flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl mb-8"
      >
        <h1 className="text-4xl font-extrabold text-center bg-clip-text text-transparent bg-gradient-to-r from-primary to-tertiary mb-2">
          Export Data System
        </h1>
        <p className="text-center text-muted-foreground text-lg mb-6">
          Export and review worker attendance and work hours.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <Card className="glassmorphism-card shadow-xl border-0">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Users className="text-primary" /> Export Attendance
            </CardTitle>
            <CardDescription>
              Export worker attendance and work hours as PDF or Excel.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
              <Button
                onClick={exportToExcel}
                className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg h-12 px-8 flex items-center gap-2 shadow-md transition-all duration-150"
              >
                <FileSpreadsheet className="mr-2" /> Export to Excel
              </Button>
              <Button
                onClick={exportToPDF}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg h-12 px-8 flex items-center gap-2 shadow-md transition-all duration-150"
              >
                <FileText className="mr-2" /> Export to PDF
              </Button>
            </div>
            {attendanceData.length > 0 && (
              <div className="mt-6 bg-background/70 dark:bg-background/30 rounded-xl p-6 shadow-inner flex flex-col md:flex-row justify-between items-center gap-6 border border-border">
                <div className="flex flex-col items-center">
                  <span className="text-3xl font-bold text-primary">{attendanceData.length}</span>
                  <span className="text-muted-foreground text-sm">Total Records</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-3xl font-bold text-green-600 dark:text-green-400">{totalPresent}</span>
                  <span className="text-muted-foreground text-sm">Present</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-3xl font-bold text-red-500 dark:text-red-400">{totalAbsent}</span>
                  <span className="text-muted-foreground text-sm">Absent</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-3xl font-bold text-tertiary">{totalHours.toFixed(2)}</span>
                  <span className="text-muted-foreground text-sm">Total Hours</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
