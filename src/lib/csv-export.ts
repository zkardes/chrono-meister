import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Utility functions for CSV export
 */

/**
 * Convert array of data to CSV string
 * @param data Array of objects to convert to CSV
 * @param headers Optional array of headers to include in CSV
 * @returns CSV string
 */
export const arrayToCSV = (data: any[], headers?: string[]): string => {
  if (!data || data.length === 0) {
    return '';
  }

  // Get headers from first object if not provided
  const csvHeaders = headers || Object.keys(data[0]);
  
  // Create header row
  const headerRow = csvHeaders.join(',');
  
  // Create data rows
  const dataRows = data.map(row => {
    return csvHeaders.map(header => {
      const value = row[header];
      // Handle special characters and wrap in quotes if needed
      if (typeof value === 'string') {
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }
      return value ?? '';
    }).join(',');
  });
  
  // Combine header and data rows
  return [headerRow, ...dataRows].join('\n');
};

/**
 * Trigger browser download of CSV data
 * @param csvData CSV string data
 * @param filename Name of file to download
 */
export const downloadCSV = (csvData: string, filename: string): void => {
  // Create blob from CSV data
  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
  
  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  // Set link attributes
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  
  // Trigger download
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Generate vacation calendar CSV for a given year
 * @param vacationRequests Array of vacation requests
 * @param employees Array of employees
 * @param year Year to generate calendar for
 * @returns CSV string
 */
export const generateVacationCalendarCSV = (
  vacationRequests: any[],
  employees: any[],
  year: number
): string => {
  // Create a map of employee IDs to names
  const employeeMap = employees.reduce((acc, employee) => {
    acc[employee.id] = `${employee.first_name} ${employee.last_name}`;
    return acc;
  }, {} as Record<string, string>);
  
  // Filter approved vacation requests for the given year
  const approvedRequests = vacationRequests.filter(request => 
    request.status === 'approved' && 
    new Date(request.start_date).getFullYear() === year
  );
  
  // Create a calendar structure for the year
  const calendarData: Record<string, string[]> = {};
  
  // Initialize each day of the year
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD format
    calendarData[dateStr] = [];
  }
  
  // Populate with vacation data
  approvedRequests.forEach(request => {
    const start = new Date(request.start_date);
    const end = new Date(request.end_date);
    const employeeName = employeeMap[request.employee_id] || 'Unknown Employee';
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      if (calendarData[dateStr]) {
        calendarData[dateStr].push(employeeName);
      }
    }
  });
  
  // Convert to CSV format
  const csvData = [['Date', 'Employees on Vacation']];
  
  Object.entries(calendarData).forEach(([date, employees]) => {
    if (employees.length > 0) {
      csvData.push([date, employees.join('; ')]);
    } else {
      csvData.push([date, '']);
    }
  });
  
  return csvData.map(row => row.join(',')).join('\n');
};

/**
 * Generate aesthetic PDF vacation calendar
 * @param vacationRequests Array of vacation requests
 * @param employees Array of employees
 * @param year Year to generate calendar for
 * @param companyName Name of the company (optional)
 */
