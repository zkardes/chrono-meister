/**
 * Employee Utility Functions
 * 
 * Provides consistent formatting for employee names and initials
 * according to the project specifications.
 */

export interface EmployeeData {
  first_name?: string;
  last_name?: string;
  email?: string;
}

/**
 * Formats employee name according to specification: 'FirstName. LastInitial'
 * Example: 'Alex. B' for Alex Bauer
 * 
 * @param employee - Employee data with first_name and last_name
 * @param fallbackEmail - Optional email to extract name from if no employee data
 * @returns Formatted name string
 */
export const formatEmployeeName = (employee?: EmployeeData | null, fallbackEmail?: string): string => {
  if (!employee?.first_name || !employee?.last_name) {
    // Try to extract name from email if available
    if (fallbackEmail) {
      const emailPart = fallbackEmail.split('@')[0];
      const nameParts = emailPart.split('.');
      if (nameParts.length >= 2) {
        const firstName = nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1);
        const lastInitial = nameParts[1].charAt(0).toUpperCase();
        return `${firstName}. ${lastInitial}`;
      }
    }
    return 'Mitarbeiter';
  }
  
  return `${employee.first_name}. ${employee.last_name.charAt(0)}`;
};

/**
 * Gets employee initials from first and last name
 * 
 * @param employee - Employee data with first_name and last_name
 * @param fallbackAdmin - Whether to show 'AD' if no employee data and user is admin
 * @param fallbackEmail - Optional email to extract initials from if no employee data
 * @returns Two-character initials string
 */
export const getEmployeeInitials = (employee?: EmployeeData | null, fallbackAdmin = false, fallbackEmail?: string): string => {
  if (!employee?.first_name || !employee?.last_name) {
    // Try to extract initials from email if available
    if (fallbackEmail) {
      const emailPart = fallbackEmail.split('@')[0];
      const nameParts = emailPart.split('.');
      if (nameParts.length >= 2) {
        return `${nameParts[0].charAt(0)}${nameParts[1].charAt(0)}`.toUpperCase();
      } else {
        // Use first two characters of email part
        return emailPart.substring(0, 2).toUpperCase();
      }
    }
    return fallbackAdmin ? "AD" : "MA";
  }
  
  return `${employee.first_name.charAt(0)}${employee.last_name.charAt(0)}`.toUpperCase();
};

/**
 * Gets full employee name (First Last)
 * 
 * @param employee - Employee data with first_name and last_name
 * @returns Full name string
 */
export const getFullEmployeeName = (employee?: EmployeeData | null): string => {
  if (!employee?.first_name || !employee?.last_name) {
    return 'Unbekannter Mitarbeiter';
  }
  
  return `${employee.first_name} ${employee.last_name}`;
};

/**
 * Gets employee name for display in lists and tables
 * Uses the specification format: 'FirstName. LastInitial'
 * 
 * @param employee - Employee data with first_name and last_name
 * @returns Display name string
 */
export const getEmployeeDisplayName = formatEmployeeName;

/**
 * Validates if employee has required name fields
 * 
 * @param employee - Employee data to validate
 * @returns Boolean indicating if employee has valid name data
 */
export const hasValidEmployeeName = (employee?: EmployeeData | null): boolean => {
  return !!(employee?.first_name && employee?.last_name);
};