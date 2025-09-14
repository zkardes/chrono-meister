import { useAuthContext } from '@/contexts/AuthContext';
import { useAuthActions } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Building, Mail, Calendar, DollarSign, Building2 } from 'lucide-react';
import { getFullEmployeeName } from '@/lib/employee-utils';

const UserProfile = () => {
  const { user, profile, employee, company, isAuthenticated, isAdmin, isManager } = useAuthContext();
  const { signOut } = useAuthActions();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    const result = await signOut();
    if (result.success) {
      toast({
        title: "Abgemeldet",
        description: "Sie wurden erfolgreich abgemeldet.",
      });
      navigate('/login');
    } else {
      toast({
        title: "Abmeldung fehlgeschlagen",
        description: "Ein Fehler ist beim Abmelden aufgetreten.",
        variant: "destructive",
      });
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Benutzerprofil
        </CardTitle>
        <CardDescription>
          Ihre Konto- und Mitarbeiterinformationen
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* User Information */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{user?.email}</span>
          </div>
          
          {/* Role Badge */}
          <div className="flex items-center gap-2">
            <Badge variant={isAdmin ? "destructive" : isManager ? "default" : "secondary"}>
              {profile?.role?.toUpperCase() || 'EMPLOYEE'}
            </Badge>
          </div>
        </div>

        {/* Company Information */}
        {company && (
          <>
            <hr />
            <div className="space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Unternehmen
              </h4>
              
              <div className="space-y-1">
                <p className="font-medium">{company.name}</p>
                {company.domain && (
                  <p className="text-xs text-muted-foreground">{company.domain}</p>
                )}
                {company.timezone && (
                  <p className="text-xs text-muted-foreground">Zeitzone: {company.timezone}</p>
                )}
              </div>
            </div>
          </>
        )}

        {/* Employee Information */}
        {employee && (
          <>
            <hr />
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Mitarbeiterdetails</h4>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Name:</span>
                  <p>{getFullEmployeeName(employee)}</p>
                </div>
                
                <div>
                  <span className="text-muted-foreground">ID:</span>
                  <p>{employee.employee_id || 'N/A'}</p>
                </div>
                
                {employee.department && (
                  <div>
                    <span className="text-muted-foreground">Abteilung:</span>
                    <p className="flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      {employee.department}
                    </p>
                  </div>
                )}
                
                {employee.position && (
                  <div>
                    <span className="text-muted-foreground">Position:</span>
                    <p>{employee.position}</p>
                  </div>
                )}
                
                {employee.hire_date && (
                  <div>
                    <span className="text-muted-foreground">Einstellungsdatum:</span>
                    <p className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(employee.hire_date).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                )}
                
                {employee.hourly_rate && (
                  <div>
                    <span className="text-muted-foreground">Stundensatz:</span>
                    <p className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      €{employee.hourly_rate}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Sign Out Button */}
        <hr />
        <Button 
          onClick={handleSignOut} 
          variant="outline" 
          className="w-full"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Abmelden
        </Button>
      </CardContent>
    </Card>
  );
};

export default UserProfile;