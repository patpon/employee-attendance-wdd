// ============================================
// Date Utilities
// ============================================

const THAI_DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์"];
const THAI_MONTHS = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

const DEFAULT_SHIFT_CONFIG = {
    shift1Start: "06:00",
    shift1End: "11:30",
    shift1Deadline: "10:00",
    shift2Start: "12:00",
    shift2End: "15:00",
    shift3Start: "13:00",
    shift3End: "17:00",
    shift4Start: "20:00",
    shift4End: "03:00",
    hasBreak: true,
    breakOutFixed: "13:30",
    breakInDeadline: "15:00",
    deductionPerMinute: 1,
};

// ============================================
// WDD Shop Shift Configs (position-based)
// Position detected from last word of employee name
// Shift (1 or 2) detected from first scan time each day
// ============================================
const WDD_SHIFT_CONFIGS = {
    // ตำแหน่ง เสิร์ฟ - กะ 1 - วันจันทร์-ศุกร์
    'เสิร์ฟ_1_weekday': {
        shift1Start: "06:00", shift1End: "11:30", shift1Deadline: "10:00",
        shift2Start: "12:00", shift2End: "15:00",
        shift3Start: "13:00", shift3End: "17:00",
        shift4Start: "20:00", shift4End: "03:00",
        hasBreak: true,
        breakOutFixed: "13:30", breakInDeadline: "15:30",
        deductionPerMinute: 1,
    },
    // ตำแหน่ง เสิร์ฟ - กะ 1 - วันเสาร์-อาทิตย์/วันนักขัตฤกษ์
    'เสิร์ฟ_1_weekend': {
        shift1Start: "06:00", shift1End: "11:30", shift1Deadline: "10:00",
        shift2Start: "11:30", shift2End: "14:00",
        shift3Start: "13:00", shift3End: "16:00",
        shift4Start: "20:00", shift4End: "03:00",
        hasBreak: true,
        breakOutFixed: "13:00", breakInDeadline: "14:30",
        deductionPerMinute: 1,
    },
    // ตำแหน่ง เสิร์ฟ - กะ 2 - วันจันทร์-ศุกร์ (ไม่มีพัก)
    'เสิร์ฟ_2_weekday': {
        shift1Start: "09:00", shift1End: "14:00", shift1Deadline: "12:00",
        shift2Start: null, shift2End: null,
        shift3Start: null, shift3End: null,
        shift4Start: "20:00", shift4End: "03:00",
        hasBreak: false,
        breakOutFixed: null, breakInDeadline: null,
        deductionPerMinute: 1,
    },
    // ตำแหน่ง เสิร์ฟ - กะ 2 - วันเสาร์-อาทิตย์/วันนักขัตฤกษ์
    'เสิร์ฟ_2_weekend': {
        shift1Start: "06:00", shift1End: "11:30", shift1Deadline: "12:00",
        shift2Start: "13:00", shift2End: "16:00",
        shift3Start: "14:00", shift3End: "18:00",
        shift4Start: "20:00", shift4End: "03:00",
        hasBreak: true,
        breakOutFixed: "14:30", breakInDeadline: "16:00",
        deductionPerMinute: 1,
    },
    // ตำแหน่ง เดิน - กะ 1 (ทุกวัน)
    'เดิน_1': {
        shift1Start: "06:00", shift1End: "11:30", shift1Deadline: "10:00",
        shift2Start: "11:30", shift2End: "14:00",
        shift3Start: "13:00", shift3End: "16:00",
        shift4Start: "20:00", shift4End: "03:00",
        hasBreak: true,
        breakOutFixed: "13:00", breakInDeadline: "14:30",
        deductionPerMinute: 1,
    },
    // ตำแหน่ง เดิน - กะ 2 (ทุกวัน)
    'เดิน_2': {
        shift1Start: "06:00", shift1End: "11:30", shift1Deadline: "12:00",
        shift2Start: "13:00", shift2End: "16:00",
        shift3Start: "14:00", shift3End: "18:00",
        shift4Start: "20:00", shift4End: "03:00",
        hasBreak: true,
        breakOutFixed: "14:30", breakInDeadline: "16:00",
        deductionPerMinute: 1,
    },
    // ตำแหน่ง ครัว - กะ 1 (ทุกวัน)
    'ครัว_1': {
        shift1Start: "06:00", shift1End: "11:30", shift1Deadline: "10:00",
        shift2Start: "12:00", shift2End: "15:00",
        shift3Start: "13:30", shift3End: "17:00",
        shift4Start: "20:00", shift4End: "03:00",
        hasBreak: true,
        breakOutFixed: "13:30", breakInDeadline: "15:00",
        deductionPerMinute: 1,
    },
    // ตำแหน่ง ครัว - กะ 2 (ทุกวัน)
    'ครัว_2': {
        shift1Start: "06:00", shift1End: "11:30", shift1Deadline: "12:00",
        shift2Start: "13:30", shift2End: "16:30",
        shift3Start: "15:00", shift3End: "18:30",
        shift4Start: "20:00", shift4End: "03:00",
        hasBreak: true,
        breakOutFixed: "15:00", breakInDeadline: "16:30",
        deductionPerMinute: 1,
    },
};

