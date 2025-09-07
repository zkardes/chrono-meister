import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";

const Scheduling = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Schichtplanung</h1>
          <p className="text-muted-foreground">Planen Sie Arbeitsschichten</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Schichtplan</CardTitle>
            <CardDescription>Wochenübersicht</CardDescription>
          </CardHeader>
          <CardContent className="text-center py-8">
            <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Schichtplanung wird geladen...</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Scheduling;