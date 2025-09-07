import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building } from "lucide-react";

const Groups = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gruppen</h1>
          <p className="text-muted-foreground">Verwalten Sie Teams und Abteilungen</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Gruppenverwaltung</CardTitle>
            <CardDescription>Alle Gruppen und Teams</CardDescription>
          </CardHeader>
          <CardContent className="text-center py-8">
            <Building className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Gruppenverwaltung wird geladen...</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Groups;