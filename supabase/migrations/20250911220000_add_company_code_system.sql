-- Add company_code field for multi-tenancy without email domains
-- First add the column as nullable
ALTER TABLE companies ADD COLUMN company_code VARCHAR(20);

-- Update existing companies with sample codes
UPDATE companies SET company_code = 'DEMO2025' WHERE slug = 'demo-company';
UPDATE companies SET company_code = 'ACME2025' WHERE slug = 'acme-corp';

-- For any remaining companies without codes, generate unique codes based on their ID
UPDATE companies 
SET company_code = 'COMP' || UPPER(SUBSTRING(id::text, 1, 4))
WHERE company_code IS NULL;

-- Now add the NOT NULL and UNIQUE constraints
ALTER TABLE companies ALTER COLUMN company_code SET NOT NULL;
ALTER TABLE companies ADD CONSTRAINT companies_company_code_unique UNIQUE (company_code);

-- Create index for company_code lookups
CREATE INDEX idx_companies_company_code ON companies(company_code);

-- Update the user registration trigger to use company_code instead of domain
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user profile without company assignment
  -- Company will be assigned when user provides company_code during onboarding
  INSERT INTO public.user_profiles (id, role, company_id)
  VALUES (NEW.id, 'employee', NULL);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add helper function to assign company by code
CREATE OR REPLACE FUNCTION assign_user_company_by_code(user_id UUID, company_code_input TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  target_company_id UUID;
BEGIN
  -- Find company by code
  SELECT id INTO target_company_id 
  FROM companies 
  WHERE company_code = company_code_input 
    AND is_active = true;
    
  IF target_company_id IS NULL THEN
    RETURN FALSE; -- Company code not found
  END IF;
  
  -- Update user profile with company
  UPDATE user_profiles 
  SET company_id = target_company_id 
  WHERE id = user_id;
  
  RETURN TRUE; -- Success
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policy for company code lookup (for registration validation)
CREATE POLICY "Anyone can verify company codes" ON companies
  FOR SELECT USING (true);

-- Note: We keep the domain field for future use but make it optional
ALTER TABLE companies ALTER COLUMN domain DROP NOT NULL;