import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Users, Plus } from "lucide-react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay } from "date-fns";
import { de } from "date-fns/locale";

const Scheduling = () => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ day: Date; shift: string } | null>(null);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const groups = [
    { id: "all", name: "Alle Gruppen" },
    { id: "1", name: "Verkauf" },
    { id: "2", name: "Lager" },
    { id: "3", name: "Büro" },
  ];

  const shifts = [
    { id: "morning", name: "Frühschicht", time: "06:00 - 14:00", color: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
    { id: "afternoon", name: "Spätschicht", time: "14:00 - 22:00", color: "bg-orange-500/10 text-orange-700 border-orange-500/20" },
    { id: "night", name: "Nachtschicht", time: "22:00 - 06:00", color: "bg-purple-500/10 text-purple-700 border-purple-500/20" },
  ];

  // Sample schedule data
  const scheduleData = {
    "2024-01-08": {
      morning: ["Max Mustermann", "Anna Schmidt"],
      afternoon: ["Peter Weber", "Lisa Müller"],
      night: ["Tom Wagner"],
    },
    "2024-01-09": {
      morning: ["Lisa Müller", "Max Mustermann"],
      afternoon: ["Anna Schmidt"],
      night: ["Peter Weber"],
    },
    "2024-01-10": {
      morning: ["Tom Wagner", "Anna Schmidt"],
      afternoon: ["Max Mustermann", "Lisa Müller"],
      night: [],
    },
  };

  const navigateWeek = (direction: "prev" | "next") => {
    setCurrentWeek(direction === "next" ? addWeeks(currentWeek, 1) : subWeeks(currentWeek, 1));
  };

  const handleAssignEmployee = (day: Date, shift: string) => {
    setSelectedSlot({ day, shift });
    setShowAssignDialog(true);
  };

  const getEmployeesForSlot = (day: Date, shiftId: string) => {
    const dateKey = format(day, "yyyy-MM-dd");
    return scheduleData[dateKey]?.[shiftId] || [];
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Schichtplanung</h1>
            <p className="text-muted-foreground">Planen Sie Arbeitsschichten für Ihre Teams</p>
          </div>
          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Gruppe wählen" />
            </SelectTrigger>
            <SelectContent>
              {groups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {group.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Wochenansicht</CardTitle>
                <CardDescription>
                  {format(weekStart, "dd. MMM", { locale: de })} - {format(weekEnd, "dd. MMM yyyy", { locale: de })}
                  {selectedGroup !== "all" && ` • ${groups.find(g => g.id === selectedGroup)?.name}`}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateWeek("prev")}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentWeek(new Date())}
                >
                  Heute
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateWeek("next")}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Header with weekdays */}
                <div className="grid grid-cols-8 gap-4 mb-4">
                  <div className="font-medium text-muted-foreground">Schicht</div>
                  {weekDays.map((day) => (
                    <div key={day.toISOString()} className="text-center">
                      <div className="font-medium">{format(day, "EEE", { locale: de })}</div>
                      <div className={`text-sm ${isSameDay(day, new Date()) ? "text-primary font-bold" : "text-muted-foreground"}`}>
                        {format(day, "dd.MM")}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Shift rows */}
                {shifts.map((shift) => (
                  <div key={shift.id} className="grid grid-cols-8 gap-4 mb-4">
                    <div className="flex flex-col">
                      <span className="font-medium">{shift.name}</span>
                      <span className="text-xs text-muted-foreground">{shift.time}</span>
                    </div>
                    {weekDays.map((day) => {
                      const employees = getEmployeesForSlot(day, shift.id);
                      return (
                        <div
                          key={day.toISOString()}
                          className={`border rounded-lg p-2 min-h-[80px] hover:bg-muted/50 cursor-pointer transition-colors ${shift.color}`}
                          onClick={() => handleAssignEmployee(day, shift.id)}
                        >
                          <div className="space-y-1">
                            {employees.map((employee, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {employee}
                              </Badge>
                            ))}
                            {employees.length === 0 && (
                              <div className="flex items-center justify-center h-[60px]">
                                <Plus className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="mt-6 pt-6 border-t">
              <div className="flex flex-wrap gap-4">
                {shifts.map((shift) => (
                  <div key={shift.id} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded border ${shift.color}`} />
                    <span className="text-sm text-muted-foreground">
                      {shift.name} ({shift.time})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assign Employee Dialog */}
        {showAssignDialog && selectedSlot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Mitarbeiter zuweisen</CardTitle>
                <CardDescription>
                  {format(selectedSlot.day, "EEEE, dd. MMM yyyy", { locale: de })} •{" "}
                  {shifts.find(s => s.id === selectedSlot.shift)?.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Mitarbeiterzuweisung wird implementiert...
                </p>
                <div className="flex gap-2">
                  <Button onClick={() => setShowAssignDialog(false)}>Schließen</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Scheduling;