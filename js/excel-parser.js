// ============================================
// Excel Parser - uses SheetJS (XLSX)
// ============================================

function parseExcelFile(arrayBuffer) {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const scans = [];
    const employeeMap = new Map();
    let minDate = '';
    let maxDate = '';

    // Find header row
    let headerIdx = -1;
    let colCode = -1, colName = -1, colDate = -1, colTime = -1;

    for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const row = rows[i];
        if (!row) continue;
        for (let j = 0; j < row.length; j++) {
            const cell = String(row[j] || '').trim();
            if (cell.includes('รหัส') || cell.toLowerCase().includes('id')) colCode = j;
            if (cell.includes('ชื่อ') || cell.toLowerCase().includes('name')) colName = j;
            if (cell.includes('วันที่') || cell.toLowerCase().includes('date')) colDate = j;
            if (cell.includes('เวลา') || cell.toLowerCase().includes('time')) colTime = j;
        }
        if (colCode >= 0 && colName >= 0 && colDate >= 0 && colTime >= 0) {
            headerIdx = i;
            break;
        }
    }

    // Fallback: assume columns 0,1,2,3
    if (headerIdx < 0) {
        headerIdx = 0;
        colCode = 0; colName = 1; colDate = 2; colTime = 3;
    }

    for (let i = headerIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[colCode] || !row[colDate]) continue;

        const empCode = String(row[colCode]).trim();
        const empName = String(row[colName] || '').trim();
        const rawDate = String(row[colDate]).trim();
        const rawTime = String(row[colTime] || '').trim();

        if (!empCode || !rawDate || !rawTime) continue;

        const isoDate = parseBuddhistDate(rawDate);
        if (!isoDate) continue;

        // Parse time
        let timeStr = rawTime;
        if (typeof row[colTime] === 'number') {
            const totalSeconds = Math.round(row[colTime] * 86400);
            const h = Math.floor(totalSeconds / 3600) % 24;
            const m = Math.floor((totalSeconds % 3600) / 60);
            const s = totalSeconds % 60;
            timeStr = `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }

        // Normalize time to HH:mm:ss
        const timeParts = timeStr.split(':');
        if (timeParts.length >= 2) {
            const h = parseInt(timeParts[0], 10);
            const m = parseInt(timeParts[1], 10);
            const s = timeParts.length >= 3 ? parseInt(timeParts[2], 10) : 0;
            timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }

        const timestamp = new Date(`${isoDate}T${timeStr}`).getTime();

        scans.push({ empCode, empName, date: isoDate, time: timeStr, timestamp });
        employeeMap.set(empCode, empName);

        if (!minDate || isoDate < minDate) minDate = isoDate;
        if (!maxDate || isoDate > maxDate) maxDate = isoDate;
    }

    // Sort by employee, date, time
    scans.sort((a, b) => {
        if (a.empCode !== b.empCode) return a.empCode.localeCompare(b.empCode);
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.timestamp - b.timestamp;
    });

    const employees = Array.from(employeeMap.entries()).map(([code, name]) => ({ code, name }));

    return { scans, employees, dateRange: { start: minDate, end: maxDate } };
}

function deduplicateScans(scans) {
    const result = [];
    let lastScan = null;

    for (const scan of scans) {
        if (lastScan && lastScan.empCode === scan.empCode && lastScan.date === scan.date && Math.abs(scan.timestamp - lastScan.timestamp) < 5000) {
            continue;
        }
        result.push(scan);
        lastScan = scan;
    }

    return result;
}
