// ============================================
// Shift Assigner - Process scans into attendance
// ============================================

function groupScansByDate(scans) {
    const groups = {};
    for (const scan of scans) {
        let assignDate = scan.date;
        // Cross-midnight: scans between 00:00-03:00 belong to previous day's shift
        const scanHour = parseInt(scan.time.split(':')[0], 10);
        if (scanHour >= 0 && scanHour < 3) {
            const d = new Date(scan.date);
            d.setDate(d.getDate() - 1);
            const y = d.getFullYear();
            const m = (d.getMonth() + 1).toString().padStart(2, '0');
            const dd = d.getDate().toString().padStart(2, '0');
            assignDate = `${y}-${m}-${dd}`;
        }
        if (!groups[assignDate]) groups[assignDate] = [];
        groups[assignDate].push(scan);
    }
    return groups;
}

function findFirstScan(scans, windowStart, windowEnd, usedIndices) {
    const startMin = timeToMinutes(windowStart);
    let endMin = timeToMinutes(windowEnd);
    if (endMin < startMin) endMin += 1440;

    let bestScan = null;
    let bestIndex = -1;
    let bestMin = Infinity;

    for (let i = 0; i < scans.length; i++) {
        if (usedIndices.has(i)) continue;
        let scanMin = timeToMinutes(scans[i].time);
        if (scanMin < 360 && startMin > 720) scanMin += 1440;

        if (scanMin >= startMin && scanMin <= endMin) {
            if (scanMin < bestMin) {
                bestMin = scanMin;
                bestScan = scans[i];
                bestIndex = i;
            }
        }
    }
    return { scan: bestScan, index: bestIndex };
}

function findLastScan(scans, windowStart, windowEnd, usedIndices) {
    const startMin = timeToMinutes(windowStart);
    let endMin = timeToMinutes(windowEnd);
    if (endMin < startMin) endMin += 1440;

    let bestScan = null;
    let bestIndex = -1;
    let bestMin = -1;

    for (let i = 0; i < scans.length; i++) {
        if (usedIndices.has(i)) continue;
        let scanMin = timeToMinutes(scans[i].time);
        if (scanMin < 360 && startMin > 720) scanMin += 1440;

        if (scanMin >= startMin && scanMin <= endMin) {
            if (scanMin > bestMin) {
                bestMin = scanMin;
                bestScan = scans[i];
                bestIndex = i;
            }
        }
    }
    return { scan: bestScan, index: bestIndex };
}

function assignScansToShifts(scans, config) {
    if (!scans || scans.length === 0) {
        return { scan1: null, scan2: null, scan3: null, scan4: null, breakRound: null };
    }

    const usedIndices = new Set();

    // Scan 1: เข้างาน - earliest scan in window
    let r1 = findFirstScan(scans, config.shift1Start, config.shift1End, usedIndices);
    // Fallback: ถ้าหาใน window ไม่เจอ ให้ใช้ scan แรกสุดก่อนเวลาออกพัก (03:00 - shift2Start)
    if (!r1.scan) r1 = findFirstScan(scans, '03:00', config.shift2Start, usedIndices);
    if (r1.index >= 0) usedIndices.add(r1.index);

    // Scan 2: ออกพัก - earliest scan in break-out window
    const r2 = findFirstScan(scans, config.shift2Start, config.shift2End, usedIndices);
    if (r2.index >= 0) usedIndices.add(r2.index);

    // Scan 3: กลับจากพัก - earliest scan in break-in window (after scan2)
    const r3 = findFirstScan(scans, config.shift3Start, config.shift3End, usedIndices);
    if (r3.index >= 0) usedIndices.add(r3.index);

    // Scan 4: เลิกงาน - latest scan in window (cross-midnight supported)
    let r4 = findLastScan(scans, config.shift4Start, config.shift4End, usedIndices);
    // Fallback: ถ้าหาใน window ไม่เจอ ให้ใช้ scan สุดท้ายของวัน (ที่ยังไม่ถูกใช้)
    if (!r4.scan) {
        let bestScan = null, bestIndex = -1, bestMin = -1;
        for (let i = 0; i < scans.length; i++) {
            if (usedIndices.has(i)) continue;
            let scanMin = timeToMinutes(scans[i].time);
            if (scanMin < 360) scanMin += 1440; // cross-midnight scans
            if (scanMin > bestMin) { bestMin = scanMin; bestScan = scans[i]; bestIndex = i; }
        }
        r4 = { scan: bestScan, index: bestIndex };
    }

    // Break deadline per round (fixed DL, but if scan2+1.5hrs exceeds it, use calculated)
    // A: DL 14:30, B: DL 15:00, C: DL 16:00, D: DL 16:30
    let breakDeadline = null;
    let breakRound = null;
    if (r2.scan) {
        const outMin = timeToMinutes(r2.scan.time);
        const calcDeadline = outMin + (config.breakDurationMinutes || 90);
        let fixedDL;
        if (outMin < timeToMinutes('13:15')) { breakRound = 'A'; fixedDL = timeToMinutes('14:30'); }
        else if (outMin < timeToMinutes('14:00')) { breakRound = 'B'; fixedDL = timeToMinutes('15:00'); }
        else if (outMin < timeToMinutes('14:45')) { breakRound = 'C'; fixedDL = timeToMinutes('16:00'); }
        else { breakRound = 'D'; fixedDL = timeToMinutes('16:30'); }
        const deadlineMin = Math.max(calcDeadline, fixedDL);
        const h = Math.floor(deadlineMin / 60);
        const m = deadlineMin % 60;
        breakDeadline = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }

    return {
        scan1: r1.scan ? r1.scan.time.substring(0, 5) : null,
        scan2: r2.scan ? r2.scan.time.substring(0, 5) : null,
        scan3: r3.scan ? r3.scan.time.substring(0, 5) : null,
        scan4: r4.scan ? r4.scan.time.substring(0, 5) : null,
        breakRound,
        breakDeadline,
    };
}

