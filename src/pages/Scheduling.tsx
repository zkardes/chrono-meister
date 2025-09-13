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
import { ChevronLeft, ChevronRight, Users, Plus, Settings, Edit, Trash2, Clock, X, Loader2 } from "lucide-react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay } from "date-fns";
import { de } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/contexts/AuthContext";
import { useTimeSlots, useScheduleAssignments, useEmployees } from "@/hooks/use-scheduling";
import { useGroups } from "@/hooks/use-groups";

const Scheduling = () => {
  const { toast } = useToast();
  const { isAdmin, employee, company } = useAuthContext();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ day: Date; timeSlotId: string } | null>(null);
  const [showSlotManager, setShowSlotManager] = useState(false);
  const [editingSlot, setEditingSlot] = useState<any>(null);
  const [showSlotDialog, setShowSlotDialog] = useState(false);
  const [slotForm, setSlotForm] = useState({ name: '', startTime: '', endTime: '', color: 'bg-blue-500/10 text-blue-700 border-blue-500/20' });
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  
  // Get week range for data fetching
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  
  // Use database hooks
  const { timeSlots, loading: timeSlotsLoading, createTimeSlot, updateTimeSlot, deleteTimeSlot } = useTimeSlots();
  const { 
    scheduleAssignments, 
    loading: assignmentsLoading, 
    assignEmployee, 
    unassignEmployee, 
    getAssignmentsForSlot 
  } = useScheduleAssignments(format(weekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd'));
  const { employees, loading: employeesLoading, getEmployeesByGroup } = useEmployees();
  const { groups, loading: groupsLoading } = useGroups();
  
  // Loading state
  const isLoading = timeSlotsLoading || assignmentsLoading || employeesLoading || groupsLoading;
  
  // Check if user has admin/manager permissions
  const canManageSchedules = isAdmin;

  // Format groups for Select component
  const groupOptions = [
    { id: "all", name: "Alle Gruppen" },
    ...groups.map(group => ({ id: group.id, name: group.name }))
  ];

  // Color options for time slots
  const colorOptions = [
    { label: "Blau", value: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
    { label: "Orange", value: "bg-orange-500/10 text-orange-700 border-orange-500/20" },
    { label: "Lila", value: "bg-purple-500/10 text-purple-700 border-purple-500/20" },
    { label: "Grün", value: "bg-green-500/10 text-green-700 border-green-500/20" },
    { label: "Rot", value: "bg-red-500/10 text-red-700 border-red-500/20" },
    { label: "Gelb", value: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20" },
  ];

  // Helper function to format employee name (FirstName. LastNameInitial)
  const formatEmployeeName = (employee: any): string => {
    if (employee.first_name && employee.last_name) {
      const firstNameInitial = employee.first_name.charAt(0);
      const lastNameInitial = employee.last_name.charAt(0);
      return `${employee.first_name}. ${lastNameInitial}`;
    }
    return employee.first_name || employee.last_name || 'Unknown';
  };

  // Get available employees based on selected group
  const getAvailableEmployees = () => {
    return getEmployeesByGroup(selectedGroup === "all" ? undefined : selectedGroup);
  };

  // Get employees assigned to a specific slot
  const getEmployeesForSlot = (day: Date, timeSlotId: string) => {
    const dateKey = format(day, "yyyy-MM-dd");
    const assignments = getAssignmentsForSlot(timeSlotId, dateKey);
    
    const assignedEmployees = assignments
      .map(assignment => {
        // Find the employee from our employees list since the assignment contains employee_id
        return employees.find(emp => emp.id === assignment.employee_id);
      })
      .filter(Boolean);
    
    // For employees: only show themselves
    if (!canManageSchedules && employee) {
      return assignedEmployees.filter(emp => emp && emp.id === employee.id);
    }
    
    // For admins: filter by selected group
    if (selectedGroup === "all") {
      return assignedEmployees;
    }
    
    return assignedEmployees.filter(emp => {
      const empWithGroups = emp as any; // Type assertion for employee_groups
      return emp && empWithGroups.employee_groups?.some((eg: any) => eg.group?.id === selectedGroup);
    });
  };

  // Check if current employee has assignment for this slot
  const hasEmployeeAssignment = (day: Date, timeSlotId: string): boolean => {
    if (!employee) return false;
    const dateKey = format(day, "yyyy-MM-dd");
    const assignments = getAssignmentsForSlot(timeSlotId, dateKey);
    return assignments.some(assignment => assignment.employee_id === employee.id);
  };

  // Employee can request assignment or removal from shifts
  const handleEmployeeShiftChange = async (day: Date, timeSlotId: string) => {
    if (canManageSchedules || !employee) return;
    
    const hasAssignment = hasEmployeeAssignment(day, timeSlotId);
    const actionText = hasAssignment ? "abmelden" : "anmelden";
    const confirmText = hasAssignment 
      ? "Möchten Sie sich von dieser Schicht abmelden?" 
      : "Möchten Sie sich für diese Schicht anmelden?";
    
    if (window.confirm(confirmText)) {
      try {
        const dateKey = format(day, "yyyy-MM-dd");
        
        if (hasAssignment) {
          await unassignEmployee(employee.id, timeSlotId, dateKey);
        } else {
          await assignEmployee(employee.id, timeSlotId, dateKey);
        }
      } catch (error) {
        console.error('Error changing shift assignment:', error);
      }
    }
  };

  const navigateWeek = (direction: "prev" | "next") => {
    setCurrentWeek(direction === "next" ? addWeeks(currentWeek, 1) : subWeeks(currentWeek, 1));
  };

  const handleAssignEmployee = (day: Date, timeSlotId: string) => {
    // Employee can only manage their own shifts
    if (!canManageSchedules) {
      handleEmployeeShiftChange(day, timeSlotId);
      return;
    }
    
    // Admin functionality
    setSelectedSlot({ day, timeSlotId });
    setSelectedEmployees([]);
    setShowAssignDialog(true);
  };

  const handleSaveAssignment = async () => {
    if (!selectedSlot || selectedEmployees.length === 0) {
      toast({
        title: "Keine Mitarbeiter ausgewählt",
        description: "Bitte wählen Sie mindestens einen Mitarbeiter aus.",
        variant: "destructive",
      });
      return;
    }

    try {
      const dateKey = format(selectedSlot.day, "yyyy-MM-dd");
      
      // Assign all selected employees
      for (const employeeId of selectedEmployees) {
        await assignEmployee(employeeId, selectedSlot.timeSlotId, dateKey);
      }

      setShowAssignDialog(false);
      setSelectedEmployees([]);
    } catch (error) {
      console.error('Error saving assignments:', error);
    }
  };

  const toggleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const removeEmployeeFromSlot = async (day: Date, timeSlotId: string, employeeId: string) => {
    // Employees can only remove themselves
    if (!canManageSchedules && employee && employeeId !== employee.id) {
      toast({
        title: "Keine Berechtigung",
        description: "Sie können nur Ihre eigenen Schichten ändern.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const dateKey = format(day, "yyyy-MM-dd");
      await unassignEmployee(employeeId, timeSlotId, dateKey);
    } catch (error) {
      console.error('Error removing employee from slot:', error);
    }
  };

  const handleCreateSlot = () => {
    setSlotForm({ name: '', startTime: '', endTime: '', color: colorOptions[0].value });
    setEditingSlot(null);
    setShowSlotDialog(true);
  };

  const handleEditSlot = (slot: any) => {
    setSlotForm({ 
      name: slot.name, 
      startTime: slot.start_time, 
      endTime: slot.end_time, 
      color: slot.color 
    });
    setEditingSlot(slot);
    setShowSlotDialog(true);
  };

  const handleSaveSlot = async () => {
    if (!slotForm.name || !slotForm.startTime || !slotForm.endTime) {
      toast({
        title: "Unvollständige Eingabe",
        description: "Bitte füllen Sie alle Felder aus.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingSlot) {
        await updateTimeSlot(editingSlot.id, {
          name: slotForm.name,
          start_time: slotForm.startTime,
          end_time: slotForm.endTime,
          color: slotForm.color,
        });
      } else {
        await createTimeSlot({
          name: slotForm.name,
          start_time: slotForm.startTime,
          end_time: slotForm.endTime,
          color: slotForm.color,
          is_active: true,
        });
      }
      setShowSlotDialog(false);
    } catch (error) {
      console.error('Error saving slot:', error);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    try {
      await deleteTimeSlot(slotId);
    } catch (error) {
      console.error('Error deleting slot:', error);
    }
  };

  // Sort time slots by starting time
  const sortedTimeSlots = [...timeSlots].sort((a, b) => {
    const timeA = a.start_time?.split(':').map(Number) || [0, 0];
    const timeB = b.start_time?.split(':').map(Number) || [0, 0];
    const minutesA = timeA[0] * 60 + timeA[1];
    const minutesB = timeB[0] * 60 + timeB[1];
    return minutesA - minutesB;
  });

  // Show loading state
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Schichtpläne werden geladen...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Schichtplanung</h1>
            <p className="text-muted-foreground">
              {canManageSchedules ? "Planen Sie Arbeitsschichten für Ihre Teams" : "Ihre persönlichen Schichtpläne"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canManageSchedules && (
              <Button variant="outline" onClick={() => setShowSlotManager(true)}>
                <Settings className="mr-2 h-4 w-4" />
                Zeitslots verwalten
              </Button>
            )}
            {canManageSchedules && (
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Gruppe wählen" />
                </SelectTrigger>
                <SelectContent>
                  {groupOptions.map((group) => (
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
                  {canManageSchedules && selectedGroup !== "all" && ` • ${groupOptions.find(g => g.id === selectedGroup)?.name}`}
                  {!canManageSchedules && ` • Ihre persönlichen Schichten`}
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
                      <span className="text-xs text-muted-foreground">{slot.start_time} - {slot.end_time}</span>
                    </div>
                    {weekDays.map((day) => {
                      const employees = getEmployeesForSlot(day, slot.id);
                      return (
                        <div
                          key={day.toISOString()}
                          className={`border rounded-lg p-2 min-h-[80px] transition-colors ${
                            !canManageSchedules 
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
                                <div key={employee?.id} className="flex items-center justify-between">
                                  <Badge variant="secondary" className="text-xs flex-1 mr-1">
                                    {!canManageSchedules ? "Ihre Schicht" : (employee ? formatEmployeeName(employee) : "Unknown")}
                                  </Badge>
                                  {(canManageSchedules || (!canManageSchedules && employee?.id === employee?.id)) && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-4 w-4 p-0 opacity-50 hover:opacity-100"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (employee?.id) removeEmployeeFromSlot(day, slot.id, employee.id);
                                      }}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              ))
                            ) : (
                              <div className="flex items-center justify-center h-[60px]">
                                {!canManageSchedules ? (
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
                      {slot.name} ({slot.start_time} - {slot.end_time})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assign Employee Dialog - Admin Only */}
        {showAssignDialog && selectedSlot && canManageSchedules && (
          <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Mitarbeiter zuweisen</DialogTitle>
                <DialogDescription>
                  {format(selectedSlot.day, "EEEE, dd. MMM yyyy", { locale: de })} •{" "}
                  {sortedTimeSlots.find(s => s.id === selectedSlot.timeSlotId)?.name}
                  {selectedGroup !== "all" && ` • ${groupOptions.find(g => g.id === selectedGroup)?.name}`}
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
                            {employee.first_name} {employee.last_name}
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
                        const employee = employees.find(emp => emp.id === employeeId);
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
        {showSlotManager && canManageSchedules && (
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
                            {slot.start_time} - {slot.end_time}
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
        {showSlotDialog && canManageSchedules && (
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