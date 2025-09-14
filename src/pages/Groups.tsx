import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Building, Plus, Users, User, Download, X, Edit, Trash2, UserMinus, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/contexts/AuthContext";
import { useCompanyEmployees } from "@/hooks/use-company-data";
import { useGroupManagement, useGroupsWithDetails, CreateGroupData } from "@/hooks/use-group-management";
import { getFullEmployeeName } from "@/lib/employee-utils";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const Groups = () => {
  const { toast } = useToast();
  const { company, isAdmin, isManager } = useAuthContext();
  console.log('=== Groups Component Render ===');
  console.log('Auth Context - company:', company);
  console.log('Auth Context - isAdmin:', isAdmin);
  console.log('Auth Context - isManager:', isManager);
  
  const { data: employees = [], isLoading: employeesLoading } = useCompanyEmployees();
  const { data: groups = [], isLoading: groupsLoading, error: groupsError, refetch } = useGroupsWithDetails();
  const { createGroup, updateGroup, deleteGroup, addEmployeesToGroup, removeEmployeeFromGroup } = useGroupManagement();
  
  // Form state for creating new group
  const [newGroupData, setNewGroupData] = useState<CreateGroupData>({
    name: '',
    description: '',
    manager_id: 'no-manager',
  });
  
  // State for employee assignment
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('no-group');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check permissions
  const canManageGroups = isAdmin || isManager;
  console.log('Computed - canManageGroups:', canManageGroups);

  // Calculate statistics
  const totalMembers = groups.reduce((sum, group) => sum + group.member_count, 0);
  const departments = [...new Set(employees.map(emp => emp.department).filter(Boolean))] as string[];
  const averageGroupSize = groups.length > 0 ? Math.round(totalMembers / groups.length) : 0;

  const handleCreateGroup = async () => {
    console.log('=== handleCreateGroup START ===');
    console.log('canManageGroups:', canManageGroups);
    console.log('company:', company);
    console.log('newGroupData:', newGroupData);
    
    if (!canManageGroups) {
      console.log('User does not have permission to create groups');
      toast({
        title: "Keine Berechtigung",
        description: "Sie haben keine Berechtigung, um Gruppen zu erstellen.",
        variant: "destructive",
      });
      return;
    }

    if (!company?.id) {
      console.log('No company selected');
      toast({
        title: "Fehler",
        description: "Kein Unternehmen ausgewählt. Bitte laden Sie die Seite neu.",
        variant: "destructive",
      });
      return;
    }

    // Validate required fields
    if (!newGroupData.name.trim()) {
      console.log('Group name is required');
      toast({
        title: "Fehlerhafte Eingabe",
        description: "Bitte geben Sie einen Gruppennamen ein.",
        variant: "destructive",
      });
      return;
    }

    console.log('Attempting to create group with data:', newGroupData);
    setIsSubmitting(true);
    try {
      // Additional validation
      const groupData = {
        name: newGroupData.name.trim(),
        description: newGroupData.description?.trim() || undefined,
        manager_id: newGroupData.manager_id && newGroupData.manager_id !== "no-manager" ? newGroupData.manager_id : undefined,
      };

      console.log('Sending group data to mutation:', groupData);
      const result = await createGroup.mutateAsync(groupData);
      console.log('Group creation result:', result);
      
      toast({
        title: "Gruppe erstellt",
        description: `Die Gruppe "${newGroupData.name}" wurde erfolgreich erstellt.`,
      });
      
      // Reset form
      setNewGroupData({
        name: '',
        description: '',
        manager_id: '',
      });
    } catch (error) {
      console.error('=== ERROR CREATING GROUP ===');
      console.error('Error object:', error);
      console.error('Error type:', typeof error);
      
      // More detailed error handling
      let errorMessage = "Fehler beim Erstellen der Gruppe.";
      if (error instanceof Error) {
        errorMessage = error.message;
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = (error as { message: string }).message;
      }
      
      console.error('Final error message:', errorMessage);
      
      toast({
        title: "Fehler",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      console.log('Finished group creation process');
      setIsSubmitting(false);
    }
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!canManageGroups) {
      toast({
        title: "Keine Berechtigung",
        description: "Sie haben keine Berechtigung, um Gruppen zu löschen.",
        variant: "destructive",
      });
      return;
    }

    try {
      await deleteGroup.mutateAsync(groupId);
      toast({
        title: "Gruppe gelöscht",
        description: `Die Gruppe "${groupName}" wurde gelöscht.`,
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Fehler beim Löschen der Gruppe.",
        variant: "destructive",
      });
    }
  };

  const handleAddEmployeesToGroup = async () => {
    if (!canManageGroups) {
      toast({
        title: "Keine Berechtigung",
        description: "Sie haben keine Berechtigung, um Gruppenmitglieder zu verwalten.",
        variant: "destructive",
      });
      return;
    }

    if (selectedEmployees.length === 0) {
      toast({
        title: "Keine Mitarbeiter ausgewählt",
        description: "Bitte wählen Sie mindestens einen Mitarbeiter aus.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedGroupId || selectedGroupId === "no-group") {
      toast({
        title: "Keine Gruppe ausgewählt",
        description: "Bitte wählen Sie eine Zielgruppe aus.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await addEmployeesToGroup.mutateAsync({
        groupId: selectedGroupId,
        employeeIds: selectedEmployees,
      });
      
      toast({
        title: "Mitarbeiter hinzugefügt",
        description: `${selectedEmployees.length} Mitarbeiter wurden zur Gruppe hinzugefügt.`,
      });
      
      // Reset selections
      setSelectedEmployees([]);
      setSelectedGroupId('');
    } catch (error) {
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Fehler beim Hinzufügen der Mitarbeiter.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveEmployeeFromGroup = async (groupId: string, employeeId: string, employeeName: string, groupName: string) => {
    if (!canManageGroups) {
      toast({
        title: "Keine Berechtigung",
        description: "Sie haben keine Berechtigung, um Gruppenmitglieder zu verwalten.",
        variant: "destructive",
      });
      return;
    }

    try {
      await removeEmployeeFromGroup.mutateAsync({ groupId, employeeId });
      toast({
        title: "Mitarbeiter entfernt",
        description: `${employeeName} wurde aus der Gruppe "${groupName}" entfernt.`,
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Fehler beim Entfernen des Mitarbeiters.",
        variant: "destructive",
      });
    }
  };

  const handleExport = () => {
    if (!groups.length) {
      toast({
        title: "Keine Daten",
        description: "Keine Gruppendaten zum Exportieren verfügbar.",
        variant: "destructive",
      });
      return;
    }

    // Create CSV content
    const headers = ['Gruppenname', 'Beschreibung', 'Manager', 'Anzahl Mitglieder', 'Mitglieder', 'Erstellt am'];
    const csvContent = [
      headers.join(';'),
      ...groups.map(group => [
        group.name,
        group.description || '',
        group.manager ? getFullEmployeeName(group.manager) : '',
        group.member_count.toString(),
        group.members.map(m => getFullEmployeeName(m.employee)).join(', '),
        group.created_at ? format(new Date(group.created_at), 'dd.MM.yyyy', { locale: de }) : ''
      ].join(';'))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `gruppen_${company?.name || 'company'}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export erfolgreich",
      description: "Die Gruppendaten wurden heruntergeladen.",
    });
  };

  const toggleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const removeEmployeeFromSelection = (employeeId: string) => {
    setSelectedEmployees(prev => prev.filter(id => id !== employeeId));
  };

  console.log('Rendering Groups component');
  console.log('groups:', groups);
  console.log('employees:', employees);
  console.log('canManageGroups:', canManageGroups);
  
  // Show loading state
  if (groupsLoading || employeesLoading) {
    console.log('Showing loading state');
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Gruppen</h1>
              <p className="text-muted-foreground">
                Verwalten Sie Teams, Abteilungen und Mitarbeiterzuordnungen
              </p>
            </div>
            <Skeleton className="h-10 w-20" />
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Show error state
  if (groupsError) {
    console.log('Showing error state:', groupsError);
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Gruppen</h1>
              <p className="text-muted-foreground">
                Verwalten Sie Teams, Abteilungen und Mitarbeiterzuordnungen
              </p>
            </div>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <p className="text-destructive">Fehler beim Laden der Gruppendaten</p>
                <Button onClick={() => refetch()} variant="outline">
                  Erneut versuchen
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Gruppen</h1>
            <p className="text-muted-foreground">
              Verwalten Sie Teams, Abteilungen und Mitarbeiterzuordnungen
            </p>
          </div>
          <Button onClick={handleExport} disabled={!groups.length}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>

        {/* Group Management */}
        <Tabs defaultValue="list" className="space-y-4">
          <TabsList>
            <TabsTrigger value="list">Gruppenliste</TabsTrigger>
            <TabsTrigger value="create" disabled={!canManageGroups}>
              Gruppe erstellen
            </TabsTrigger>
            <TabsTrigger value="assign" disabled={!canManageGroups}>
              Mitarbeiter zuordnen
            </TabsTrigger>
            <TabsTrigger value="statistics">Statistiken</TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            <Card>
              <CardHeader>
                <CardTitle>Alle Gruppen</CardTitle>
                <CardDescription>
                  Übersicht aller Teams und Abteilungen in {company?.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {groups.length === 0 ? (
                    <div className="text-center py-8">
                      <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">
                        Noch keine Gruppen erstellt
                      </p>
                      {canManageGroups && (
                        <p className="text-sm text-muted-foreground">
                          Verwenden Sie den Tab "Gruppe erstellen", um neue Teams zu erstellen.
                        </p>
                      )}
                    </div>
                  ) : (
                    groups.map((group) => (
                      <div key={group.id} className="border rounded-lg p-4 hover:bg-muted/50">
                        <div className="flex items-start justify-between mb-3">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <Building className="h-5 w-5 text-primary" />
                              <h3 className="font-semibold text-lg">{group.name}</h3>
                              <Badge variant="outline">Aktiv</Badge>
                            </div>
                            {group.description && (
                              <p className="text-muted-foreground">{group.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              {group.manager && (
                                <span>Manager: {getFullEmployeeName(group.manager)}</span>
                              )}
                              {group.created_at && (
                                <span>Erstellt: {format(new Date(group.created_at), 'dd.MM.yyyy', { locale: de })}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right mr-4">
                              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                                <Users className="h-4 w-4" />
                                {group.member_count} Mitglieder
                              </div>
                            </div>
                            {canManageGroups && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteGroup(group.id, group.name)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <div className="border-t pt-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium">Mitglieder:</p>
                            {canManageGroups && group.member_count > 0 && (
                              <span className="text-xs text-muted-foreground">
                                Klicken Sie auf X um Mitglieder zu entfernen
                              </span>
                            )}
                          </div>
                          {group.members.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">Keine Mitglieder zugeordnet</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {group.members.map((member) => (
                                <div key={member.id} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1">
                                  <User className="h-3 w-3" />
                                  <span className="text-sm">{getFullEmployeeName(member.employee)}</span>
                                  {member.employee.position && (
                                    <span className="text-xs text-muted-foreground">({member.employee.position})</span>
                                  )}
                                  {canManageGroups && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-4 w-4 p-0 ml-1"
                                      onClick={() => handleRemoveEmployeeFromGroup(
                                        group.id, 
                                        member.employee.id, 
                                        getFullEmployeeName(member.employee),
                                        group.name
                                      )}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create">
            {canManageGroups ? (
              <Card>
                <CardHeader>
                  <CardTitle>Neue Gruppe erstellen</CardTitle>
                  <CardDescription>
                    Erstellen Sie eine neue Gruppe oder ein neues Team
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="groupName">Gruppenname *</Label>
                    <Input 
                      id="groupName"
                      placeholder="z.B. Team"
                      value={newGroupData.name}
                      onChange={(e) => setNewGroupData(prev => ({ ...prev, name: e.target.value }))}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="groupDescription">Beschreibung</Label>
                    <Textarea 
                      id="groupDescription"
                      placeholder="Kurze Beschreibung der Gruppe"
                      value={newGroupData.description}
                      onChange={(e) => setNewGroupData(prev => ({ ...prev, description: e.target.value }))}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="groupManager">Gruppenmanager</Label>
                    <Select 
                      value={newGroupData.manager_id || "no-manager"} 
                      onValueChange={(value) => setNewGroupData(prev => ({ ...prev, manager_id: value === "no-manager" ? "" : value }))}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Manager auswählen (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no-manager">Kein Manager</SelectItem>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {getFullEmployeeName(employee)} {employee.position && `(${employee.position})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleCreateGroup} disabled={isSubmitting}>
                    <Plus className="mr-2 h-4 w-4" />
                    {isSubmitting ? 'Wird erstellt...' : 'Gruppe erstellen'}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <p className="text-destructive">Keine Berechtigung zum Erstellen von Gruppen</p>
                    <p className="text-muted-foreground">
                      Nur Administratoren und Manager können neue Gruppen erstellen.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="assign">
            {canManageGroups ? (
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Mitarbeiter auswählen</CardTitle>
                    <CardDescription>
                      Wählen Sie Mitarbeiter aus, die einer Gruppe zugeordnet werden sollen
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {employees.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Keine Mitarbeiter verfügbar</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Fügen Sie zuerst Mitarbeiter hinzu, bevor Sie Gruppen zuordnen können.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {employees.map((employee) => (
                          <div key={employee.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted">
                            <Checkbox
                              id={`employee-${employee.id}`}
                              checked={selectedEmployees.includes(employee.id)}
                              onCheckedChange={() => toggleEmployeeSelection(employee.id)}
                              disabled={isSubmitting}
                            />
                            <div className="flex-1">
                              <Label htmlFor={`employee-${employee.id}`} className="font-medium cursor-pointer">
                                {getFullEmployeeName(employee)}
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                {employee.position || 'Keine Position'} • {employee.department || 'Keine Abteilung'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Ausgewählte Mitarbeiter ({selectedEmployees.length})</CardTitle>
                    <CardDescription>
                      Mitarbeiter, die einer Gruppe zugeordnet werden
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Zielgruppe</Label>
                      <Select value={selectedGroupId || "no-group"} onValueChange={(value) => value !== "no-group" && setSelectedGroupId(value)} disabled={isSubmitting}>
                        <SelectTrigger>
                          <SelectValue placeholder="Gruppe auswählen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no-group" disabled>Gruppe auswählen</SelectItem>
                          {groups.map((group) => (
                            <SelectItem key={group.id} value={group.id}>
                              {group.name} ({group.member_count} Mitglieder)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Ausgewählte Mitarbeiter:</Label>
                      <div className="min-h-[200px] max-h-[300px] overflow-y-auto space-y-2">
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
                                  <p className="font-medium">{getFullEmployeeName(employee)}</p>
                                  <p className="text-sm text-muted-foreground">{employee.position || 'Keine Position'}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeEmployeeFromSelection(employee.id)}
                                  disabled={isSubmitting}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : null;
                          })
                        )}
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleAddEmployeesToGroup}
                      disabled={selectedEmployees.length === 0 || !selectedGroupId || selectedGroupId === "no-group" || isSubmitting}
                      className="w-full"
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      {isSubmitting ? 'Wird hinzugefügt...' : 'Mitarbeiter zur Gruppe hinzufügen'}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <p className="text-destructive">Keine Berechtigung zum Zuweisen von Mitarbeitern</p>
                    <p className="text-muted-foreground">
                      Nur Administratoren und Manager können Mitarbeiter zu Gruppen zuordnen.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="statistics">
            <Card>
              <CardHeader>
                <CardTitle>Gruppen-Statistiken</CardTitle>
                <CardDescription>
                  Übersicht über alle Gruppen und Teams
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Aktive Gruppen</p>
                    <p className="text-2xl font-bold">{groups.length}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Gesamte Mitglieder</p>
                    <p className="text-2xl font-bold">{totalMembers}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Abteilungen</p>
                    <p className="text-2xl font-bold">{departments.length}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Durchschn. Gruppengröße</p>
                    <p className="text-2xl font-bold text-primary">
                      {averageGroupSize || 0}
                    </p>
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

export default Groups;