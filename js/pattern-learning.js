// Pattern Learning System for Employee Attendance
// Analyzes historical scan data to learn employee patterns and improve scan classification

/**
 * Calculate median from array of numbers
 */
function calculateMedian(values) {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
        return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
    }
    return sorted[mid];
}

/**
 * Calculate mean from array of numbers
 */
function calculateMean(values) {
    if (values.length === 0) return null;
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

/**
 * Calculate standard deviation
 */
function calculateStdDev(values, mean) {
    if (values.length < 2) return 0;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
}

/**
 * Extract employee scan patterns from historical data
 * Returns: {
 *   typicalScan1Minutes: number|null,  //  median arrival time
 *   typicalScan2Minutes: number|null, // median break-out time
 *   scan1Variance: number,             // standard deviation
 *   scan2Variance: number,
 *   dataPoints: number                 // how many days of data
 * }
 */
function analyzeEmployeePattern(employeeRecords, days = 30) {
    const scan1Times = [];
    const scan2Times = [];
    
    // Take last N working days
    const recentRecords = employeeRecords
        .filter(r => !r.isHoliday && !r.isAbsent && (r.scan1 || r.scan2 || r.scan3 || r.scan4))
        .slice(-days);
    
    for (const record of recentRecords) {
        if (record.scan1) {
            const minutes = timeToMinutes(record.scan1);
            if (minutes >= 300 && minutes <= 900) { // 05:00 - 15:00 (reasonable work hours)
                scan1Times.push(minutes);
            }
        }
        if (record.scan2) {
            const minutes = timeToMinutes(record.scan2);
            if (minutes >= 660 && minutes <= 1080) { // 11:00 - 18:00 (reasonable break hours)
                scan2Times.push(minutes);
            }
        }
    }
    
    const scan1Mean = calculateMean(scan1Times);
    const scan2Mean = calculateMean(scan2Times);
    
    return {
        typicalScan1Minutes: scan1Mean,
        typicalScan2Minutes: scan2Mean,
        scan1StdDev: scan1Mean ? calculateStdDev(scan1Times, scan1Mean) : 0,
        scan2StdDev: scan2Mean ? calculateStdDev(scan2Times, scan2Mean) : 0,
        scan1DataPoints: scan1Times.length,
        scan2DataPoints: scan2Times.length,
        scan1Times: scan1Times, // raw data for debugging
        scan2Times: scan2Times,
    };
}

/**
 * Classify ambiguous scan using pattern matching
 * When scan1 is missing and we have a single scan around break time,
 * use employee's historical pattern to decide if it's scan1 or scan2
 * 
 * Returns: 'scan1' | 'scan2' | 'ambiguous'
 */
function classifyAmbiguousScan(scanMinutes, pattern, config) {
    if (!pattern.typicalScan1Minutes && !pattern.typicalScan2Minutes) {
        return 'ambiguous'; // No pattern data
    }
    
    const s1Deadline = config.shift1Deadline ? timeToMinutes(config.shift1Deadline) : null;
    const s2Start = config.shift2Start ? timeToMinutes(config.shift2Start) : null;
    const s2End = config.shift2End ? timeToMinutes(config.shift2End) : null;
    
    // Distance to typical scan1 time
    const distToScan1 = pattern.typicalScan1Minutes 
        ? Math.abs(scanMinutes - pattern.typicalScan1Minutes) 
        : Infinity;
    
    // Distance to typical scan2 time
    const distToScan2 = pattern.typicalScan2Minutes 
        ? Math.abs(scanMinutes - pattern.typicalScan2Minutes) 
        : Infinity;
    
    // Check if scan falls within expected variance of typical times
    const withinScan1Range = pattern.typicalScan1Minutes && 
        distToScan1 <= (pattern.scan1StdDev * 2 + 30); // 2 std dev + 30 min buffer
    const withinScan2Range = pattern.typicalScan2Minutes && 
        distToScan2 <= (pattern.scan2StdDev * 2 + 30);
    
    // If clearly closer to one pattern, use that
    if (withinScan1Range && !withinScan2Range) {
        return 'scan1';
    }
    if (withinScan2Range && !withinScan1Range) {
        return 'scan2';
    }
    
    // Both or neither match - use distance comparison with weight
    // Weight scan1 slightly higher (people usually remember to scan break-out more than clock-in)
    const scan1Score = distToScan1 * 1.2; // 20% penalty for scan1
    const scan2Score = distToScan2;
    
    if (scan1Score < scan2Score * 0.7) {
        return 'scan1';
    } else if (scan2Score < scan1Score * 0.7) {
        return 'scan2';
    }
    
    return 'ambiguous';
}

/**
 * Get employee pattern from cache or calculate fresh
 * Pattern is cached per employee per month
 */
const patternCache = new Map();

function getEmployeePattern(employee, monthRecords) {
    const cacheKey = `${employee.id}_${employee.month}_${employee.year}`;
    
    if (!patternCache.has(cacheKey)) {
        const pattern = analyzeEmployeePattern(monthRecords);
        patternCache.set(cacheKey, pattern);
    }
    
    return patternCache.get(cacheKey);
}

/**
 * Clear pattern cache (call when data changes)
 */
function clearPatternCache() {
    patternCache.clear();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        analyzeEmployeePattern,
        classifyAmbiguousScan,
        getEmployeePattern,
        clearPatternCache,
    };
}
