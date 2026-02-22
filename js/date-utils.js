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
    breakRoundA_outBefore: "14:00",
    breakRoundA_deadline: "14:30",
    breakRoundB_outBefore: "16:00",
    breakRoundB_deadline: "16:30",
    deductionPerMinute: 1,
};

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
