import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, Users, Plus, Settings, Edit, Trash2, Clock, X } from "lucide-react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay } from "date-fns";
import { de } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface TimeSlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  color: string;
}

interface Employee {
  id: number;
  name: string;
  position: string;
  department: string;
  groupIds: number[];
}

interface Group {
  id: number;
  name: string;
  department: string;
  memberIds: number[];
}

const Scheduling = () => {
  const { toast } = useToast();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ day: Date; shift: string } | null>(null);
  const [showSlotManager, setShowSlotManager] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const [showSlotDialog, setShowSlotDialog] = useState(false);
  const [slotForm, setSlotForm] = useState({ name: '', startTime: '', endTime: '', color: 'bg-blue-500/10 text-blue-700 border-blue-500/20' });
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [scheduleAssignments, setScheduleAssignments] = useState<Record<string, Record<string, number[]>>>({});
  
  // Get user role and current user ID
  const userRole = localStorage.getItem("userRole") || "employee";
  const currentUserId = parseInt(localStorage.getItem("currentUserId") || "1"); // Default to user ID 1 for demo

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Employee and Group data (integrated from other pages)
  const allEmployees: Employee[] = [
    { id: 1, name: "Max Mustermann", position: "Erzieher", department: "Kita", groupIds: [1] },
    { id: 2, name: "Anna Schmidt", position: "Erzieherin", department: "Kita", groupIds: [1] },
    { id: 3, name: "Thomas Weber", position: "Kita - Leitung", department: "Management", groupIds: [3] },
    { id: 4, name: "Lisa Müller", position: "FSJ", department: "Ausbildung", groupIds: [2] },
    { id: 5, name: "Peter Klein", position: "DevOps Engineer", department: "IT", groupIds: [1] },
    { id: 6, name: "Sarah Johnson", position: "UX Designerin", department: "Design", groupIds: [2] },
  ];

  const allGroups: Group[] = [
    { id: 1, name: "Entwicklungsteam", department: "IT", memberIds: [1, 2, 5] },
    { id: 2, name: "Design Team", department: "Design", memberIds: [4, 6] },
    { id: 3, name: "Management Team", department: "Management", memberIds: [3] },
  ];

  const groups = [
    { id: "all", name: "Alle Gruppen" },
    ...allGroups.map(group => ({ id: group.id.toString(), name: group.name }))
  ];

  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([
    { id: "morning", name: "Frühschicht", startTime: "06:00", endTime: "14:00", color: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
    { id: "afternoon", name: "Spätschicht", startTime: "14:00", endTime: "22:00", color: "bg-orange-500/10 text-orange-700 border-orange-500/20" },
    { id: "night", name: "Nachtschicht", startTime: "22:00", endTime: "06:00", color: "bg-purple-500/10 text-purple-700 border-purple-500/20" },
  ]);

  const colorOptions = [
    { label: "Blau", value: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
    { label: "Orange", value: "bg-orange-500/10 text-orange-700 border-orange-500/20" },
    { label: "Lila", value: "bg-purple-500/10 text-purple-700 border-purple-500/20" },
    { label: "Grün", value: "bg-green-500/10 text-green-700 border-green-500/20" },
    { label: "Rot", value: "bg-red-500/10 text-red-700 border-red-500/20" },
    { label: "Gelb", value: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20" },
  ];

  // Sample schedule data - now using employee IDs
  const sampleScheduleData = {
    "2024-01-08": {
      morning: [1, 2], // Max Mustermann, Anna Schmidt
      afternoon: [4, 5], // Lisa Müller, Peter Klein
      night: [3], // Thomas Weber
    },
    "2024-01-09": {
      morning: [4, 1], // Lisa Müller, Max Mustermann
      afternoon: [2], // Anna Schmidt
      night: [5], // Peter Klein
    },
    "2024-01-10": {
      morning: [3, 2], // Thomas Weber, Anna Schmidt
      afternoon: [1, 4], // Max Mustermann, Lisa Müller
      night: [],
    },
  };

  // Helper function to format employee name (FirstName. LastNameInitial)
  const formatEmployeeName = (employee: Employee): string => {
    const nameParts = employee.name.split(' ');
    if (nameParts.length >= 2) {
      const firstName = nameParts[0];
      const lastNameInitial = nameParts[nameParts.length - 1].charAt(0);
      return `${firstName}. ${lastNameInitial}`;
    }
    return employee.name;
  };

  // Get available employees based on selected group
  const getAvailableEmployees = (): Employee[] => {
    if (selectedGroup === "all") {
      return allEmployees;
    }
    
    const groupId = parseInt(selectedGroup);
    const group = allGroups.find(g => g.id === groupId);
    
    if (!group) return [];
    
    return allEmployees.filter(emp => group.memberIds.includes(emp.id));
  };

  // Get employees assigned to a specific slot
  const getEmployeesForSlot = (day: Date, shiftId: string): Employee[] => {
    const dateKey = format(day, "yyyy-MM-dd");
    const employeeIds = scheduleAssignments[dateKey]?.[shiftId] || sampleScheduleData[dateKey]?.[shiftId] || [];
    
    const employees = employeeIds.map(id => allEmployees.find(emp => emp.id === id)).filter(Boolean) as Employee[];
    
    // For employees: only show themselves
    if (userRole === "employee") {
      return employees.filter(emp => emp.id === currentUserId);
    }
    
    // For admins: filter by selected group
    if (selectedGroup === "all") {
      return employees;
    }
    
    const groupId = parseInt(selectedGroup);
    const group = allGroups.find(g => g.id === groupId);
    
    if (!group) return [];
    
    return employees.filter(emp => group.memberIds.includes(emp.id));
  };

  // Check if a slot has any assignments (for employee view)
  const hasEmployeeAssignment = (day: Date, shiftId: string): boolean => {
    const dateKey = format(day, "yyyy-MM-dd");
    const employeeIds = scheduleAssignments[dateKey]?.[shiftId] || sampleScheduleData[dateKey]?.[shiftId] || [];
    return employeeIds.includes(currentUserId);
  };

  // Employee can only request to be removed from their shifts
  const handleEmployeeShiftChange = (day: Date, shift: string) => {
    if (userRole !== "employee") return;
    
    const hasAssignment = hasEmployeeAssignment(day, shift);
    const actionText = hasAssignment ? "abmelden" : "anmelden";
    const confirmText = hasAssignment 
      ? "Möchten Sie sich von dieser Schicht abmelden?" 
      : "Möchten Sie sich für diese Schicht anmelden?";
    
    if (window.confirm(confirmText)) {
      const dateKey = format(day, "yyyy-MM-dd");
      
      setScheduleAssignments(prev => {
        const currentAssignments = prev[dateKey]?.[shift] || sampleScheduleData[dateKey]?.[shift] || [];
        const updatedAssignments = hasAssignment
          ? currentAssignments.filter(id => id !== currentUserId)
          : [...currentAssignments, currentUserId];
        
        return {
          ...prev,
          [dateKey]: {
            ...prev[dateKey],
            [shift]: updatedAssignments
          }
        };
      });
      
      toast({
        title: hasAssignment ? "Abgemeldet" : "Angemeldet",
        description: `Sie wurden erfolgreich von der Schicht ${hasAssignment ? 'ab' : 'an'}gemeldet.`,
      });
    }
  };

  const navigateWeek = (direction: "prev" | "next") => {
    setCurrentWeek(direction === "next" ? addWeeks(currentWeek, 1) : subWeeks(currentWeek, 1));
  };

  const handleAssignEmployee = (day: Date, shift: string) => {
    // Employee can only manage their own shifts
    if (userRole === "employee") {
      handleEmployeeShiftChange(day, shift);
      return;
    }
    
    // Admin functionality
    setSelectedSlot({ day, shift });
    setSelectedEmployees([]);
    setShowAssignDialog(true);
  };

  const handleSaveAssignment = () => {
    if (!selectedSlot || selectedEmployees.length === 0) {
      toast({
        title: "Keine Mitarbeiter ausgewählt",
        description: "Bitte wählen Sie mindestens einen Mitarbeiter aus.",
        variant: "destructive",
      });
      return;
    }

    const dateKey = format(selectedSlot.day, "yyyy-MM-dd");
    
    setScheduleAssignments(prev => ({
      ...prev,
      [dateKey]: {
        ...prev[dateKey],
        [selectedSlot.shift]: selectedEmployees
      }
    }));

    toast({
      title: "Mitarbeiter zugewiesen",
      description: `${selectedEmployees.length} Mitarbeiter wurden erfolgreich zugewiesen.`,
    });

    setShowAssignDialog(false);
    setSelectedEmployees([]);
  };

  const toggleEmployeeSelection = (employeeId: number) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const removeEmployeeFromSlot = (day: Date, shiftId: string, employeeId: number) => {
    // Employees can only remove themselves
    if (userRole === "employee" && employeeId !== currentUserId) {
      toast({
        title: "Keine Berechtigung",
        description: "Sie können nur Ihre eigenen Schichten ändern.",
        variant: "destructive",
      });
      return;
    }
    
    const dateKey = format(day, "yyyy-MM-dd");
    
    setScheduleAssignments(prev => {
      const currentAssignments = prev[dateKey]?.[shiftId] || [];
      const updatedAssignments = currentAssignments.filter(id => id !== employeeId);
      
      return {
        ...prev,
        [dateKey]: {
          ...prev[dateKey],
          [shiftId]: updatedAssignments
        }
      };
    });

    toast({
      title: "Mitarbeiter entfernt",
      description: userRole === "employee" ? "Sie wurden von der Schicht abgemeldet." : "Der Mitarbeiter wurde von der Schicht entfernt.",
    });
  };

  const handleCreateSlot = () => {
    setSlotForm({ name: '', startTime: '', endTime: '', color: colorOptions[0].value });
    setEditingSlot(null);
    setShowSlotDialog(true);
  };

  const handleEditSlot = (slot: TimeSlot) => {
    setSlotForm({ name: slot.name, startTime: slot.startTime, endTime: slot.endTime, color: slot.color });
    setEditingSlot(slot);
    setShowSlotDialog(true);
  };

  const handleSaveSlot = () => {
    if (!slotForm.name || !slotForm.startTime || !slotForm.endTime) {
      toast({
        title: "Unvollständige Eingabe",
        description: "Bitte füllen Sie alle Felder aus.",
        variant: "destructive",
      });
      return;
    }

    if (editingSlot) {
      setTimeSlots(prev => prev.map(slot => 
        slot.id === editingSlot.id 
          ? { ...slot, name: slotForm.name, startTime: slotForm.startTime, endTime: slotForm.endTime, color: slotForm.color }
          : slot
      ));
      toast({
        title: "Zeitslot aktualisiert",
        description: `${slotForm.name} wurde erfolgreich aktualisiert.`,
      });
    } else {
      const newSlot: TimeSlot = {
        id: Date.now().toString(),
        name: slotForm.name,
        startTime: slotForm.startTime,
        endTime: slotForm.endTime,
        color: slotForm.color,
      };
      setTimeSlots(prev => [...prev, newSlot]);
      toast({
        title: "Zeitslot erstellt",
        description: `${slotForm.name} wurde erfolgreich erstellt.`,
      });
    }
    setShowSlotDialog(false);
  };

  const handleDeleteSlot = (slotId: string) => {
    setTimeSlots(prev => prev.filter(slot => slot.id !== slotId));
    toast({
      title: "Zeitslot gelöscht",
      description: "Der Zeitslot wurde erfolgreich entfernt.",
    });
  };

  // Sort time slots by starting time
  const sortedTimeSlots = [...timeSlots].sort((a, b) => {
    const timeA = a.startTime.split(':').map(Number);
    const timeB = b.startTime.split(':').map(Number);
    const minutesA = timeA[0] * 60 + timeA[1];
    const minutesB = timeB[0] * 60 + timeB[1];
    return minutesA - minutesB;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Schichtplanung</h1>
            <p className="text-muted-foreground">
              {userRole === "admin" ? "Planen Sie Arbeitsschichten für Ihre Teams" : "Ihre persönlichen Schichtpläne"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {userRole === "admin" && (
              <Button variant="outline" onClick={() => setShowSlotManager(true)}>
                <Settings className="mr-2 h-4 w-4" />
                Zeitslots verwalten
              </Button>
            )}
            {userRole === "admin" && (
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
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Wochenansicht</CardTitle>
                <CardDescription>
                  {format(weekStart, "dd. MMM", { locale: de })} - {format(weekEnd, "dd. MMM yyyy", { locale: de })}
                  {userRole === "admin" && selectedGroup !== "all" && ` • ${groups.find(g => g.id === selectedGroup)?.name}`}
                  {userRole === "employee" && ` • Ihre persönlichen Schichten`}
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
                {sortedTimeSlots.map((slot) => (
                  <div key={slot.id} className="grid grid-cols-8 gap-4 mb-4">
                    <div className="flex flex-col">
                      <span className="font-medium">{slot.name}</span>
                      <span className="text-xs text-muted-foreground">{slot.startTime} - {slot.endTime}</span>
                    </div>
                    {weekDays.map((day) => {
                      const employees = getEmployeesForSlot(day, slot.id);
                      return (
                        <div
                          key={day.toISOString()}
                          className={`border rounded-lg p-2 min-h-[80px] transition-colors ${
                            userRole === "employee" 
                              ? (hasEmployeeAssignment(day, slot.id) 
                                  ? `${slot.color} cursor-pointer hover:bg-muted/50` 
                                  : 'bg-gray-50 border-gray-200 cursor-pointer hover:bg-gray-100')
                              : `${slot.color} cursor-pointer hover:bg-muted/50`
                          }`}
                          onClick={() => handleAssignEmployee(day, slot.id)}
                        >
                          <div className="space-y-1">
                            {employees.length > 0 ? (
                              employees.map((employee) => (
                                <div key={employee.id} className="flex items-center justify-between">
                                  <Badge variant="secondary" className="text-xs flex-1 mr-1">
                                    {userRole === "employee" ? "Ihre Schicht" : formatEmployeeName(employee)}
                                  </Badge>
                                  {(userRole === "admin" || (userRole === "employee" && employee.id === currentUserId)) && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-4 w-4 p-0 opacity-50 hover:opacity-100"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeEmployeeFromSlot(day, slot.id, employee.id);
                                      }}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              ))
                            ) : (
                              <div className="flex items-center justify-center h-[60px]">
                                {userRole === "employee" ? (
                                  <span className="text-xs text-muted-foreground">
                                    Klicken zum Anmelden
                                  </span>
                                ) : (
                                  <Plus className="h-4 w-4 text-muted-foreground" />
                                )}
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
                {sortedTimeSlots.map((slot) => (
                  <div key={slot.id} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded border ${slot.color}`} />
                    <span className="text-sm text-muted-foreground">
                      {slot.name} ({slot.startTime} - {slot.endTime})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assign Employee Dialog - Admin Only */}
        {showAssignDialog && selectedSlot && userRole === "admin" && (
          <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Mitarbeiter zuweisen</DialogTitle>
                <DialogDescription>
                  {format(selectedSlot.day, "EEEE, dd. MMM yyyy", { locale: de })} •{" "}
                  {sortedTimeSlots.find(s => s.id === selectedSlot.shift)?.name}
                  {selectedGroup !== "all" && ` • ${groups.find(g => g.id === selectedGroup)?.name}`}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h4 className="font-medium mb-3">Verfügbare Mitarbeiter</h4>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {getAvailableEmployees().map((employee) => (
                      <div key={employee.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted">
                        <Checkbox
                          id={`assign-employee-${employee.id}`}
                          checked={selectedEmployees.includes(employee.id)}
                          onCheckedChange={() => toggleEmployeeSelection(employee.id)}
                        />
                        <div className="flex-1">
                          <Label htmlFor={`assign-employee-${employee.id}`} className="font-medium cursor-pointer">
                            {employee.name}
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            {employee.position} • {employee.department}
                          </p>
                        </div>
                      </div>
                    ))}
                    {getAvailableEmployees().length === 0 && (
                      <p className="text-muted-foreground text-sm text-center py-8">
                        Keine Mitarbeiter in der ausgewählten Gruppe verfügbar
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3">Ausgewählte Mitarbeiter ({selectedEmployees.length})</h4>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {selectedEmployees.length === 0 ? (
                      <p className="text-muted-foreground text-sm text-center py-8">
                        Keine Mitarbeiter ausgewählt
                      </p>
                    ) : (
                      selectedEmployees.map((employeeId) => {
                        const employee = allEmployees.find(emp => emp.id === employeeId);
                        return employee ? (
                          <div key={employee.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                            <div>
                              <p className="font-medium">{formatEmployeeName(employee)}</p>
                              <p className="text-sm text-muted-foreground">{employee.position}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleEmployeeSelection(employee.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : null;
                      })
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAssignDialog(false)}>Abbrechen</Button>
                <Button onClick={handleSaveAssignment} disabled={selectedEmployees.length === 0}>
                  <Users className="mr-2 h-4 w-4" />
                  Mitarbeiter zuweisen
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Slot Manager Dialog - Admin Only */}
        {showSlotManager && userRole === "admin" && (
          <Dialog open={showSlotManager} onOpenChange={setShowSlotManager}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Zeitslots verwalten</DialogTitle>
                <DialogDescription>
                  Erstellen, bearbeiten und löschen Sie Zeitslots für die Schichtplanung
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Button onClick={handleCreateSlot}>
                  <Plus className="mr-2 h-4 w-4" />
                  Neuen Zeitslot erstellen
                </Button>
                <div className="grid gap-4">
                  {sortedTimeSlots.map((slot) => (
                    <div key={slot.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className={`w-6 h-6 rounded border ${slot.color}`} />
                        <div>
                          <h4 className="font-medium">{slot.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {slot.startTime} - {slot.endTime}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditSlot(slot)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteSlot(slot.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Create/Edit Slot Dialog - Admin Only */}
        {showSlotDialog && userRole === "admin" && (
          <Dialog open={showSlotDialog} onOpenChange={setShowSlotDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingSlot ? 'Zeitslot bearbeiten' : 'Neuen Zeitslot erstellen'}</DialogTitle>
                <DialogDescription>
                  {editingSlot ? 'Bearbeiten Sie die Eigenschaften des Zeitslots' : 'Erstellen Sie einen neuen Zeitslot für die Schichtplanung'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    placeholder="z.B. Vormittagsschicht"
                    value={slotForm.name}
                    onChange={(e) => setSlotForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Startzeit</Label>
                    <Input
                      type="time"
                      value={slotForm.startTime}
                      onChange={(e) => setSlotForm(prev => ({ ...prev, startTime: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Endzeit</Label>
                    <Input
                      type="time"
                      value={slotForm.endTime}
                      onChange={(e) => setSlotForm(prev => ({ ...prev, endTime: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Farbe</Label>
                  <Select value={slotForm.color} onValueChange={(value) => setSlotForm(prev => ({ ...prev, color: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {colorOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded border ${option.value}`} />
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSlotDialog(false)}>Abbrechen</Button>
                <Button onClick={handleSaveSlot}>
                  <Clock className="mr-2 h-4 w-4" />
                  {editingSlot ? 'Aktualisieren' : 'Erstellen'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Scheduling;