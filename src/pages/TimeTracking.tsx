import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Play, Pause, Coffee, Plus, Download, Timer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, differenceInMinutes } from "date-fns";
import { de } from "date-fns/locale";

interface TimeEntry {
  id: number;
  date: string;
  start: string;
  end: string;
  duration: string;
  description?: string;
}

const TimeTracking = () => {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  // Get user info
  const currentUserId = parseInt(localStorage.getItem("currentUserId") || "1");
  
  const MINUTES_PER_HOUR = 60;
  
  // Get employee's configured work hours from Settings
  const getEmployeeWorkHours = (employeeId: number): number => {
    const workHourSettings = localStorage.getItem("workHourSettings");
    if (workHourSettings) {
      const settings = JSON.parse(workHourSettings);
      const employeeSetting = settings.find((setting: any) => setting.employeeId === employeeId);
      if (employeeSetting) {
        return employeeSetting.workHoursPerDay;
      }
    }
    // Default to 8 hours if no setting found
    return 8;
  };
  
  const EMPLOYEE_WORK_HOURS = getEmployeeWorkHours(currentUserId);
  const EMPLOYEE_WORK_MINUTES = EMPLOYEE_WORK_HOURS * MINUTES_PER_HOUR;

  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([
    { id: 1, date: "2024-01-15", start: "09:00", end: "12:30", duration: "3h 30min", description: "Vormittagsarbeit" },
    { id: 2, date: "2024-01-15", start: "13:30", end: "19:45", duration: "6h 15min", description: "Nachmittagsarbeit mit Überstunden" },
    { id: 3, date: "2024-01-14", start: "08:30", end: "12:00", duration: "3h 30min", description: "Vormittagsschicht" },
    { id: 4, date: "2024-01-14", start: "13:00", end: "19:30", duration: "6h 30min", description: "Nachmittagsschicht mit Überstunden" },
    { id: 5, date: "2024-01-16", start: "08:00", end: "20:00", duration: "12h 00min", description: "Langer Arbeitstag mit 4h Überstunden" },
    { id: 6, date: "2024-01-17", start: "09:00", end: "19:00", duration: "10h 00min", description: "Weiterer Tag mit 2h Überstunden" },
  ]);

  // Calculate duration in minutes between start and end time
  const calculateDurationInMinutes = (start: string, end: string): number => {
    const startTime = new Date(`2024-01-01T${start}:00`);
    const endTime = new Date(`2024-01-01T${end}:00`);
    return differenceInMinutes(endTime, startTime);
  };

  // Calculate daily worked minutes for a specific date
  const calculateDailyWorkedMinutes = (date: string): number => {
    return timeEntries
      .filter(entry => entry.date === date)
      .reduce((total, entry) => {
        return total + calculateDurationInMinutes(entry.start, entry.end);
      }, 0);
  };

  // Calculate overtime for a specific date
  const calculateDailyOvertime = (date: string): number => {
    const workedMinutes = calculateDailyWorkedMinutes(date);
    const overtimeMinutes = Math.max(0, workedMinutes - EMPLOYEE_WORK_MINUTES);
    return overtimeMinutes;
  };

  // Get all unique dates from time entries
  const getUniqueDates = (): string[] => {
    return Array.from(new Set(timeEntries.map(entry => entry.date))).sort();
  };

  // Calculate total overtime across all days
  const calculateTotalOvertime = (): { hours: number; minutes: number } => {
    const uniqueDates = getUniqueDates();
    const totalOvertimeMinutes = uniqueDates.reduce((total, date) => {
      return total + calculateDailyOvertime(date);
    }, 0);
    
    const hours = Math.floor(totalOvertimeMinutes / MINUTES_PER_HOUR);
    const minutes = totalOvertimeMinutes % MINUTES_PER_HOUR;
    
    return { hours, minutes };
  };

  // Calculate available overtime days (employee's work hours = 1 day)
  const calculateOvertimeDays = (): number => {
    const { hours } = calculateTotalOvertime();
    return Math.floor(hours / EMPLOYEE_WORK_HOURS);
  };

  // Format minutes to hours and minutes display
  const formatMinutesToHours = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
    const minutes = totalMinutes % MINUTES_PER_HOUR;
    return `${hours}h ${minutes}min`;
  };

  const totalOvertime = calculateTotalOvertime();
  const availableOvertimeDays = calculateOvertimeDays();

  const handleManualEntry = () => {
    toast({
      title: "Zeiteintrag hinzugefügt",
      description: "Der manuelle Zeiteintrag wurde erfolgreich gespeichert.",
    });
  };

  const handleExport = () => {
    toast({
      title: "Export gestartet",
      description: "Ihre Zeiterfassungsdaten werden heruntergeladen.",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Zeiterfassung</h1>
            <p className="text-muted-foreground">
              Verwalten Sie Ihre Arbeitszeiten und Projekte
            </p>
          </div>
          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>

        <div className="grid gap-8 md:grid-cols-4">
          {/* Quick Actions */}
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle>Schnellaktionen</CardTitle>
              <CardDescription>
                Starten Sie die Zeiterfassung
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button size="lg" variant="success" className="h-48">
                  <Play className="mr-2" />
                  Zeit starten
                </Button>
                <Button size="lg" variant="outline" className="h-48">
                  <Coffee className="mr-2" />
                  Pause beginnen
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Calendar */}
          <Card>
            <CardHeader>
              <CardTitle>Kalender</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full max-w-full overflow-hidden">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Time Entries */}
        <Tabs defaultValue="list" className="space-y-4">
          <TabsList>
            <TabsTrigger value="list">Zeiteinträge</TabsTrigger>
            <TabsTrigger value="manual">Manueller Eintrag</TabsTrigger>
            <TabsTrigger value="statistics">Statistiken</TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            <Card>
              <CardHeader>
                <CardTitle>Ihre Zeiteinträge</CardTitle>
                <CardDescription>
                  Übersicht aller erfassten Arbeitszeiten
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {timeEntries.map((entry) => {
                    const dailyOvertime = calculateDailyOvertime(entry.date);
                    const isOvertimeDay = dailyOvertime > 0;
                    
                    return (
                      <div key={entry.id} className={`flex items-center justify-between p-3 rounded-lg hover:bg-muted border ${
                        isOvertimeDay ? 'border-orange-200 bg-orange-50/50' : ''
                      }`}>
                        <div className="flex items-center gap-4">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">
                              {format(parseISO(entry.date), "dd.MM.yyyy", { locale: de })} • {entry.start} - {entry.end}
                            </p>
                            {entry.description && (
                              <p className="text-xs text-muted-foreground">{entry.description}</p>
                            )}
                            {isOvertimeDay && (
                              <p className="text-xs text-orange-600 font-medium">
                                <Timer className="h-3 w-3 inline mr-1" />
                                +{formatMinutesToHours(dailyOvertime)} Überstunden
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{entry.duration}</p>
                          {isOvertimeDay && (
                            <p className="text-xs text-orange-600">Überstunden-Tag</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manual">
            <Card>
              <CardHeader>
                <CardTitle>Manueller Zeiteintrag</CardTitle>
                <CardDescription>
                  Fügen Sie nachträglich Arbeitszeiten hinzu
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Datum</Label>
                  <Input type="date" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Startzeit</Label>
                    <Input type="time" />
                  </div>
                  <div className="space-y-2">
                    <Label>Endzeit</Label>
                    <Input type="time" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Beschreibung</Label>
                  <Input placeholder="Optionale Beschreibung der Tätigkeit" />
                </div>
                <Button onClick={handleManualEntry}>
                  <Plus className="mr-2 h-4 w-4" />
                  Eintrag hinzufügen
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="statistics">
            <Card>
              <CardHeader>
                <CardTitle>Statistiken</CardTitle>
                <CardDescription>
                  Analyse Ihrer Arbeitszeiten
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Diese Woche</p>
                    <p className="text-2xl font-bold">38h 45min</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Dieser Monat</p>
                    <p className="text-2xl font-bold">156h 30min</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Gesamte Überstunden</p>
                    <p className={`text-2xl font-bold ${
                      totalOvertime.hours > 0 ? 'text-orange-600' : 'text-gray-600'
                    }`}>
                      {totalOvertime.hours}h {totalOvertime.minutes}min
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Verfügbare freie Tage</p>
                    <p className={`text-2xl font-bold ${
                      availableOvertimeDays > 0 ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {availableOvertimeDays}
                    </p>
                  </div>
                </div>
                
                {/* Overtime Summary */}
                {totalOvertime.hours > 0 && (
                  <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-orange-800">Überstunden-Zusammenfassung</h4>
                        <p className="text-sm text-orange-700">
                          Sie haben {totalOvertime.hours}h {totalOvertime.minutes}min Überstunden angesammelt.
                        </p>
                        {availableOvertimeDays > 0 && (
                          <p className="text-sm text-green-700 font-medium">
                            ✓ {availableOvertimeDays} freie Tag(e) für Überstundenausgleich verfügbar
                          </p>
                        )}
                        {totalOvertime.hours >= (EMPLOYEE_WORK_HOURS / 2) && totalOvertime.hours < EMPLOYEE_WORK_HOURS && (
                          <p className="text-sm text-orange-600">
                            Noch {EMPLOYEE_WORK_HOURS - totalOvertime.hours}h bis zum nächsten freien Tag
                          </p>
                        )}
                      </div>
                      <Timer className="h-8 w-8 text-orange-600" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default TimeTracking;