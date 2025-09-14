import { useState, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Copy, RefreshCw, Eye, EyeOff, Building } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const CompanyCodeManager = () => {
  const { company, isAdmin } = useAuthContext();
  const { toast } = useToast();
  const [showCode, setShowCode] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (company?.company_code) {
      setNewCode(company.company_code);
    }
  }, [company?.company_code]);

  // Only show to admins
  if (!isAdmin || !company) {
    return null;
  }

  const generateCompanyCode = () => {
    setIsGenerating(true);
    // Generate a random company code (company name + year + random)
    const companyPrefix = company.name
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .substring(0, 4);
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 999).toString().padStart(3, '0');
    const generated = `${companyPrefix}${year}${random}`;
    setNewCode(generated);
    setIsGenerating(false);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(company.company_code || '');
      toast({
        title: "Copied!",
        description: "Company code copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy company code.",
        variant: "destructive",
      });
    }
  };

  const updateCompanyCode = async () => {
    if (!newCode.trim() || newCode === company.company_code) {
      return;
    }

    // Validate format (alphanumeric, 6-20 characters)
    if (!/^[A-Z0-9]{6,20}$/.test(newCode)) {
      toast({
        title: "Invalid Code",
        description: "Company code must be 6-20 characters, letters and numbers only.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    try {
      // Check if code already exists
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id')
        .eq('company_code', newCode)
        .neq('id', company.id)
        .single();

      if (existingCompany) {
        toast({
          title: "Code Already Exists",
          description: "This company code is already in use. Please choose another.",
          variant: "destructive",
        });
        return;
      }

      // Update company code
      const { error } = await supabase
        .from('companies')
        .update({ company_code: newCode })
        .eq('id', company.id);

      if (error) throw error;

      toast({
        title: "Code Updated",
        description: "Company code has been successfully updated.",
      });

      // Reload to get updated data
      window.location.reload();
    } catch (error) {
      console.error('Error updating company code:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update company code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Company Registration Code
        </CardTitle>
        <CardDescription>
          Share this code with new employees so they can register and join your company.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Code Display */}
        <div className="space-y-2">
          <Label>Current Company Code</Label>
          <div className="flex items-center gap-2">
            <div className="flex-1 p-3 bg-muted rounded-md font-mono text-lg font-bold">
              {showCode ? company.company_code : '••••••••••'}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCode(!showCode)}
            >
              {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={copyToClipboard}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Employees need this code to register and join your company.
          </p>
        </div>

        {/* Code Update Section */}
        <div className="pt-4 border-t space-y-3">
          <Label>Update Company Code</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Enter new code"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              className="font-mono uppercase"
              maxLength={20}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={generateCompanyCode}
              disabled={isGenerating}
            >
              <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              6-20 characters, letters and numbers only
            </p>
            <Button
              size="sm"
              onClick={updateCompanyCode}
              disabled={isUpdating || !newCode.trim() || newCode === company.company_code}
            >
              {isUpdating ? 'Updating...' : 'Update Code'}
            </Button>
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="pt-4 border-t">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="font-medium text-blue-900 mb-2">How to use:</h4>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Share the company code with new employees</li>
              <li>2. They enter it during registration</li>
              <li>3. They'll automatically join your company</li>
              <li>4. You can manage them in the employee section</li>
            </ol>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompanyCodeManager;