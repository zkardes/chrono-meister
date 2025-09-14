import { useState, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building, Users, Clock, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Company = Tables<'companies'>;

interface CompanySelectorProps {
  onCompanySelect?: (company: Company) => void;
  showCurrentCompany?: boolean;
}

const CompanySelector = ({ onCompanySelect, showCurrentCompany = true }: CompanySelectorProps) => {
  const { user, profile, company: currentCompany, isAdmin } = useAuthContext();
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      loadAvailableCompanies();
    }
  }, [isAdmin]);

  const loadAvailableCompanies = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error loading companies:', error);
      toast({
        title: "Error",
        description: "Failed to load companies.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompanySelect = async (company: Company) => {
    try {
      // Update user profile with new company
      const { error } = await supabase
        .from('user_profiles')
        .update({ company_id: company.id })
        .eq('id', user?.id);

      if (error) throw error;

      toast({
        title: "Company Updated",
        description: `Successfully switched to ${company.name}`,
      });

      if (onCompanySelect) {
        onCompanySelect(company);
      }

      // Reload the page to refresh all data
      window.location.reload();
    } catch (error) {
      console.error('Error updating company:', error);
      toast({
        title: "Error",
        description: "Failed to switch company.",
        variant: "destructive",
      });
    }
  };

  if (!isAdmin && showCurrentCompany && currentCompany) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Current Company
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{currentCompany.name}</h3>
              <div className="space-x-2">
                <Badge variant="outline">{currentCompany.company_code}</Badge>
                <Badge variant="outline">{currentCompany.slug}</Badge>
              </div>
            </div>
            {currentCompany.timezone && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                {currentCompany.timezone}
              </div>
            )}
            {currentCompany.address && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {currentCompany.address}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Company Management
        </CardTitle>
        <CardDescription>
          Switch between companies or view company details
        </CardDescription>
      </CardHeader>
      <CardContent>
        {currentCompany && showCurrentCompany && (
          <div className="mb-4 p-3 bg-primary/10 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-primary">Current Company</h4>
              <Badge>Active</Badge>
            </div>
            <p className="text-sm">{currentCompany.name}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-4">Loading companies...</div>
        ) : (
          <div className="space-y-2">
            {companies.map((company) => (
              <div
                key={company.id}
                className={`p-3 border rounded-lg transition-colors ${
                  currentCompany?.id === company.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{company.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {company.company_code}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {company.slug}
                      </Badge>
                      {currentCompany?.id === company.id && (
                        <Badge className="text-xs">Current</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {company.timezone && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {company.timezone}
                        </div>
                      )}
                      {company.email && (
                        <div>{company.email}</div>
                      )}
                    </div>
                  </div>
                  {currentCompany?.id !== company.id && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCompanySelect(company)}
                    >
                      Switch
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CompanySelector;