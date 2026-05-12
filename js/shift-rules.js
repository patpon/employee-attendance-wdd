// ============================================
// Shift Rules Reference Page
// แสดงเงื่อนไขการลงเวลาของแต่ละตำแหน่ง/กะ
// อ่านจาก WDD_SHIFT_CONFIGS ใน date-utils.js (read-only)
// ============================================

// แปลง key ของ config → label ภาษาไทย
function shiftConfigLabel(key) {
    const parts = key.split('_');
    const position = parts[0];
    const shiftNum = parts[1];
    const dayType = parts[2];
    let label = `${position} · กะ ${shiftNum}`;
    if (dayType === 'weekday') label += ' · จันทร์-ศุกร์';
    else if (dayType === 'weekend') label += ' · เสาร์-อาทิตย์ + วันหยุดนักขัตฤกษ์';
    else label += ' · ทุกวัน';
    return label;
}

// สีตามตำแหน่ง
function positionColor(position) {
    return {
        'เสิร์ฟ': { bg: '#dbeafe', text: '#1d4ed8', border: '#3b82f6' },
        'เดิน':   { bg: '#fef3c7', text: '#b45309', border: '#f59e0b' },
        'ครัว':   { bg: '#fce7f3', text: '#be185d', border: '#ec4899' },
    }[position] || { bg: '#f3f4f6', text: '#374151', border: '#9ca3af' };
}

// Render หนึ่ง card สำหรับ 1 config
function renderShiftConfigCard(key, config) {
    const position = key.split('_')[0];
    const c = positionColor(position);
    const label = shiftConfigLabel(key);

    // Row helper
    const row = (icon, title, range, deadline, extra) => `
        <div style="padding:10px 12px;background:#fafafa;border-left:3px solid ${c.border};border-radius:4px;margin-bottom:6px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
                <div style="font-weight:600;font-size:13px;color:#374151;">${icon} ${title}</div>
                <div style="font-family:monospace;font-size:13px;color:#111;">${range || '-'}</div>
            </div>
            ${deadline ? `<div style="font-size:11px;color:#dc2626;margin-top:3px;">⏰ Deadline: <b>${deadline}</b></div>` : ''}
            ${extra ? `<div style="font-size:11px;color:#6b7280;margin-top:3px;">${extra}</div>` : ''}
        </div>
    `;

    const s1Range = config.shift1Start && config.shift1End ? `${config.shift1Start} - ${config.shift1End}` : '-';
    const s2Range = config.shift2Start && config.shift2End ? `${config.shift2Start} - ${config.shift2End}` : '-';
    const s3Range = config.shift3Start && config.shift3End ? `${config.shift3Start} - ${config.shift3End}` : '-';
    const s4Range = config.shift4Start && config.shift4End ? `${config.shift4Start} - ${config.shift4End}` : '-';

    return `
        <div class="card" style="border-top:4px solid ${c.border};padding:14px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                <h3 style="font-size:15px;font-weight:700;color:${c.text};margin:0;">${label}</h3>
                <span style="background:${c.bg};color:${c.text};padding:3px 10px;border-radius:10px;font-size:11px;font-weight:600;">${position}</span>
            </div>

            ${row('🟢', 'เข้างาน', s1Range, config.shift1Deadline, null)}

            ${config.hasBreak ? row(
                '🟡', 'พักออก', s2Range, null,
                config.breakOutFixed ? `เวลาประจำ: <b>${config.breakOutFixed}</b>` : null
            ) : `<div style="padding:10px 12px;background:#f3f4f6;border-radius:4px;margin-bottom:6px;font-size:12px;color:#6b7280;text-align:center;">❌ ไม่มีพัก</div>`}

            ${config.hasBreak ? row(
                '🟠', 'พักเข้า', s3Range, config.breakInDeadline,
                'Deadline เลื่อนตามถ้าพักออกช้ากว่าเวลาประจำ'
            ) : ''}

            ${row('🌙', 'เลิกงาน (ข้ามคืน)', s4Range, null, null)}

            <div style="margin-top:10px;padding:8px 12px;background:#fef2f2;border-radius:4px;font-size:12px;">
                <b style="color:#dc2626;">หักสาย:</b> ${config.deductionPerMinute || 1} บาท/นาที
            </div>
        </div>
    `;
}