function calculateLateness(scanTime, deadline, deductionPerMinute = 1) {
    if (!scanTime || !deadline) return { minutes: 0, baht: 0 };
    const scanMin = timeToMinutes(scanTime);
    const deadlineMin = timeToMinutes(deadline);
    if (scanMin > deadlineMin) {
        const lateMin = scanMin - deadlineMin;
        return { minutes: lateMin, baht: lateMin * deductionPerMinute };
    }
    return { minutes: 0, baht: 0 };
}

function processEmployeeAttendance(employee, scans, shopName, month, year) {
    const config = employee.shiftConfig;
    const deductRate = config.deductionPerMinute || 1;
    const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
    const holidayDates = (employee.holidays && employee.holidays[monthKey]) || [];
    const allDates = getMonthDates(year, month);
    const scansByDate = groupScansByDate(scans);

    const days = [];
    let totalHolidays = 0, totalAbsent = 0, totalLeave = 0, totalWorkingDays = 0;
    let totalLate1 = 0, totalLate2 = 0;

    for (const date of allDates) {
        const dayDate = new Date(date);
        const dayOfWeek = THAI_DAYS[dayDate.getDay()];
        const dayScans = scansByDate[date] || [];
        // วันหยุดเฉพาะที่ admin ตั้งเอง AND ไม่มี scan ในวันนั้น
        const isHoliday = holidayDates.includes(date) && dayScans.length === 0;

        if (isHoliday) {
            totalHolidays++;
            days.push({
                date, dayOfWeek, isHoliday: true, isAbsent: false, isLeave: false,
                scan1: null, scan2: null, scan3: null, scan4: null,
                breakRound: null,
                late1Minutes: 0, late1Baht: 0, late2Minutes: 0, late2Baht: 0,
                note: '', specialNote: '',
            });
            continue;
        }

        const shifts = assignScansToShifts(dayScans, config);
        const noScans = !shifts.scan1 && !shifts.scan2 && !shifts.scan3 && !shifts.scan4;

        // วันที่ไม่มีการสแกนเลย ถือเป็นวันหยุด
        if (noScans) {
            totalHolidays++;
            days.push({
                date, dayOfWeek, isHoliday: true, isAbsent: false, isLeave: false,
                scan1: null, scan2: null, scan3: null, scan4: null,
                breakRound: null,
                late1Minutes: 0, late1Baht: 0, late2Minutes: 0, late2Baht: 0,
                note: '', specialNote: '',
            });
            continue;
        }

        const isAbsent = !shifts.scan1 && !shifts.scan4;
        if (isAbsent) totalAbsent++;
        else totalWorkingDays++;

        // Late 1: เข้างานสาย (scan1 > shift1Deadline)
        const late1 = calculateLateness(shifts.scan1, config.shift1Deadline, deductRate);
        totalLate1 += late1.baht;

        // Late 2: กลับจากพักสาย (scan3 > scan2 + 1.5 ชม.)
        let late2 = { minutes: 0, baht: 0 };
        if (shifts.breakDeadline) {
            late2 = calculateLateness(shifts.scan3, shifts.breakDeadline, deductRate);
        }
        totalLate2 += late2.baht;

        days.push({
            date, dayOfWeek, isHoliday: false, isAbsent, isLeave: false,
            scan1: shifts.scan1, scan2: shifts.scan2, scan3: shifts.scan3, scan4: shifts.scan4,
            breakRound: shifts.breakRound ? (shifts.breakRound + ' (DL ' + shifts.breakDeadline + ')') : null,
            late1Minutes: late1.minutes, late1Baht: late1.baht,
            late2Minutes: late2.minutes, late2Baht: late2.baht,
            note: '', specialNote: '',
        });
    }

    return {
        id: generateId(),
        employeeId: employee.id,
        empCode: employee.empCode,
        empName: employee.name,
        shopId: employee.shopId,
        shopName,
        month, year,
        totalDays: getDaysInMonth(year, month),
        holidays: totalHolidays,
        absent: totalAbsent,
        leave: totalLeave,
        quarantine: 0,
        workingDays: totalWorkingDays,
        totalLate1Baht: totalLate1,
        totalLate2Baht: totalLate2,
        totalDeduction: totalLate1 + totalLate2,
        days,
        shiftConfig: config,
    };
}