export const generateVacationCalendarPDF = (
  vacationRequests: any[],
  employees: any[],
  year: number,
  companyName?: string
): void => {
  // Create a map of employee IDs to names
  const employeeMap = employees.reduce((acc, employee) => {
    acc[employee.id] = `${employee.first_name} ${employee.last_name}`;
    return acc;
  }, {} as Record<string, string>);
  
  // Filter approved vacation requests for the given year
  const approvedRequests = vacationRequests.filter(request => 
    request.status === 'approved' && 
    new Date(request.start_date).getFullYear() === year
  );
  
  // Create a calendar structure for the year
  const calendarData: Record<string, string[]> = {};
  
  // Initialize each day of the year
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD format
    calendarData[dateStr] = [];
  }
  
  // Populate with vacation data
  approvedRequests.forEach(request => {
    const start = new Date(request.start_date);
    const end = new Date(request.end_date);
    const employeeName = employeeMap[request.employee_id] || 'Unknown Employee';
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      if (calendarData[dateStr]) {
        calendarData[dateStr].push(employeeName);
      }
    }
  });
  
  // Create PDF document
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });
  
  // Add header with company info
  const pageWidth = doc.internal.pageSize.width;
  
  // Company header with beige background
  doc.setFillColor(245, 245, 220); // Beige
  doc.rect(0, 0, pageWidth, 25, 'F');
  
  // Company name
  doc.setFontSize(22);
  doc.setTextColor(139, 69, 19); // Saddle brown
  doc.setFont(undefined, 'bold');
  doc.text(companyName || 'ChronoMeister', pageWidth / 2, 15, { align: 'center' });
  
  // Report title
  doc.setFontSize(16);
  doc.setTextColor(160, 140, 120); // Light brown
  doc.setFont(undefined, 'normal');
  doc.text(`Urlaubsplan ${year}`, pageWidth / 2, 22, { align: 'center' });
  
  // Create table data with months as columns
  const months = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];
  
  // Create header row with abbreviated month names for table
  const shortMonths = [
    'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
    'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'
  ];
  
  // Create rows for each day (1-31)
  const tableData: any[] = [];
  
  for (let day = 1; day <= 31; day++) {
    const row: any[] = [day.toString().padStart(2, '0')]; // Day column with leading zero
    
    // For each month, check if this day exists and who is on vacation
    shortMonths.forEach((month, monthIndex) => {
      const date = new Date(year, monthIndex, day);
      
      // Check if this is a valid date for this month
      if (date.getMonth() === monthIndex) {
        const dateStr = date.toISOString().split('T')[0];
        const employeesOnVacation = calendarData[dateStr] || [];
        row.push(employeesOnVacation.join('\n'));
      } else {
        row.push('');
      }
    });
    
    tableData.push(row);
  }
  
  // Add table to PDF with improved styling using autoTable
  autoTable(doc, {
    head: [['Tag', ...shortMonths]],
    body: tableData,
    startY: 30,
    styles: {
      fontSize: 6,
      cellPadding: 1.2,
      overflow: 'linebreak',
      cellWidth: 'wrap',
      valign: 'middle'
    },
    headStyles: {
      fillColor: [230, 210, 180], // Light beige
      textColor: [101, 67, 33], // Dark brown
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      textColor: [60, 60, 60],
      fontSize: 6,
      halign: 'center'
    },
    alternateRowStyles: {
      fillColor: [255, 250, 240] // Very light beige
    },
    columnStyles: {
      0: { 
        cellWidth: 10, 
        fontStyle: 'bold',
        halign: 'center',
        fillColor: [245, 230, 210] // Slightly darker beige
      }
    },
    // Highlight weekends
    didDrawCell: (data: any) => {
      if (data.column.index > 0 && data.row.section === 'body') {
        const monthIndex = data.column.index - 1;
        const day = parseInt(data.row.raw[0]);
        const date = new Date(year, monthIndex, day);
        
        // Check if it's a weekend
        if (date.getDay() === 0 || date.getDay() === 6) {
          doc.setFillColor(245, 235, 220); // Weekend beige
        }
      }
    },
    // Add borders
    theme: 'grid',
    tableLineColor: [200, 180, 160],
    tableLineWidth: 0.1
  });
  
  // Add legend
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(9);
  doc.setTextColor(160, 140, 120); // Beige tone
  doc.text('Legende:', 15, finalY);
  
  // Weekend indicator
  doc.setFillColor(245, 235, 220); // Weekend beige
  doc.rect(32, finalY - 2.5, 8, 4, 'F');
  doc.setTextColor(80, 80, 80);
  doc.text('Wochenende', 42, finalY + 0.5);
  
  // Vacation indicator
  doc.setFillColor(220, 240, 220); // Light green for vacation
  doc.rect(70, finalY - 2.5, 8, 4, 'F');
  doc.setTextColor(80, 80, 80);
  doc.text('Mitarbeiter im Urlaub', 80, finalY + 0.5);
  
  // Add page number
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Seite ${i} von ${pageCount}`, pageWidth - 20, doc.internal.pageSize.height - 10);
  }
  
  // Save the PDF
  doc.save(`urlaubsplan-${year}.pdf`);
};
