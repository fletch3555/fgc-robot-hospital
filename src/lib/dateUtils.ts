/**
 * Get current UTC timestamp for database storage
 * @returns ISO string in UTC format
 */
export function getCurrentUTCTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Format date to "Day Hour:Minute" format
 * @param dateInput - The date string or Date object to format
 * @returns Formatted date string (e.g., "Mon 14:30")
 */
export function formatRequestDate(dateInput: string | Date): string {
  try {
    let date: Date;
    
    if (typeof dateInput === 'string') {
      // If it's a string, ensure we parse it as UTC then convert to local
      date = new Date(dateInput);
      // If the string doesn't include timezone info, treat it as UTC
      if (!dateInput.includes('Z') && !dateInput.includes('+') && !dateInput.includes('-')) {
        date = new Date(dateInput + 'Z');
      }
    } else {
      date = dateInput;
    }
    
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    // Format using local timezone - these methods automatically convert from UTC
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    
    // return `${dayName} ${time}`;
  } catch {
    return 'Invalid Date';
  }
}

/**
 * Format date safely with fallback
 * @param dateString - The date string to format
 * @returns Formatted date string or 'N/A' if invalid
 */
export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return 'N/A';
  try {
    let date = new Date(dateString);
    
    // If the string doesn't include timezone info, treat it as UTC
    if (!dateString.includes('Z') && !dateString.includes('+') && !dateString.includes('-')) {
      date = new Date(dateString + 'Z');
    }
    
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    // Format using local timezone - these methods automatically convert from UTC
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }) + ' ' + date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Invalid Date';
  }
}