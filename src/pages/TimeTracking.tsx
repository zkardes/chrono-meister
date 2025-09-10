import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Play, Pause, Coffee, Plus, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TimeTracking = () => {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const timeEntries = [
    { id: 1, date: "2024-01-15", start: "09:00", end: "12:30", duration: "3h 30min" },
    { id: 2, date: "2024-01-15", start: "13:30", end: "17:45", duration: "4h 15min" },
    { id: 3, date: "2024-01-14", start: "08:30", end: "12:00", duration: "3h 30min" },
    { id: 4, date: "2024-01-14", start: "13:00", end: "18:00", duration: "5h 00min" },
  ];

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
                  {timeEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted">
                      <div className="flex items-center gap-4">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {entry.date} • {entry.start} - {entry.end}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{entry.duration}</p>
                      </div>
                    </div>
                  ))}
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
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Diese Woche</p>
                    <p className="text-2xl font-bold">38h 45min</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Dieser Monat</p>
                    <p className="text-2xl font-bold">156h 30min</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Überstunden</p>
                    <p className="text-2xl font-bold text-primary">+4h 30min</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default TimeTracking;