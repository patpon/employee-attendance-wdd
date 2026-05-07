// ============================================
// Shift Assigner - Process scans into attendance
// ============================================

// ตัด scan ซ้ำ: ถ้า 2 scan ห่างกัน < thresholdMinutes → เก็บครั้งแรก ตัดครั้งที่ 2 ทิ้ง
function deduplicateScans(scans, thresholdMinutes = 5) {
    if (!scans || scans.length <= 1) return scans;
    const sorted = [...scans].sort((a, b) => {
        let ma = timeToMinutes(a.time);
        let mb = timeToMinutes(b.time);
        if (ma < 180) ma += 1440; // cross-midnight normalization
        if (mb < 180) mb += 1440;
        return ma - mb;
    });
    const result = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
        let prevMin = timeToMinutes(result[result.length - 1].time);
        let curMin  = timeToMinutes(sorted[i].time);
        if (prevMin < 180) prevMin += 1440;
        if (curMin  < 180) curMin  += 1440;
        if (curMin - prevMin >= thresholdMinutes) {
            result.push(sorted[i]);
        }
    }
    return result;
}

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

// ============================================
// Score-based WDD shift config selection
// Tests both กะ1 and กะ2 against actual scans; picks the best fit.
// Replaces the manual firstScanTime threshold + smart correction chain.
//
// Scoring:
//   +3  scan falls in shift1 (เข้างาน) window
//   +3  scan falls in shift2 (พักออก) window  (if config has break)
//   +2  scan falls in shift3 (พักเข้า) window  (if config has break)
//   +2  scan falls in shift4 (เลิกงาน) window
//   +3  first-scan-time matches the expected กะ (< 11:00 → กะ1, >= 11:00 → กะ2)
//   -2  config expects a break but no scan found anywhere in break range
//   -1  per non-midnight scan that doesn't fit any window (leftover scans)
// ============================================
function scoreShiftConfig(dayScans, config, shiftNum) {
    if (!config || !dayScans || dayScans.length === 0) return -Infinity;

    const deduped = deduplicateScans([...dayScans]);
    let score = 0;
    const usedIndices = new Set();

    // First-scan prior: prefer กะ whose number matches arrival time
    const nonMidnight = deduped.filter(s => timeToMinutes(s.time) >= 180);
    const sorted = [...(nonMidnight.length > 0 ? nonMidnight : deduped)]
        .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
    if (sorted.length > 0) {
        const firstMin = timeToMinutes(sorted[0].time);
        const boundaryMin = timeToMinutes(WDD_SHIFT_BOUNDARY_TIME);
        if (shiftNum === 1 && firstMin < boundaryMin) score += 3;
        if (shiftNum === 2 && firstMin >= boundaryMin) score += 3;
    }

    // scan1 window match
    const r1 = findFirstScan(deduped, config.shift1Start, config.shift1End, usedIndices);
    if (r1.scan) { score += 3; usedIndices.add(r1.index); }

    // scan2 (พักออก) window match + proximity to breakOutFixed
    if (config.hasBreak !== false && config.shift2Start) {
        const r2 = findFirstScan(deduped, config.shift2Start, config.shift2End, usedIndices);
        if (r2.scan) {
            score += 3;
            usedIndices.add(r2.index);
            // Proximity bonus: scan2 close to breakOutFixed → strong กะ fit
            if (config.breakOutFixed) {
                const scan2Min = timeToMinutes(r2.scan.time);
                const fixedMin = timeToMinutes(config.breakOutFixed);
                const dist = Math.abs(scan2Min - fixedMin);
                if (dist <= 15) score += 3;
                else if (dist <= 30) score += 2;
                else if (dist > 90) score -= 2;
                else if (dist > 60) score -= 1;
            }
        }
    }

    // scan3 (พักเข้า) window match
    if (config.hasBreak !== false && config.shift3Start) {
        const r3 = findFirstScan(deduped, config.shift3Start, config.shift3End, usedIndices);
        if (r3.scan) { score += 2; usedIndices.add(r3.index); }
    }

    // scan4 (เลิกงาน) window match
    const r4 = findLastScan(deduped, config.shift4Start, config.shift4End, usedIndices);
    if (r4.scan) { score += 2; usedIndices.add(r4.index); }

    // Penalty: config expects break but no scan found in entire break range
    if (config.hasBreak !== false && config.shift2Start && config.shift3End) {
        const s2 = timeToMinutes(config.shift2Start);
        const s3e = timeToMinutes(config.shift3End);
        const hasBreakScan = deduped.some(s => {
            const m = timeToMinutes(s.time);
            return m >= s2 && m <= s3e;
        });
        if (!hasBreakScan) score -= 2;
    }

    // Penalty: non-midnight scans that don't fit any window (leftover = wrong config)
    for (let i = 0; i < deduped.length; i++) {
        if (!usedIndices.has(i) && timeToMinutes(deduped[i].time) >= 180) score -= 1;
    }

    return score;
}