// Detect WDD position from employee name (last word)
function detectWddPosition(empName) {
    if (!empName) return null;
    const name = empName.trim();
    if (name.endsWith('ครัว')) return 'ครัว';
    if (name.endsWith('เดิน')) return 'เดิน';
    if (name.endsWith('เสิร์ฟ')) return 'เสิร์ฟ';
    return null;
}

// Detect shift number from first scan time (< 11:00 = กะ 1, >= 11:00 = กะ 2)
function detectWddShiftNum(firstScanTime) {
    if (!firstScanTime) return 1;
    const min = timeToMinutes(firstScanTime);
    return min < timeToMinutes('11:00') ? 1 : 2;
}

// Global public holidays array - loaded from DB on app init
let PUBLIC_HOLIDAYS = [];

// Check if date is weekend (Saturday=6, Sunday=0) or public holiday
function isWeekend(isoDate) {
    const d = new Date(isoDate);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) return true;
    return PUBLIC_HOLIDAYS.includes(isoDate);
}

// Get WDD shift config for a specific employee and date, given first scan time
function getWddDayConfig(empName, isoDate, firstScanTime) {
    const position = detectWddPosition(empName);
    if (!position) return null;
    const shiftNum = detectWddShiftNum(firstScanTime);
    const weekend = isWeekend(isoDate);

    // เดิน และ ครัว ไม่แยก weekday/weekend
    if (position === 'เดิน' || position === 'ครัว') {
        return WDD_SHIFT_CONFIGS[`${position}_${shiftNum}`] || null;
    }
    // เสิร์ฟ แยก weekday/weekend
    const dayType = weekend ? 'weekend' : 'weekday';
    return WDD_SHIFT_CONFIGS[`${position}_${shiftNum}_${dayType}`] || null;
}

function buddhistToCE(buddhistYear) {
    return buddhistYear - 543;
}

function ceToBuddhist(ceYear) {
    return ceYear + 543;
}

function parseBuddhistDate(dateStr) {
    const parts = dateStr.split("/");
    if (parts.length !== 3) return "";
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);
    if (year > 2500) year = buddhistToCE(year);
    const mm = month.toString().padStart(2, "0");
    const dd = day.toString().padStart(2, "0");
    return `${year}-${mm}-${dd}`;
}

function getThaiDayName(isoDate) {
    const date = new Date(isoDate);
    return THAI_DAYS[date.getDay()];
}

function getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
}

function formatTime(timeStr) {
    if (!timeStr) return "-";
    const parts = timeStr.split(":");
    if (parts.length < 2) return timeStr;
    const h = parseInt(parts[0], 10);
    const m = parts[1];
    return `${h}:${m}`;
}

function timeToMinutes(timeStr) {
    const parts = timeStr.split(":");
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    return h * 60 + m;
}

function minutesToTime(minutes) {
    if (minutes <= 0) return "0:00";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}:${m.toString().padStart(2, "0")}`;
}

function formatDate(isoDate) {
    const parts = isoDate.split("-");
    if (parts.length !== 3) return isoDate;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getMonthDates(year, month) {
    const days = getDaysInMonth(year, month);
    const dates = [];
    for (let d = 1; d <= days; d++) {
        const mm = month.toString().padStart(2, "0");
        const dd = d.toString().padStart(2, "0");
        dates.push(`${year}-${mm}-${dd}`);
    }
    return dates;
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
