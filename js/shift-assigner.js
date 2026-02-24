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
        return { scan1: null, scan2: null, scan3: null, scan4: null, breakRound: null, breakDeadline: null };
    }

    const usedIndices = new Set();

    // Scan 1: เข้างาน - earliest scan in window
    let r1 = findFirstScan(scans, config.shift1Start, config.shift1End, usedIndices);
    // Fallback: ถ้าหาใน window ไม่เจอ ให้ใช้ scan แรกสุดก่อนเวลาออกพัก
    // skip fallback ถ้า shift2Start เป็น null (เช่น เสิร์ฟ กะ 2 จ-ศ ไม่มีพัก)
    // และ skip ถ้ามี scan อยู่ใน shift2 window แล้ว เพื่อไม่ให้ scan พักออกมาเป็น scan1
    if (!r1.scan && config.shift2Start) {
        const prospective = findFirstScan(scans, '03:00', config.shift2Start, usedIndices);
        if (prospective.scan) {
            const prospMin = timeToMinutes(prospective.scan.time);
            const s1EndMin = timeToMinutes(config.shift1End);
            const s2StartMin = timeToMinutes(config.shift2Start);
            // ใช้ fallback เฉพาะเมื่อ scan อยู่ใกล้ shift1End มากกว่า shift2Start
            // ถ้าใกล้ shift2Start มากกว่า แสดงว่าพนักงานลืม scan เข้า → ปล่อยให้ scan2 จับแทน
            const distToShift1 = Math.abs(prospMin - s1EndMin);
            const distToShift2 = Math.abs(s2StartMin - prospMin);
            if (distToShift1 <= distToShift2) {
                r1 = prospective;
            }
        }
    }
    if (r1.index >= 0) usedIndices.add(r1.index);

    // Scan 2: ออกพัก - earliest scan in break-out window (ถ้ามีพัก)
    // ถ้าไม่มี scan1 → ขยาย scan2 window เริ่มจาก shift1End เพื่อจับ scan ที่อยู่ก่อน shift2Start
    // (กรณีพนักงานลืม scan เข้า → scan แรกหลัง shift1End ควรเป็นพักออก)
    const scan2WindowStart = (!r1.scan && config.hasBreak !== false && config.shift1End)
        ? config.shift1End : config.shift2Start;
    let r2 = (config.hasBreak !== false && scan2WindowStart)
        ? findFirstScan(scans, scan2WindowStart, config.shift2End, usedIndices)
        : { scan: null, index: -1 };
    if (r2.index >= 0) usedIndices.add(r2.index);

    // Scan 3: กลับจากพัก - earliest scan in break-in window (ถ้ามีพัก)
    let r3 = (config.hasBreak !== false && config.shift3Start)
        ? findFirstScan(scans, config.shift3Start, config.shift3End, usedIndices)
        : { scan: null, index: -1 };
    if (r3.index >= 0) usedIndices.add(r3.index);

    // ถ้าไม่มี scan2 (พักออก) แต่มี scan3 → ย้าย scan3 ไปเป็น scan2
    if (!r2.scan && r3.scan) {
        r2 = r3;
        r3 = { scan: null, index: -1 };
    }

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

    // Break deadline logic:
    // If config has breakInDeadline (WDD), use it directly.
    // Otherwise fall back to legacy round A/B/C/D logic.
    let breakDeadline = null;
    let breakRound = null;
    if (r2.scan) {
        // Unified logic: if config has breakOutFixed and breakInDeadline, shift deadline when scan2 is late
        if (config.breakOutFixed && config.breakInDeadline) {
            const fixedOutMin = timeToMinutes(config.breakOutFixed);
            const actualOutMin = timeToMinutes(r2.scan.time);
            const baseDeadlineMin = timeToMinutes(config.breakInDeadline);
            let deadlineMin = baseDeadlineMin;
            if (actualOutMin > fixedOutMin) {
                deadlineMin = baseDeadlineMin + (actualOutMin - fixedOutMin);
            }
            const dh = Math.floor(deadlineMin / 60);
            const dm = deadlineMin % 60;
            breakDeadline = `${dh.toString().padStart(2, '0')}:${dm.toString().padStart(2, '0')}`;
            breakRound = config.breakOutFixed || null;
        }
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
            breakRound: shifts.breakDeadline ? ('(DL ' + shifts.breakDeadline + ')') : null,
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

// ============================================
// WDD-specific attendance processor
// Detects shift config per-day based on:
//   - Employee name suffix (position: ครัว/เดิน/เสิร์ฟ)
//   - First scan time (< 11:00 = กะ 1, >= 11:00 = กะ 2)
//   - Day of week (weekday/weekend for เสิร์ฟ only)
// Falls back to processEmployeeAttendance() for non-WDD positions
// ============================================
function processEmployeeAttendanceWDD(employee, scans, shopName, month, year) {
    // If employee has no WDD position in name, use standard processing
    if (!detectWddPosition(employee.name)) {
        return processEmployeeAttendance(employee, scans, shopName, month, year);
    }

    const baseConfig = employee.shiftConfig;
    const deductRate = (baseConfig && baseConfig.deductionPerMinute) || 1;
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

        if (dayScans.length === 0) {
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

        // Find earliest scan to detect shift — exclude cross-midnight scans (00:00-02:59)
        // because those belong to the previous day's shift end, not the current day's start
        const nonMidnightScans = dayScans.filter(s => timeToMinutes(s.time) >= 180); // >= 03:00
        const candidateScans = nonMidnightScans.length > 0 ? nonMidnightScans : dayScans;
        const sortedScans = [...candidateScans].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
        const firstScanTime = sortedScans[0] ? sortedScans[0].time.substring(0, 5) : null;

        // Get per-day WDD config based on position + shift + day type
        const dayConfig = getWddDayConfig(employee.name, date, firstScanTime) || baseConfig;
        const shiftNum = detectWddShiftNum(firstScanTime);

        const shifts = assignScansToShifts(dayScans, dayConfig);
        const noScans = !shifts.scan1 && !shifts.scan2 && !shifts.scan3 && !shifts.scan4;

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

        // Late 1: เข้างานสาย
        const late1 = calculateLateness(shifts.scan1, dayConfig.shift1Deadline, deductRate);
        totalLate1 += late1.baht;

        // Late 2: กลับจากพักสาย (ใช้ breakInDeadline จาก config โดยตรง)
        let late2 = { minutes: 0, baht: 0 };
        if (shifts.breakDeadline) {
            late2 = calculateLateness(shifts.scan3, shifts.breakDeadline, deductRate);
        }
        totalLate2 += late2.baht;

        // Build breakRound label: show actual computed deadline (may differ from config if scan2 was late)
        let breakRoundLabel = null;
        if (shifts.scan2 && shifts.breakDeadline) {
            breakRoundLabel = `กะ${shiftNum} (DL ${shifts.breakDeadline})`;
        } else if (shifts.breakRound) {
            breakRoundLabel = shifts.breakRound + ' (DL ' + shifts.breakDeadline + ')';
        }

        days.push({
            date, dayOfWeek, isHoliday: false, isAbsent, isLeave: false,
            scan1: shifts.scan1, scan2: shifts.scan2, scan3: shifts.scan3, scan4: shifts.scan4,
            breakRound: breakRoundLabel,
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
        shiftConfig: baseConfig,
    };
}