// Returns { config, shiftNum } for the best-fitting WDD shift config for a given day.
// weekday/weekend is determined from the date; กะ1 vs กะ2 from scan pattern.
function selectBestShiftConfig(dayScans, position, date) {
    if (!position || !dayScans || dayScans.length === 0) return null;

    const weekend = isWeekend(date);
    let candidates;

    if (position === 'เดิน' || position === 'ครัว') {
        candidates = [
            { shiftNum: 1, config: WDD_SHIFT_CONFIGS[`${position}_1`] },
            { shiftNum: 2, config: WDD_SHIFT_CONFIGS[`${position}_2`] },
        ];
    } else if (position === 'เสิร์ฟ') {
        const dayType = weekend ? 'weekend' : 'weekday';
        candidates = [
            { shiftNum: 1, config: WDD_SHIFT_CONFIGS[`เสิร์ฟ_1_${dayType}`] },
            { shiftNum: 2, config: WDD_SHIFT_CONFIGS[`เสิร์ฟ_2_${dayType}`] },
        ];
    } else {
        return null;
    }

    let best = candidates[0];
    let bestScore = -Infinity;
    for (const cand of candidates) {
        const s = scoreShiftConfig(dayScans, cand.config, cand.shiftNum);
        if (s > bestScore) { bestScore = s; best = cand; }
    }
    return best;
}

