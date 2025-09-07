import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Plus } from "lucide-react";

const Employees = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Mitarbeiter</h1>
            <p className="text-muted-foreground">Verwalten Sie Ihr Team</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Mitarbeiter hinzufügen
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Mitarbeiterliste</CardTitle>
            <CardDescription>Alle aktiven Mitarbeiter</CardDescription>
          </CardHeader>
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Mitarbeiterverwaltung wird geladen...</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Employees;