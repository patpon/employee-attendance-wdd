// ============================================
// PDF Generator - uses jsPDF + autoTable
// A4 Portrait | 1 employee per page
// ============================================

let _sarabunFontBase64 = null;
let _fontLoading = false;

async function loadSarabunFont() {
    if (_sarabunFontBase64) return _sarabunFontBase64;
    if (_fontLoading) {
        while (_fontLoading) await new Promise(r => setTimeout(r, 100));
        return _sarabunFontBase64;
    }
    _fontLoading = true;
    try {
        const urls = [
            'fonts/Sarabun-Regular.ttf',
            'https://github.com/google/fonts/raw/main/ofl/sarabun/Sarabun-Regular.ttf',
        ];
        let buf = null;
        for (const url of urls) {
            try {
                const res = await fetch(url);
                if (res.ok) { buf = await res.arrayBuffer(); break; }
            } catch (e) { continue; }
        }
        if (buf && buf.byteLength > 10000) {
            const bytes = new Uint8Array(buf);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
            _sarabunFontBase64 = btoa(binary);
        }
    } catch (err) {
        console.error('Failed to load Sarabun font:', err);
        _sarabunFontBase64 = null;
    }
    _fontLoading = false;
    return _sarabunFontBase64;
}

async function generatePDF(records) {
    let fontData = null;
    try { fontData = await loadSarabunFont(); } catch (e) { console.warn('Font load failed:', e); }
    const fn = fontData ? 'Sarabun' : 'helvetica';

    const { jsPDF } = window.jspdf;
    // A4 Portrait
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    if (fontData) {
        doc.addFileToVFS('Sarabun-Regular.ttf', fontData);
        doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'normal');
        doc.setFont('Sarabun');
    }

    const PW = 210, PH = 297;
    const ML = 10, MR = 10, MT = 10;
    const CW = PW - ML - MR; // 190mm content width

    // ── colour palette ───────────────────────────────────────────────
    const C_NAVY   = [30, 58, 95];
    const C_WHITE  = [255, 255, 255];
    const C_GOLD   = [251, 191, 36];
    const C_SLATE  = [248, 250, 252];
    const C_BORDER = [203, 213, 225];
    const C_AMBER  = [254, 243, 199];
    const C_RED_BG = [254, 226, 226];
    const C_FOOT   = [226, 232, 240];
    const C_RED    = [220, 38, 38];
    const C_GREEN  = [22, 163, 74];
    const C_BLUE   = [59, 130, 246];
    const C_GRAY   = [107, 114, 128];
    const C_ORANGE = [217, 119, 6];

    for (let ri = 0; ri < records.length; ri++) {
        const record = records[ri];
        if (!record) continue;
        if (ri > 0) doc.addPage();
        if (fontData) doc.setFont('Sarabun');

        const buddhistYear = ceToBuddhist(record.year);
        const shopName = record.shopName || DEFAULT_SHOP_NAME;
        let y = MT;

        // ── [1] Header bar ───────────────────────────────────────────
        doc.setFillColor(...C_NAVY);
        doc.roundedRect(ML, y, CW, 20, 2, 2, 'F');

        // Gold accent line under title
        doc.setFillColor(...C_GOLD);
        doc.rect(ML, y + 14, CW, 1, 'F');

        doc.setTextColor(...C_WHITE);
        doc.setFontSize(14);
        if (fontData) doc.setFont('Sarabun');
        doc.text('ตารางสรุปการทำงานรายบุคคล', PW / 2, y + 8, { align: 'center' });
        doc.setFontSize(8.5);
        doc.text('ร้าน: ' + shopName + '  |  ประจำเดือน: ' + THAI_MONTHS[record.month - 1] + ' ' + buddhistYear, PW / 2, y + 13, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        y += 24;

        // ── [2] Employee info card ───────────────────────────────────
        doc.setFillColor(...C_SLATE);
        doc.setDrawColor(...C_BORDER);
        doc.roundedRect(ML, y, CW, 18, 2, 2, 'FD');

        // Left: code + name
        if (fontData) doc.setFont('Sarabun');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('รหัสพนักงาน', ML + 4, y + 5);
        doc.setFontSize(9);
        doc.setTextColor(...C_NAVY);
        doc.text(String(record.empCode), ML + 4, y + 10);

        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('ชื่อ-นามสกุล', ML + 22, y + 5);
        doc.setFontSize(11);
        doc.setTextColor(20, 20, 20);
        doc.text(record.empName, ML + 22, y + 11);

        // Right: stat boxes
        const stats = [
            { label: 'ทำงาน',     value: record.workingDays + ' วัน',           color: C_GREEN },
            { label: 'หยุด',      value: record.holidays + ' วัน',              color: C_BLUE },
            { label: 'ขาด',       value: record.absent + ' วัน',               color: record.absent > 0 ? C_RED : C_GRAY },
            { label: 'หักเข้าสาย', value: record.totalLate1Baht + ' บาท',       color: record.totalLate1Baht > 0 ? C_ORANGE : C_GRAY },
            { label: 'หักสายพัก',  value: record.totalLate2Baht + ' บาท',       color: record.totalLate2Baht > 0 ? C_ORANGE : C_GRAY },
            { label: 'รวมหัก',    value: record.totalDeduction.toLocaleString() + ' บาท', color: record.totalDeduction > 0 ? C_RED : C_GREEN },
        ];

        const statX0 = ML + 65;
        const statW  = (CW - 67) / stats.length;
        stats.forEach((s, si) => {
            const sx = statX0 + si * statW;
            // Mini box
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(...C_BORDER);
            doc.roundedRect(sx, y + 2, statW - 1, 14, 1, 1, 'FD');

            doc.setFontSize(6.5);
            doc.setTextColor(120, 120, 120);
            doc.text(s.label, sx + (statW - 1) / 2, y + 7, { align: 'center' });

            doc.setFontSize(8);
            doc.setTextColor(...s.color);
            doc.text(s.value, sx + (statW - 1) / 2, y + 13, { align: 'center' });
        });

        doc.setTextColor(0, 0, 0);
        y += 22;

        // ── [3] Table ────────────────────────────────────────────────
        const days = record.days || [];
        const fmt  = (t) => (t ? t.substring(0, 5) : '-');

        const headers = [['#', 'วันที่', 'วัน', 'หยุด',
            'เข้า', 'พักออก', 'พักเข้า', 'เลิก',
            'เข้าสาย', 'บาท', 'รอบพัก', 'สายพัก', 'บาท']];

        const body = days.map((day, idx) => [
            String(idx + 1),
            formatDate(day.date),
            day.dayOfWeek,
            day.isHoliday ? 'YES' : '',
            day.isHoliday ? '-' : (day.autoScan1 ? '-' : fmt(day.scan1)),
            day.isHoliday ? '-' : (day.autoScan2 ? '-' : fmt(day.scan2)),
            day.isHoliday ? '-' : (day.autoScan3 ? '-' : fmt(day.scan3)),
            day.isHoliday ? '-' : fmt(day.scan4),
            day.late1Minutes > 0 ? minutesToTime(day.late1Minutes) : '',
            day.late1Baht > 0 ? String(day.late1Baht) : '0',
            day.isHoliday ? '-' : (day.breakRound || ''),
            day.late2Minutes > 0 ? minutesToTime(day.late2Minutes) : '',
            day.late2Baht > 0 ? String(day.late2Baht) : '0',
        ]);

        // Summary row
        const totalLate1Min = days.reduce((s, d) => s + (d.late1Minutes || 0), 0);
        const totalLate2Min = days.reduce((s, d) => s + (d.late2Minutes || 0), 0);
        body.push(['', '', '', '', '', '', '', 'รวม',
            minutesToTime(totalLate1Min), String(record.totalLate1Baht),
            '', minutesToTime(totalLate2Min), String(record.totalLate2Baht)]);

        doc.autoTable({
            head: headers,
            body: body,
            startY: y,
            margin: { left: ML, right: MR },
            theme: 'grid',
            styles: {
                fontSize: 7.5,
                cellPadding: 1.8,
                halign: 'center',
                valign: 'middle',
                font: fn,
                textColor: [30, 30, 30],
                lineColor: [148, 163, 184],
                lineWidth: 0.2,
            },
            headStyles: {
                fillColor: C_NAVY,
                textColor: C_WHITE,
                fontSize: 7.5,
                fontStyle: 'bold',
                font: fn,
                cellPadding: 2.2,
            },
            columnStyles: {
                0:  { cellWidth: 7 },   // #
                1:  { cellWidth: 22 },  // วันที่
                2:  { cellWidth: 13 },  // วัน
                3:  { cellWidth: 11 },  // หยุด
                4:  { cellWidth: 14 },  // เข้า
                5:  { cellWidth: 14 },  // พักออก
                6:  { cellWidth: 14 },  // พักเข้า
                7:  { cellWidth: 14 },  // เลิก
                8:  { cellWidth: 15 },  // เข้าสาย
                9:  { cellWidth: 11 },  // บาท
                10: { cellWidth: 26, halign: 'left' },  // รอบพัก
                11: { cellWidth: 15 },  // สายพัก
                12: { cellWidth: 14 },  // บาท
            },
            didParseCell: (data) => {
                if (data.section === 'body') {
                    const isSummary = data.row.index === days.length;
                    if (isSummary) {
                        data.cell.styles.fillColor = C_FOOT;
                        data.cell.styles.fontStyle = 'bold';
                    } else {
                        const day = days[data.row.index];
                        if (day) {
                            if (day.isHoliday) data.cell.styles.fillColor = C_AMBER;
                            else if (day.isAbsent) data.cell.styles.fillColor = C_RED_BG;
                            // Highlight late cells
                            if (!day.isHoliday && !isSummary) {
                                if ((data.column.index === 8 || data.column.index === 9) && day.late1Baht > 0)
                                    data.cell.styles.textColor = C_RED;
                                if ((data.column.index === 11 || data.column.index === 12) && day.late2Baht > 0)
                                    data.cell.styles.textColor = C_ORANGE;
                            }
                        }
                    }
                }
            },
        });

        // ── [4] Footer ───────────────────────────────────────────────
        const tableBottom = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY : PH - 15;

        // Total deduction highlight box
        if (record.totalDeduction > 0) {
            doc.setFillColor(254, 226, 226);
            doc.setDrawColor(...C_RED);
            doc.roundedRect(ML, tableBottom + 3, 80, 8, 1, 1, 'FD');
            doc.setFontSize(8);
            doc.setTextColor(...C_RED);
            if (fontData) doc.setFont('Sarabun');
            doc.text('รวมหักทั้งหมด: ' + record.totalDeduction.toLocaleString() + ' บาท', ML + 4, tableBottom + 8.5);
        } else {
            doc.setFillColor(220, 252, 231);
            doc.setDrawColor(...C_GREEN);
            doc.roundedRect(ML, tableBottom + 3, 80, 8, 1, 1, 'FD');
            doc.setFontSize(8);
            doc.setTextColor(...C_GREEN);
            if (fontData) doc.setFont('Sarabun');
            doc.text('ไม่มีค่าปรับ', ML + 4, tableBottom + 8.5);
        }

        // Print timestamp (right)
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text('พิมพ์เมื่อ: ' + new Date().toLocaleString('th-TH'), PW - MR, tableBottom + 8.5, { align: 'right' });
        doc.setTextColor(0, 0, 0);

        // Page number (center bottom)
        doc.setFontSize(7);
        doc.setTextColor(180, 180, 180);
        doc.text('หน้า ' + (ri + 1) + ' / ' + records.length, PW / 2, PH - 4, { align: 'center' });
        doc.setTextColor(0, 0, 0);
    }

    // ── Save ─────────────────────────────────────────────────────────
    const monthLabel = THAI_MONTHS[records[0].month - 1];
    const yearLabel  = ceToBuddhist(records[0].year);
    const fileName = records.length === 1
        ? 'รายงาน_' + records[0].empName + '_' + monthLabel + '_' + yearLabel + '.pdf'
        : 'รายงาน_' + monthLabel + '_' + yearLabel + '.pdf';
    doc.save(fileName);
}
