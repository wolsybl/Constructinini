import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import { useAuth } from '@/contexts/AuthContext';

export default function SystemSettingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [attendanceData, setAttendanceData] = useState([]);

  useEffect(() => {
    const fetchAttendanceData = async () => {
      try {
        const response = await fetch('/api/attendance'); // Replace with your actual API endpoint
        if (!response.ok) throw new Error('Failed to fetch attendance data');
        const data = await response.json();
        setAttendanceData(data);
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch attendance data.' });
        console.error(error);
      }
    };

    fetchAttendanceData();
  }, [toast]);

  const exportToExcel = () => {
    const csvContent = [
      ['Name', 'Attendance', 'Hours Worked'],
      ...attendanceData.map((row) => [row.name, row.attendance, row.hoursWorked]),
    ]
      .map((e) => e.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'attendance_report.csv');
    toast({ variant: 'success', title: 'Export Successful', description: 'Excel file has been downloaded.' });
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('Attendance Report', 10, 10);
    attendanceData.forEach((row, index) => {
      doc.text(`${index + 1}. ${row.name} - ${row.attendance} - ${row.hoursWorked} hours`, 10, 20 + index * 10);
    });
    doc.save('attendance_report.pdf');
    toast({ variant: 'success', title: 'Export Successful', description: 'PDF file has been downloaded.' });
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <Card className="glassmorphism-card">
        <CardHeader>
          <CardTitle className="text-2xl">Export Attendance</CardTitle>
          <CardDescription>Export worker attendance and work hours as PDF or Excel.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col space-y-4">
            <Button
              onClick={exportToExcel}
              className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-md h-10 px-6"
            >
              Export to Excel
            </Button>
            <Button
              onClick={exportToPDF}
              className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-md h-10 px-6"
            >
              Export to PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