function assignScansToShifts(scans, config, employeePattern = null) {
    if (!scans || scans.length === 0) {
        return { scan1: null, scan2: null, scan3: null, scan4: null, breakRound: null, breakDeadline: null };
    }

    scans = deduplicateScans(scans);

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
            
            // Pattern learning: ถ้ามีข้อมูล pattern ใช้ช่วยตัดสินใจ
            let useFallback = distToShift1 <= distToShift2;
            if (employeePattern && employeePattern.typicalScan1Minutes) {
                const distToPatternScan1 = Math.abs(prospMin - employeePattern.typicalScan1Minutes);
                const distToPatternScan2 = employeePattern.typicalScan2Minutes 
                    ? Math.abs(prospMin - employeePattern.typicalScan2Minutes) 
                    : Infinity;
                // ถ้าใกล้ pattern scan1 มากกว่า scan2 → ใช้ fallback (เป็น scan1)
                // ถ้าใกล้ pattern scan2 มากกว่า → ไม่ใช้ fallback (เป็น scan2)
                if (distToPatternScan1 < distToPatternScan2 * 0.6) {
                    useFallback = true;
                } else if (distToPatternScan2 < distToPatternScan1 * 0.6) {
                    useFallback = false;
                }
                // ถ้าไม่ชัดเจน ใช้ distance-based logic เดิม
            }
            
            if (useFallback) {
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

    // ถ้าไม่มี scan2 (พักออก) แต่มี scan3 → วิเคราะห์ว่าควรเป็น scan2 หรือ scan3
    // ใช้ pattern median ของพนักงาน (ถ้ามี) แทน config เพื่อความแม่นยำ
    // เช่น ครัว config breakOutFixed=13:30 แต่จริงพักออก ~15:00
    if (!r2.scan && r3.scan) {
        let promoteToScan2 = true; // default: ย้ายเป็น scan2 (เหมือนเดิม)
        // ใช้ pattern median ถ้ามีข้อมูลเพียงพอ (>= 3 วัน), ไม่งั้น fallback ไป config
        const patternScan2Min = (employeePattern && employeePattern.typicalScan2Median && employeePattern.scan2DataPoints >= 3)
            ? employeePattern.typicalScan2Median : null;
        const patternScan3Min = (employeePattern && employeePattern.typicalScan3Median && employeePattern.scan3DataPoints >= 3)
            ? employeePattern.typicalScan3Median : null;
        const breakOutRef = patternScan2Min || (config.breakOutFixed ? timeToMinutes(config.breakOutFixed) : null);
        const breakInRef = patternScan3Min || (config.breakInDeadline ? timeToMinutes(config.breakInDeadline) : null);

        if (breakOutRef && breakInRef) {
            const scanMin = timeToMinutes(r3.scan.time);
            const distToBreakOut = Math.abs(scanMin - breakOutRef);
            const distToBreakIn = Math.abs(scanMin - breakInRef);
            // ถ้า scan ใกล้ breakIn มากกว่า breakOut → น่าจะเป็น scan3 (ลืม scan พักออก)
            if (distToBreakIn < distToBreakOut) {
                promoteToScan2 = false; // คงเป็น scan3
            }
        }
        if (promoteToScan2) {
            r2 = r3;
            r3 = { scan: null, index: -1 };
        }
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

    // Auto-fill scan1: ถ้าไม่มี scan1 (ลืม scan เข้างาน) แต่มี scan อื่น
    // → สมมติเข้าตรง DL → ไม่หัก
    let autoScan1 = null;
    const hasAnyScan = r1.scan || r2.scan || r3.scan || r4.scan;
    if (!r1.scan && hasAnyScan && config.shift1Deadline) {
        autoScan1 = config.shift1Deadline;
    }

    // Break deadline logic:
    // If config has breakInDeadline (WDD), use it directly.
    // Otherwise fall back to legacy round A/B/C/D logic.
    let breakDeadline = null;
    let breakRound = null;
    let autoScan2 = null;
    let autoScan3 = null;

    if (r2.scan) {
        // มี scan2 (พักออก) → คำนวณ breakDeadline ตามปกติ
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
        // Auto-fill scan3: มี scan2 แต่ไม่มี scan3 → สมมติพักเข้าตรง DL
        if (!r3.scan && breakDeadline) {
            autoScan3 = breakDeadline;
        }
    } else if (!r2.scan && r3.scan && config.breakOutFixed && config.breakInDeadline) {
        // ไม่มี scan2 (ลืม scan พักออก) แต่มี scan3 (พักเข้า)
        // → ใช้ breakOutFixed ของกะปัจจุบัน (ไม่ใช้ pattern เพราะ pattern อาจรวมข้อมูลข้ามกะ)
        autoScan2 = config.breakOutFixed;
        breakDeadline = config.breakInDeadline;
        breakRound = config.breakOutFixed;
    }

    return {
        scan1: r1.scan ? r1.scan.time.substring(0, 5) : autoScan1,
        scan2: r2.scan ? r2.scan.time.substring(0, 5) : autoScan2,
        scan3: r3.scan ? r3.scan.time.substring(0, 5) : autoScan3,
        scan4: r4.scan ? r4.scan.time.substring(0, 5) : null,
        breakRound,
        breakDeadline,
        autoScan1: !!autoScan1, // flag ว่า scan1 เป็น auto-fill (ลืม scan เข้างาน)
        autoScan2: !!autoScan2, // flag ว่า scan2 เป็น auto-fill (ลืม scan พักออก)
        autoScan3: !!autoScan3, // flag ว่า scan3 เป็น auto-fill (ลืม scan พักเข้า)
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
            autoScan1: shifts.autoScan1 || false,
            autoScan2: shifts.autoScan2 || false,
            autoScan3: shifts.autoScan3 || false,
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
// Detects shift config per-day using score-based selection (selectBestShiftConfig):
//   - weekday/weekend determined from date (เสิร์ฟ only)
//   - กะ1 vs กะ2 determined by scoring all scans against each candidate config
//   - เดิน/ครัว: no weekday/weekend split
// Falls back to processEmployeeAttendance() for non-WDD positions
// ============================================
function processEmployeeAttendanceWDD(employee, scans, shopName, month, year) {
    if (!detectWddPosition(employee.name, employee, null)) {
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

    // First pass: build pattern from all working days using score-based config
    const tempRecords = [];
    for (const date of allDates) {
        const dayScans = scansByDate[date] || [];
        if (dayScans.length === 0 || holidayDates.includes(date)) continue;
        const pos = detectWddPosition(employee.name, employee, date);
        const sel = selectBestShiftConfig(dayScans, pos, date);
        const dayCfg = (sel && sel.config) || baseConfig;
        const shifts = assignScansToShifts(dayScans, dayCfg);
        tempRecords.push({
            date,
            scan1: shifts.scan1, scan2: shifts.scan2, scan3: shifts.scan3, scan4: shifts.scan4,
            autoScan1: shifts.autoScan1 || false, autoScan2: shifts.autoScan2 || false, autoScan3: shifts.autoScan3 || false,
            isHoliday: false, isAbsent: !shifts.scan1 && !shifts.scan4,
        });
    }
    const employeePattern = typeof analyzeEmployeePattern === 'function'
        ? analyzeEmployeePattern(tempRecords, 30) : null;

    for (const date of allDates) {
        const dayDate = new Date(date);
        const dayOfWeek = THAI_DAYS[dayDate.getDay()];
        const dayScans = scansByDate[date] || [];
        const isHoliday = holidayDates.includes(date) && dayScans.length === 0;

        if (isHoliday || dayScans.length === 0) {
            totalHolidays++;
            days.push({
                date, dayOfWeek, isHoliday: true, isAbsent: false, isLeave: false,
                scan1: null, scan2: null, scan3: null, scan4: null, breakRound: null,
                late1Minutes: 0, late1Baht: 0, late2Minutes: 0, late2Baht: 0,
                note: '', specialNote: '',
            });
            continue;
        }

        // Select best shift config by scoring both กะ1 and กะ2 against actual scans
        const position = detectWddPosition(employee.name, employee, date);
        const sel = selectBestShiftConfig(dayScans, position, date);
        const dayConfig = (sel && sel.config) || baseConfig;
        const shiftNum = (sel && sel.shiftNum) || 1;

        const shifts = assignScansToShifts(dayScans, dayConfig, employeePattern);
        const noScans = !shifts.scan1 && !shifts.scan2 && !shifts.scan3 && !shifts.scan4;

        if (noScans) {
            totalHolidays++;
            days.push({
                date, dayOfWeek, isHoliday: true, isAbsent: false, isLeave: false,
                scan1: null, scan2: null, scan3: null, scan4: null, breakRound: null,
                late1Minutes: 0, late1Baht: 0, late2Minutes: 0, late2Baht: 0,
                note: '', specialNote: '',
            });
            continue;
        }

        const isAbsent = !shifts.scan1 && !shifts.scan4;
        if (isAbsent) totalAbsent++;
        else totalWorkingDays++;

        const late1 = calculateLateness(shifts.scan1, dayConfig.shift1Deadline, deductRate);
        totalLate1 += late1.baht;

        let late2 = { minutes: 0, baht: 0 };
        if (shifts.breakDeadline) {
            late2 = calculateLateness(shifts.scan3, shifts.breakDeadline, deductRate);
        }
        totalLate2 += late2.baht;

        let breakRoundLabel = null;
        if (shifts.scan2 && shifts.breakDeadline) {
            breakRoundLabel = `กะ${shiftNum} (DL ${shifts.breakDeadline})`;
        } else if (shifts.breakRound && shifts.breakDeadline) {
            breakRoundLabel = `${shifts.breakRound} (DL ${shifts.breakDeadline})`;
        }

        const autoNote = (late1.baht + late2.baht) > 20 ? 'กรุณาตรวจสอบ' : '';

        days.push({
            date, dayOfWeek, isHoliday: false, isAbsent, isLeave: false,
            scan1: shifts.scan1, scan2: shifts.scan2, scan3: shifts.scan3, scan4: shifts.scan4,
            autoScan1: shifts.autoScan1 || false,
            autoScan2: shifts.autoScan2 || false,
            autoScan3: shifts.autoScan3 || false,
            breakRound: breakRoundLabel,
            late1Minutes: late1.minutes, late1Baht: late1.baht,
            late2Minutes: late2.minutes, late2Baht: late2.baht,
            note: autoNote, specialNote: '',
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