// หน้าหลัก
function renderShiftRules(container) {
    const configs = (typeof WDD_SHIFT_CONFIGS !== 'undefined') ? WDD_SHIFT_CONFIGS : null;
    if (!configs) {
        container.innerHTML = `<div class="card" style="max-width:600px;margin:40px auto;text-align:center;color:#dc2626;">ไม่พบ WDD_SHIFT_CONFIGS - อาจต้องอัพเดท date-utils.js</div>`;
        return;
    }

    const keys = Object.keys(configs);
    const positions = [...new Set(keys.map(k => k.split('_')[0]))];

    container.innerHTML = `
        <div style="max-width:1200px;margin:0 auto;">
            <div class="mb-6">
                <h1 class="text-2xl font-bold text-gray-800">📖 คู่มือเงื่อนไขกะ</h1>
                <p class="text-gray-500 text-sm mt-1">เงื่อนไขการลงเวลาของแต่ละตำแหน่งและกะการทำงาน (อ่านอย่างเดียว)</p>
            </div>

            <div class="card mb-6" style="background:#eff6ff;border-left:4px solid #2563eb;">
                <h3 style="font-size:14px;font-weight:700;color:#1e40af;margin:0 0 8px 0;">💡 วิธีระบบจัดกะอัตโนมัติ</h3>
                <ul style="margin:0;padding-left:20px;font-size:13px;color:#1e3a8a;line-height:1.7;">
                    <li><b>ตำแหน่ง:</b> ตรวจจาก<u>คำสุดท้าย</u>ในชื่อพนักงาน เช่น "แวว ครัว" → ครัว</li>
                    <li><b>กะ:</b> scan แรกของวัน &lt; ${typeof WDD_SHIFT_BOUNDARY_TIME !== 'undefined' ? WDD_SHIFT_BOUNDARY_TIME : '11:00'} = <b>กะ 1</b>, ≥ ${typeof WDD_SHIFT_BOUNDARY_TIME !== 'undefined' ? WDD_SHIFT_BOUNDARY_TIME : '11:00'} = <b>กะ 2</b></li>
                    <li><b>เสิร์ฟ:</b> แยกเงื่อนไข จันทร์-ศุกร์ vs เสาร์-อาทิตย์ (รวมวันหยุดนักขัตฤกษ์)</li>
                    <li><b>เดิน / ครัว:</b> ใช้เงื่อนไขเดียวทุกวัน</li>
                    <li><b>หักสาย scan1:</b> เกิน Deadline เข้างาน</li>
                    <li><b>หักสาย scan3:</b> เกิน Deadline พักเข้า (เลื่อนตามถ้าพักออกช้ากว่าประจำ)</li>
                </ul>
            </div>

            <div class="card mb-6">
                <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                    <span style="font-size:13px;font-weight:600;color:#374151;">กรองตำแหน่ง:</span>
                    <button class="filter-pill active" data-filter="all" onclick="filterShiftRules('all')" style="padding:6px 14px;border-radius:14px;border:1px solid #2563eb;background:#2563eb;color:white;font-size:12px;font-weight:600;cursor:pointer;">ทั้งหมด</button>
                    ${positions.map(p => {
                        const c = positionColor(p);
                        return `<button class="filter-pill" data-filter="${p}" onclick="filterShiftRules('${p}')" style="padding:6px 14px;border-radius:14px;border:1px solid ${c.border};background:white;color:${c.text};font-size:12px;font-weight:600;cursor:pointer;">${p}</button>`;
                    }).join('')}
                </div>
            </div>

            <div id="shiftRulesGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px;margin-bottom:24px;">
                ${keys.map(k => `<div class="shift-rule-card" data-position="${k.split('_')[0]}">${renderShiftConfigCard(k, configs[k])}</div>`).join('')}
            </div>

            <div class="card mb-6">
                <h3 style="font-size:14px;font-weight:700;color:#374151;margin:0 0 12px 0;">📋 ตารางสรุป (Quick Reference)</h3>
                <div style="overflow-x:auto;">
                    <table style="width:100%;font-size:12px;border-collapse:collapse;">
                        <thead>
                            <tr style="background:#f9fafb;border-bottom:2px solid #e5e7eb;">
                                <th style="padding:8px 10px;text-align:left;">ตำแหน่ง</th>
                                <th style="padding:8px 10px;text-align:center;">กะ</th>
                                <th style="padding:8px 10px;text-align:left;">วัน</th>
                                <th style="padding:8px 10px;text-align:center;">เข้างาน</th>
                                <th style="padding:8px 10px;text-align:center;">DL เข้า</th>
                                <th style="padding:8px 10px;text-align:center;">พักออก</th>
                                <th style="padding:8px 10px;text-align:center;">พักประจำ</th>
                                <th style="padding:8px 10px;text-align:center;">DL พักเข้า</th>
                                <th style="padding:8px 10px;text-align:center;">หัก (฿/นาที)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${keys.map(k => {
                                const c = configs[k];
                                const parts = k.split('_');
                                const dayLabel = parts[2] === 'weekday' ? 'จ-ศ' : parts[2] === 'weekend' ? 'ส-อา' : 'ทุกวัน';
                                const col = positionColor(parts[0]);
                                return `
                                    <tr data-position="${parts[0]}" class="shift-rule-row" style="border-bottom:1px solid #f3f4f6;">
                                        <td style="padding:8px 10px;"><span style="background:${col.bg};color:${col.text};padding:2px 8px;border-radius:8px;font-weight:600;">${parts[0]}</span></td>
                                        <td style="padding:8px 10px;text-align:center;font-weight:600;">${parts[1]}</td>
                                        <td style="padding:8px 10px;color:#6b7280;">${dayLabel}</td>
                                        <td style="padding:8px 10px;text-align:center;font-family:monospace;">${c.shift1Start || '-'}-${c.shift1End || '-'}</td>
                                        <td style="padding:8px 10px;text-align:center;color:#dc2626;font-weight:600;">${c.shift1Deadline || '-'}</td>
                                        <td style="padding:8px 10px;text-align:center;font-family:monospace;">${c.shift2Start ? `${c.shift2Start}-${c.shift2End}` : '<span style="color:#9ca3af;">ไม่มี</span>'}</td>
                                        <td style="padding:8px 10px;text-align:center;font-family:monospace;">${c.breakOutFixed || '<span style="color:#9ca3af;">-</span>'}</td>
                                        <td style="padding:8px 10px;text-align:center;color:#dc2626;font-weight:600;">${c.breakInDeadline || '<span style="color:#9ca3af;">-</span>'}</td>
                                        <td style="padding:8px 10px;text-align:center;">${c.deductionPerMinute || 1}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// Filter
function filterShiftRules(pos) {
    document.querySelectorAll('.filter-pill').forEach(b => {
        const active = b.dataset.filter === pos;
        b.style.background = active ? '#2563eb' : 'white';
        b.style.color = active ? 'white' : (b.style.color === 'white' ? '#2563eb' : b.style.color);
        b.classList.toggle('active', active);
        // restore color for non-active
        if (!active) {
            const c = positionColor(b.dataset.filter);
            b.style.color = c.text;
            b.style.borderColor = c.border;
        } else {
            b.style.borderColor = '#2563eb';
        }
    });
    document.querySelectorAll('.shift-rule-card').forEach(el => {
        el.style.display = (pos === 'all' || el.dataset.position === pos) ? '' : 'none';
    });
    document.querySelectorAll('.shift-rule-row').forEach(el => {
        el.style.display = (pos === 'all' || el.dataset.position === pos) ? '' : 'none';
    });
}

// Modal popup: ดูเงื่อนไขของพนักงานหนึ่งคน
function showEmployeeShiftPopup(empName) {
    const configs = (typeof WDD_SHIFT_CONFIGS !== 'undefined') ? WDD_SHIFT_CONFIGS : null;
    if (!configs || typeof detectWddPosition !== 'function') {
        alert('ระบบยังไม่รองรับ - อาจต้องอัพเดท date-utils.js');
        return;
    }
    const position = detectWddPosition(empName);
    if (!position) {
        alert(`ไม่สามารถตรวจตำแหน่งจากชื่อ "${empName}" - คำสุดท้ายต้องเป็น เสิร์ฟ/เดิน/ครัว`);
        return;
    }

    // หา configs ที่เกี่ยวข้องทั้งหมดของตำแหน่งนี้
    const relevantKeys = Object.keys(configs).filter(k => k.startsWith(position + '_'));

    // Build modal
    let modal = document.getElementById('shiftPopupModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'shiftPopupModal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
        modal.onclick = (e) => { if (e.target === modal) closeShiftPopup(); };
        document.body.appendChild(modal);
    }
    const c = positionColor(position);
    modal.innerHTML = `
        <div style="background:white;border-radius:8px;max-width:900px;width:100%;max-height:90vh;overflow-y:auto;padding:20px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;border-bottom:2px solid ${c.border};padding-bottom:10px;">
                <div>
                    <h2 style="font-size:18px;font-weight:700;margin:0;color:${c.text};">📖 เงื่อนไขกะ: ${empName}</h2>
                    <p style="font-size:13px;color:#6b7280;margin:4px 0 0 0;">ตำแหน่ง: <b style="color:${c.text};">${position}</b> · มี ${relevantKeys.length} เงื่อนไข</p>
                </div>
                <button onclick="closeShiftPopup()" style="font-size:24px;background:none;border:none;cursor:pointer;color:#9ca3af;line-height:1;">&times;</button>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px;">
                ${relevantKeys.map(k => renderShiftConfigCard(k, configs[k])).join('')}
            </div>
        </div>
    `;
    modal.style.display = 'flex';
}

function closeShiftPopup() {
    const m = document.getElementById('shiftPopupModal');
    if (m) m.style.display = 'none';
}
