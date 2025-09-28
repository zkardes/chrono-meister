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
 * Calculate Easter Sunday for a given year using the algorithm
 * @param year The year to calculate Easter for
 * @returns Date of Easter Sunday
 */
const calculateEaster = (year: number): Date => {
  // Using the algorithm to calculate Easter Sunday
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  
  return new Date(year, month - 1, day);
};

/**
 * Calculate public holidays for North Rhine-Westphalia (Nordrhein-Westfalen) in Germany
 * @param year The year to calculate holidays for
 * @returns Array of holiday dates with names
 */
const getNorthRhineWestphaliaHolidays = (year: number): { date: Date; name: string }[] => {
  const holidays: { date: Date; name: string }[] = [];
  
  // Fixed date holidays
  holidays.push({ date: new Date(year, 0, 1), name: 'Neujahr' }); // New Year's Day
  holidays.push({ date: new Date(year, 4, 1), name: 'Erster Mai' }); // Labor Day
  holidays.push({ date: new Date(year, 9, 3), name: 'Tag der Deutschen Einheit' }); // German Unity Day
  holidays.push({ date: new Date(year, 11, 25), name: 'Erster Weihnachtstag' }); // Christmas Day
  holidays.push({ date: new Date(year, 11, 26), name: 'Zweiter Weihnachtstag' }); // Boxing Day
  
  // Epiphany (Heilige Drei Könige) - Only in certain areas of NRW
  // For simplicity, we'll include it as it's observed in some parts
  holidays.push({ date: new Date(year, 0, 6), name: 'Heilige Drei Könige' }); // January 6
  
  // All Saints' Day (Allerheiligen) - Only in certain areas of NRW
  // For simplicity, we'll include it as it's observed in some parts
  holidays.push({ date: new Date(year, 10, 1), name: 'Allerheiligen' }); // November 1
  
  // Easter Sunday (calculates Easter using the algorithm)
  const easter = calculateEaster(year);
  
  // Easter Monday (Ostermontag)
  const easterMonday = new Date(easter);
  easterMonday.setDate(easter.getDate() + 1);
  holidays.push({ date: easterMonday, name: 'Ostermontag' });
  
  // Good Friday (Karfreitag)
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  holidays.push({ date: goodFriday, name: 'Karfreitag' });
  
  // Ascension Day (Christi Himmelfahrt)
  const ascensionDay = new Date(easter);
  ascensionDay.setDate(easter.getDate() + 39);
  holidays.push({ date: ascensionDay, name: 'Christi Himmelfahrt' });
  
  // Whit Monday (Pfingstmontag)
  const whitMonday = new Date(easter);
  whitMonday.setDate(easter.getDate() + 50);
  holidays.push({ date: whitMonday, name: 'Pfingstmontag' });
  
  // Corpus Christi (Fronleichnam) - Only in NRW until 2024
  // Note: As of 2025, Corpus Christi is no longer a public holiday in NRW
  if (year <= 2024) {
    const corpusChristi = new Date(easter);
    corpusChristi.setDate(easter.getDate() + 60);
    holidays.push({ date: corpusChristi, name: 'Fronleichnam' });
  }
  
  return holidays;
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
  
  // Get public holidays for North Rhine-Westphalia
  const publicHolidays = getNorthRhineWestphaliaHolidays(year);
  const holidayMap: Record<string, string> = {};
  publicHolidays.forEach(holiday => {
    const dateStr = holiday.date.toISOString().split('T')[0];
    holidayMap[dateStr] = holiday.name;
  });
  
  // Create a calendar structure for the year
  const calendarData: Record<string, { employees: string[], holidayName?: string }> = {};
  
  // Initialize each day of the year
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD format
    calendarData[dateStr] = {
      employees: [],
      holidayName: holidayMap[dateStr]
    };
  }
  
  // Populate with vacation data
  approvedRequests.forEach(request => {
    const start = new Date(request.start_date);
    const end = new Date(request.end_date);
    const employeeName = employeeMap[request.employee_id] || 'Unknown Employee';
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      if (calendarData[dateStr]) {
        calendarData[dateStr].employees.push(employeeName);
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
  
  // Create header row with month names and sub-columns
  const headerRows: any[] = [[]];
  const subHeaderRow: any[] = ['Tag'];
  
  // Create month headers with colspan
  months.forEach((month, index) => {
    headerRows[0].push({ content: month, colSpan: 3 });
  });
  
  // Create sub-headers for each month (Day, Weekday, Vacation/Holiday)
  shortMonths.forEach(month => {
    subHeaderRow.push('Tag', 'Wochentag', 'Urlaub/Feiertag');
  });
  
  // Weekday abbreviations
  const weekdays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  
  // Create rows for each day (1-31)
  const tableData: any[] = [];
  
  for (let day = 1; day <= 31; day++) {
    const row: any[] = [day.toString()]; // Day column
    
    // For each month, add day, weekday, and vacation/holiday info
    shortMonths.forEach((month, monthIndex) => {
      const date = new Date(year, monthIndex, day);
      
      // Check if this is a valid date for this month
      if (date.getMonth() === monthIndex) {
        const dateStr = date.toISOString().split('T')[0];
        const dayInfo = calendarData[dateStr];
        const employeesOnVacation = dayInfo?.employees || [];
        const holidayName = dayInfo?.holidayName;
        const weekday = weekdays[date.getDay()];
        
        // Add day number (repeated for clarity)
        row.push(day.toString());
        
        // Add weekday abbreviation
        row.push(weekday);
        
        // Add vacation/holiday info
        let cellContent = '';
        if (employeesOnVacation.length > 0) {
          cellContent = employeesOnVacation.join('\n');
        } else if (holidayName) {
          cellContent = holidayName;
        }
        row.push(cellContent);
      } else {
        // For invalid dates, add empty cells
        row.push('', '', '');
      }
    });
    
    tableData.push(row);
  }
  
  // Add table to PDF with improved styling using autoTable
  autoTable(doc, {
    head: [headerRows[0], subHeaderRow],
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
      textColor: [0, 0, 0], // Black text for normal days
      fontSize: 5,
      halign: 'center'
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255] // White background for normal days
    },
    columnStyles: {
      0: { 
        cellWidth: 10, 
        fontStyle: 'bold',
        halign: 'center',
        fillColor: [245, 230, 210] // Slightly darker beige
      }
    },
    // Highlight weekends and holidays
    willDrawCell: (data: any) => {
      if (data.column.index > 0 && data.row.section === 'body') {
        const monthIndex = data.column.index - 1;
        const day = parseInt(data.row.raw[0]);
        const date = new Date(year, monthIndex, day);
        const dateStr = date.toISOString().split('T')[0];
        const dayInfo = calendarData[dateStr];
        
        // Set default text color first
        doc.setTextColor(0, 0, 0); // #000000 for normal days
        
        // Check if it's a weekend
        if (date.getDay() === 0 || date.getDay() === 6) {
          // Weekend: bg #d9b99b, font #faf8f6
          doc.setFillColor(217, 185, 155); // #d9b99b
          doc.setTextColor(250, 248, 246); // #faf8f6
        }
        // Check if it's a holiday
        else if (dayInfo?.holidayName) {
          // Holiday: bg #c3b091, font #faf8f6
          doc.setFillColor(195, 176, 145); // #c3b091
          doc.setTextColor(250, 248, 246); // #faf8f6
        }
        // Normal days: bg #ffffff, font #000000
        else {
          doc.setFillColor(255, 255, 255); // #ffffff
        }
        
        // Apply background color to the cell
        doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
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
  doc.setFillColor(217, 185, 155); // #d9b99b
  doc.rect(32, finalY - 2.5, 8, 4, 'F');
  doc.setTextColor(250, 248, 246); // #faf8f6
  doc.text('Wochenende', 42, finalY + 0.5);
  
  // Vacation indicator
  doc.setFillColor(220, 240, 220); // Light green for vacation
  doc.rect(70, finalY - 2.5, 8, 4, 'F');
  doc.setTextColor(80, 80, 80);
  doc.text('Mitarbeiter im Urlaub', 80, finalY + 0.5);
  
  // Holiday indicator
  doc.setFillColor(195, 176, 145); // #c3b091
  doc.rect(130, finalY - 2.5, 8, 4, 'F');
  doc.setTextColor(250, 248, 246); // #faf8f6
  doc.text('Feiertag', 140, finalY + 0.5);
  
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
