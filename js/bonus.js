// ============================================
// BONUS PAGE - Year-end Bonus Management
// ============================================

let bonusYear = new Date().getFullYear();
let bonusRecords = [];
let bonusEmployees = [];
let bonusSearch = '';
let bonusSort = 'asc';

async function renderBonus(container) {
    bonusYear = new Date().getFullYear();
    container.innerHTML = `
        <div style="max-width:960px;margin:0 auto;">
            <div class="mb-6">
                <h1 class="text-2xl font-bold text-gray-800">🏆 โบนัสประจำปี</h1>
                <p class="text-gray-500 text-sm mt-1">ประเมินผลงานและพิจารณาโบนัสพนักงาน</p>
            </div>
            <div class="card mb-6">
                <div style="display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap;">
                    <div>
                        <label class="text-sm text-gray-600" style="display:block;margin-bottom:4px;">ปี (ค.ศ.)</label>
                        <input type="number" id="bonusYear" class="input-field" value="${bonusYear}" min="2020" max="2035" style="width:120px;" onchange="bonusYear=parseInt(this.value)">
                    </div>
                    <div style="flex:1;min-width:200px;">
                        <label class="text-sm text-gray-600" style="display:block;margin-bottom:4px;">ค้นหาพนักงาน</label>
                        <input type="text" id="bonusSearchInput" class="input-field" placeholder="🔍 ชื่อ หรือ รหัสพนักงาน..." value="${bonusSearch}" oninput="bonusSearch=this.value;renderBonusContent()" style="width:100%;">
                    </div>
                    <div style="display:flex;gap:8px;align-items:flex-end;">
                        <button id="bonusSortAsc" onclick="setBonusSort('asc')" style="padding:8px 14px;border-radius:8px;font-size:13px;cursor:pointer;border:1px solid ${bonusSort==='asc'?'#3b82f6':'#d1d5db'};background:${bonusSort==='asc'?'#eff6ff':'white'};color:${bonusSort==='asc'?'#2563eb':'#374151'};font-weight:${bonusSort==='asc'?'600':'400'};">A→Z</button>
                        <button id="bonusSortDesc" onclick="setBonusSort('desc')" style="padding:8px 14px;border-radius:8px;font-size:13px;cursor:pointer;border:1px solid ${bonusSort==='desc'?'#3b82f6':'#d1d5db'};background:${bonusSort==='desc'?'#eff6ff':'white'};color:${bonusSort==='desc'?'#2563eb':'#374151'};font-weight:${bonusSort==='desc'?'600':'400'};">Z→A</button>
                    </div>
                    <div style="display:flex;gap:8px;">
                        <button class="btn-primary" onclick="loadBonusPage()">🔄 โหลดข้อมูล</button>
                        <button class="btn-success" onclick="initBonusAllEmployees()">➕ เพิ่มพนักงานทั้งหมด</button>
                        <button onclick="showBonusSummaryReport()" style="padding:8px 14px;border-radius:8px;font-size:13px;cursor:pointer;border:1px solid #7c3aed;background:#f5f3ff;color:#7c3aed;font-weight:600;">📋 รายงานสรุป</button>
                    </div>
                </div>
            </div>
            <div id="bonusContent">
                <div style="text-align:center;padding:48px;color:#9ca3af;">กรุณากด "โหลดข้อมูล" เพื่อเริ่มต้น</div>
            </div>
        </div>`;
}

async function loadBonusPage() {
    bonusYear = parseInt(document.getElementById('bonusYear').value);
    const content = document.getElementById('bonusContent');
    content.innerHTML = `<div style="text-align:center;padding:48px;color:#6b7280;"><div style="font-size:32px;margin-bottom:8px;">⚙️</div>กำลังโหลด...</div>`;
    try {
        [bonusRecords, bonusEmployees] = await Promise.all([
            api.getBonusRecords({ shopId: DEFAULT_SHOP_ID, year: bonusYear }),
            api.getEmployees(),
        ]);
        renderBonusContent();
    } catch (err) {
        content.innerHTML = `<div class="alert alert-error">เกิดข้อผิดพลาด: ${escHtml(err.message)}</div>`;
    }
}

async function initBonusAllEmployees() {
    bonusYear = parseInt(document.getElementById('bonusYear').value);
    // Filter only active employees (exclude resigned employees)
    const shopEmps = bonusEmployees.filter(e => e.shopId === DEFAULT_SHOP_ID && e.isActive === 1);
    if (shopEmps.length === 0) { alert('ไม่พบพนักงานที่ยังทำงานอยู่'); return; }

    const btn = event.target;
    btn.disabled = true; btn.textContent = '⏳ กำลังสร้าง...';
    try {
        for (const emp of shopEmps) {
            await api.createBonusRecord({ shopId: DEFAULT_SHOP_ID, employeeId: emp.id, empCode: emp.empCode, empName: emp.name, year: bonusYear });
        }
        await loadBonusPage();
    } catch (err) {
        alert('เกิดข้อผิดพลาด: ' + err.message);
    }
    btn.disabled = false; btn.textContent = '➕ เพิ่มพนักงานทั้งหมด';
}

function setBonusSort(dir) {
    bonusSort = dir;
    const asc  = document.getElementById('bonusSortAsc');
    const desc = document.getElementById('bonusSortDesc');
    if (asc) {
        asc.style.border      = dir === 'asc' ? '1px solid #3b82f6' : '1px solid #d1d5db';
        asc.style.background  = dir === 'asc' ? '#eff6ff' : 'white';
        asc.style.color       = dir === 'asc' ? '#2563eb' : '#374151';
        asc.style.fontWeight  = dir === 'asc' ? '600' : '400';
    }
    if (desc) {
        desc.style.border     = dir === 'desc' ? '1px solid #3b82f6' : '1px solid #d1d5db';
        desc.style.background = dir === 'desc' ? '#eff6ff' : 'white';
        desc.style.color      = dir === 'desc' ? '#2563eb' : '#374151';
        desc.style.fontWeight = dir === 'desc' ? '600' : '400';
    }
    renderBonusContent();
}

function renderBonusContent() {
    const content = document.getElementById('bonusContent');
    if (bonusRecords.length === 0) {
        content.innerHTML = `<div class="card" style="text-align:center;padding:48px;color:#9ca3af;">
            <div style="font-size:48px;margin-bottom:12px;">📋</div>
            <p>ยังไม่มีข้อมูลโบนัสปี ${bonusYear}</p>
            <p style="font-size:13px;margin-top:8px;">กด "เพิ่มพนักงานทั้งหมด" เพื่อสร้างรายการ</p>
        </div>`;
        return;
    }
    const q = bonusSearch.trim().toLowerCase();
    let filtered = q
        ? bonusRecords.filter(r => r.empName.toLowerCase().includes(q) || r.empCode.toLowerCase().includes(q))
        : [...bonusRecords];
    filtered.sort((a, b) => {
        const cmp = a.empCode.localeCompare(b.empCode, undefined, { numeric: true, sensitivity: 'base' });
        return bonusSort === 'asc' ? cmp : -cmp;
    });
    if (filtered.length === 0) {
        content.innerHTML = `<div class="card" style="text-align:center;padding:48px;color:#9ca3af;">
            <div style="font-size:40px;margin-bottom:12px;">🔍</div>
            <p>ไม่พบพนักงานที่ค้นหา "${escHtml(q)}"</p>
        </div>`;
        return;
    }
    content.innerHTML = filtered.map((rec, idx) => renderBonusCard(rec, idx)).join('');
}

function renderBonusCard(rec, idx) {
    const statusMap = { pending: { label: 'รอพิจารณา', color: '#f59e0b', bg: '#fffbeb' }, approved: { label: 'อนุมัติแล้ว', color: '#10b981', bg: '#ecfdf5' }, rejected: { label: 'ไม่อนุมัติ', color: '#ef4444', bg: '#fef2f2' } };
    const st = statusMap[rec.bonusStatus] || statusMap.pending;
    const att = rec.attendanceSummary;
    const goodLogs = (rec.behaviorLogs || []).filter(l => l.type === 'good');
    const badLogs  = (rec.behaviorLogs || []).filter(l => l.type === 'bad');

    return `
    <div class="card mb-6" id="bonusCard_${rec.id}">
        <div style="display:flex;align-items:flex-start;gap:20px;flex-wrap:wrap;">
            <!-- Photo -->
            <div style="flex-shrink:0;text-align:center;">
                <div id="photoWrap_${rec.id}" style="width:90px;height:90px;border-radius:50%;overflow:hidden;border:3px solid #e5e7eb;background:#f3f4f6;display:flex;align-items:center;justify-content:center;cursor:pointer;" onclick="document.getElementById('photoInput_${rec.id}').click()">
                    ${rec.photo ? `<img src="${rec.photo}" style="width:100%;height:100%;object-fit:cover;">` : `<span style="font-size:36px;">👤</span>`}
                </div>
                <input type="file" id="photoInput_${rec.id}" accept="image/*" style="display:none;" onchange="uploadBonusPhoto('${rec.id}',this)">
                <div style="font-size:10px;color:#9ca3af;margin-top:4px;">คลิกเพื่อเปลี่ยนรูป</div>
            </div>
            <!-- Header info -->
            <div style="flex:1;min-width:200px;">
                <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                    <h3 style="font-size:18px;font-weight:700;color:var(--text-primary);margin:0;">${escHtml(rec.empName)}</h3>
                    <span style="font-size:12px;color:#6b7280;background:#f3f4f6;padding:2px 8px;border-radius:8px;">รหัส ${escHtml(rec.empCode)}</span>
                    <span style="font-size:12px;font-weight:600;padding:3px 10px;border-radius:10px;color:${st.color};background:${st.bg};">${st.label}</span>
                </div>
                <p style="font-size:13px;color:#6b7280;margin:4px 0 0;">ปีประเมิน ${bonusYear}</p>
            </div>
            <!-- Action buttons -->
            <div style="flex-shrink:0;display:flex;gap:8px;align-items:flex-start;">
                <button onclick="loadBonusAttendance('${rec.id}','${rec.employeeId}')" style="font-size:12px;padding:6px 12px;border:1px solid #3b82f6;background:#eff6ff;color:#2563eb;border-radius:6px;cursor:pointer;">📊 ดึงสรุปเวลาทำงาน</button>
                <button onclick="deleteBonusRecord('${rec.id}','${escHtml(rec.empName)}')" style="font-size:12px;padding:6px 10px;border:1px solid #fca5a5;background:#fff1f2;color:#dc2626;border-radius:6px;cursor:pointer;" title="ลบพนักงานออกจากรายการโบนัส">🗑️ ลบ</button>
            </div>
        </div>

        <!-- Attendance Summary -->
        ${att ? `
        <div style="margin-top:16px;padding:12px 16px;background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border-radius:10px;border:1px solid #bae6fd;">
            <div style="font-size:13px;font-weight:600;color:#0369a1;margin-bottom:10px;">📊 สรุปเวลาทำงานปี ${bonusYear}</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;">
                ${renderAttSummaryItem('✅ ทำงาน', att.workingDays + ' วัน', '#10b981')}
                ${renderAttSummaryItem('🎌 หยุด', att.holidays + ' วัน', '#6b7280')}
                ${renderAttSummaryItem('❌ ขาดงาน', att.absent + ' วัน', att.absent > 0 ? '#ef4444' : '#10b981')}
                ${renderAttSummaryItem('⏰ สายเข้างาน', minutesToTime(att.late1Minutes) + ' (' + att.late1Baht + '฿)', att.late1Baht > 0 ? '#f59e0b' : '#10b981')}
                ${renderAttSummaryItem('☕ สายพัก', minutesToTime(att.late2Minutes) + ' (' + att.late2Baht + '฿)', att.late2Baht > 0 ? '#f59e0b' : '#10b981')}
                ${renderAttSummaryItem('💸 รวมหัก', att.totalDeduction + ' บาท', att.totalDeduction > 0 ? '#ef4444' : '#10b981')}
            </div>
        </div>` : `<div style="margin-top:12px;padding:10px 14px;background:#f9fafb;border-radius:8px;font-size:13px;color:#9ca3af;border:1px dashed #e5e7eb;">ยังไม่มีสรุปเวลาทำงาน — กด "ดึงสรุปเวลาทำงาน" เพื่อโหลด</div>`}

        <!-- Behavior Logs -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;" class="bonus-behavior-grid">
            <!-- Good behavior -->
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px;">
                <div style="font-size:13px;font-weight:600;color:#15803d;margin-bottom:10px;">✅ พฤติกรรมที่ดี (${goodLogs.length})</div>
                <div id="goodLogs_${rec.id}">
                    ${goodLogs.length === 0 ? '<div style="font-size:12px;color:#9ca3af;font-style:italic;">ยังไม่มีบันทึก</div>' : goodLogs.map(l => renderBehaviorRow(l, rec.id)).join('')}
                </div>
                <button onclick="showAddBehaviorForm('${rec.id}','good')" style="margin-top:10px;font-size:12px;padding:5px 12px;border:1px dashed #16a34a;background:white;color:#15803d;border-radius:6px;cursor:pointer;width:100%;">+ เพิ่มพฤติกรรมดี</button>
            </div>
            <!-- Bad behavior -->
            <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px;">
                <div style="font-size:13px;font-weight:600;color:#c2410c;margin-bottom:10px;">⚠️ พฤติกรรมที่ต้องปรับปรุง (${badLogs.length})</div>
                <div id="badLogs_${rec.id}">
                    ${badLogs.length === 0 ? '<div style="font-size:12px;color:#9ca3af;font-style:italic;">ยังไม่มีบันทึก</div>' : badLogs.map(l => renderBehaviorRow(l, rec.id)).join('')}
                </div>
                <button onclick="showAddBehaviorForm('${rec.id}','bad')" style="margin-top:10px;font-size:12px;padding:5px 12px;border:1px dashed #ea580c;background:white;color:#c2410c;border-radius:6px;cursor:pointer;width:100%;">+ เพิ่มพฤติกรรมที่ต้องปรับปรุง</button>
            </div>
        </div>
        <div id="behaviorForm_${rec.id}" style="display:none;"></div>

        <!-- Bonus Decision -->
        <div style="margin-top:16px;padding:14px 16px;background:var(--bg-surface2);border-radius:10px;border:1px solid var(--input-border);">
            <div style="font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:12px;">💰 การพิจารณาโบนัส</div>
            <div style="display:grid;grid-template-columns:auto auto 1fr;gap:12px;align-items:center;flex-wrap:wrap;" class="bonus-form-grid">
                <div>
                    <label style="font-size:12px;color:#6b7280;display:block;margin-bottom:4px;">จำนวนโบนัส (บาท)</label>
                    <input type="number" id="bonusAmt_${rec.id}" value="${rec.bonusAmount || 0}" min="0" class="input-field" style="width:150px;" placeholder="0">
                </div>
                <div>
                    <label style="font-size:12px;color:#6b7280;display:block;margin-bottom:4px;">สถานะ</label>
                    <select id="bonusSt_${rec.id}" class="input-field" style="width:140px;">
                        <option value="pending"  ${rec.bonusStatus==='pending'  ? 'selected':''}>🟡 รอพิจารณา</option>
                        <option value="approved" ${rec.bonusStatus==='approved' ? 'selected':''}>🟢 อนุมัติแล้ว</option>
                        <option value="rejected" ${rec.bonusStatus==='rejected' ? 'selected':''}>🔴 ไม่อนุมัติ</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:12px;color:#6b7280;display:block;margin-bottom:4px;">สรุปการพิจารณา</label>
                    <input type="text" id="bonusNote_${rec.id}" value="${escHtml(rec.bonusNote||'')}" placeholder="สรุปเหตุผลการพิจารณา..." class="input-field" style="width:100%;">
                </div>
            </div>
            <div style="margin-top:12px;display:flex;justify-content:flex-end;">
                <button class="btn-primary" onclick="saveBonusRecord('${rec.id}')">💾 บันทึกการพิจารณา</button>
            </div>
        </div>
    </div>`;
}

function renderAttSummaryItem(label, value, color) {
    return `<div style="background:white;border-radius:8px;padding:8px 10px;text-align:center;border:1px solid #e0f2fe;">
        <div style="font-size:11px;color:#6b7280;margin-bottom:2px;">${label}</div>
        <div style="font-size:14px;font-weight:700;color:${color};">${value}</div>
    </div>`;
}

function renderBehaviorRow(log, recId) {
    return `<div id="blogRow_${log.id}" style="display:flex;align-items:flex-start;gap:6px;margin-bottom:6px;padding:6px 8px;background:white;border-radius:6px;font-size:12px;">
        <div style="flex:0 0 80px;color:#6b7280;">${log.date || ''}</div>
        <div style="flex:1;color:var(--text-primary);">${escHtml(log.description)}</div>
        <button onclick="deleteBehaviorLog('${log.id}','${recId}')" style="flex-shrink:0;background:none;border:none;cursor:pointer;color:#f87171;font-size:14px;padding:0 2px;" title="ลบ">✕</button>
    </div>`;
}

function showAddBehaviorForm(recId, type) {
    const formEl = document.getElementById(`behaviorForm_${recId}`);
    const typeLabel = type === 'good' ? 'พฤติกรรมดี' : 'พฤติกรรมที่ต้องปรับปรุง';
    const color = type === 'good' ? '#15803d' : '#c2410c';
    const today = new Date().toISOString().slice(0, 10);
    formEl.style.display = 'block';
    formEl.innerHTML = `
        <div style="margin-top:12px;padding:14px;background:${type==='good'?'#f0fdf4':'#fff7ed'};border:1px solid ${type==='good'?'#bbf7d0':'#fed7aa'};border-radius:10px;">
            <div style="font-size:13px;font-weight:600;color:${color};margin-bottom:10px;">+ เพิ่ม${typeLabel}</div>
            <div style="display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:center;">
                <div>
                    <label style="font-size:12px;color:#6b7280;display:block;margin-bottom:4px;">วันที่</label>
                    <input type="date" id="blogDate_${recId}" value="${today}" class="input-field" style="width:150px;">
                </div>
                <div>
                    <label style="font-size:12px;color:#6b7280;display:block;margin-bottom:4px;">รายละเอียด</label>
                    <input type="text" id="blogDesc_${recId}" placeholder="บันทึกรายละเอียด..." class="input-field" style="width:100%;">
                </div>
            </div>
            <div style="margin-top:10px;display:flex;gap:8px;justify-content:flex-end;">
                <button onclick="document.getElementById('behaviorForm_${recId}').style.display='none'" style="font-size:12px;padding:5px 14px;border:1px solid #d1d5db;background:white;color:#6b7280;border-radius:6px;cursor:pointer;">ยกเลิก</button>
                <button onclick="saveBehaviorLog('${recId}','${type}')" style="font-size:12px;padding:5px 14px;border:none;background:${type==='good'?'#16a34a':'#ea580c'};color:white;border-radius:6px;cursor:pointer;font-weight:600;">บันทึก</button>
            </div>
        </div>`;
    document.getElementById(`blogDesc_${recId}`).focus();
}

async function deleteBonusRecord(recId, empName) {
    if (!confirm(`ลบ "${empName}" ออกจากรายการโบนัสปี ${bonusYear}?\n(ข้อมูลพฤติกรรมและการพิจารณาจะถูกลบด้วย)`)) return;
    try {
        await api.deleteBonusRecord(recId);
        bonusRecords = bonusRecords.filter(r => r.id !== recId);
        renderBonusContent();
        showBonusToast('🗑️ ลบเรียบร้อยแล้ว');
    } catch (err) { alert('เกิดข้อผิดพลาด: ' + err.message); }
}

async function saveBehaviorLog(recId, type) {
    const date = document.getElementById(`blogDate_${recId}`).value;
    const desc = document.getElementById(`blogDesc_${recId}`).value.trim();
    if (!desc) { alert('กรุณากรอกรายละเอียด'); return; }
    try {
        const log = await api.addBehavior({ bonusRecordId: recId, type, date, description: desc });
        document.getElementById(`behaviorForm_${recId}`).style.display = 'none';
        const container = document.getElementById(`${type}Logs_${recId}`);
        const placeholder = container.querySelector('div[style*="italic"]');
        if (placeholder) placeholder.remove();
        container.insertAdjacentHTML('beforeend', renderBehaviorRow(log, recId));
        const rec = bonusRecords.find(r => r.id === recId);
        if (rec) {
            if (!rec.behaviorLogs) rec.behaviorLogs = [];
            rec.behaviorLogs.push(log);
        }
    } catch (err) { alert('เกิดข้อผิดพลาด: ' + err.message); }
}

async function deleteBehaviorLog(logId, recId) {
    if (!confirm('ลบรายการนี้?')) return;
    try {
        await api.deleteBehavior(logId);
        const row = document.getElementById(`blogRow_${logId}`);
        if (row) row.remove();
    } catch (err) { alert('เกิดข้อผิดพลาด: ' + err.message); }
}

async function loadBonusAttendance(recId, employeeId) {
    const btn = event.target;
    btn.disabled = true; btn.textContent = '⏳ กำลังดึงข้อมูล...';
    try {
        let workingDays = 0, holidays = 0, absent = 0;
        let late1Minutes = 0, late1Baht = 0, late2Minutes = 0, late2Baht = 0, totalDeduction = 0;
        for (let m = 1; m <= 12; m++) {
            try {
                const records = await api.getAttendance({ shopId: DEFAULT_SHOP_ID, month: m, year: bonusYear });
                const empRec = records.find(r => r.employeeId === employeeId);
                if (empRec) {
                    workingDays   += empRec.workingDays    || 0;
                    holidays      += empRec.holidays       || 0;
                    absent        += empRec.absent         || 0;
                    totalDeduction += empRec.totalDeduction || 0;
                    late1Baht     += empRec.totalLate1Baht || 0;
                    late2Baht     += empRec.totalLate2Baht || 0;
                    if (empRec.days) {
                        for (const d of empRec.days) {
                            late1Minutes += d.late1Minutes || 0;
                            late2Minutes += d.late2Minutes || 0;
                        }
                    }
                }
            } catch {}
        }
        const summary = { workingDays, holidays, absent, late1Minutes, late1Baht, late2Minutes, late2Baht, totalDeduction };
        await api.updateBonusRecord(recId, { attendanceSummary: summary });
        const rec = bonusRecords.find(r => r.id === recId);
        if (rec) rec.attendanceSummary = summary;
        renderBonusContent();
    } catch (err) { alert('เกิดข้อผิดพลาด: ' + err.message); }
    btn.disabled = false; btn.textContent = '📊 ดึงสรุปเวลาทำงาน';
}

async function saveBonusRecord(recId) {
    const amount = parseFloat(document.getElementById(`bonusAmt_${recId}`).value) || 0;
    const status  = document.getElementById(`bonusSt_${recId}`).value;
    const note = document.getElementById(`bonusNote_${recId}`).value.trim();
    try {
        await api.updateBonusRecord(recId, { bonusAmount: amount, bonusStatus: status, bonusNote: note });
        const rec = bonusRecords.find(r => r.id === recId);
        if (rec) { rec.bonusAmount = amount; rec.bonusStatus = status; rec.bonusNote = note; }
        renderBonusContent();
        setTimeout(() => { const el = document.getElementById(`bonusCard_${recId}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
        showBonusToast('✅ บันทึกสำเร็จ!');
    } catch (err) { alert('เกิดข้อผิดพลาด: ' + err.message); }
}

function showBonusSummaryReport() {
    if (bonusRecords.length === 0) { alert('ไม่มีข้อมูลโบนัส — กรุณาโหลดข้อมูลก่อน'); return; }

    const statusMap = { pending: '🟡 รอพิจารณา', approved: '🟢 อนุมัติแล้ว', rejected: '🔴 ไม่อนุมัติ' };
    const approved  = bonusRecords.filter(r => r.bonusStatus === 'approved');
    const pending   = bonusRecords.filter(r => r.bonusStatus === 'pending');
    const rejected  = bonusRecords.filter(r => r.bonusStatus === 'rejected');
    const totalBudget = approved.reduce((s, r) => s + (parseFloat(r.bonusAmount) || 0), 0);

    const sorted = [...bonusRecords].sort((a, b) => (parseFloat(b.bonusAmount)||0) - (parseFloat(a.bonusAmount)||0));

    const rows = sorted.map((r, i) => {
        const amt = parseFloat(r.bonusAmount) || 0;
        const att = r.attendanceSummary;
        const stLabel = statusMap[r.bonusStatus] || '🟡 รอพิจารณา';
        const rowBg = r.bonusStatus === 'approved' ? '#f0fdf4' : r.bonusStatus === 'rejected' ? '#fff1f2' : '';
        return `<tr style="background:${rowBg};">
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:600;color:#6b7280;">${i+1}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">
                <div style="font-weight:600;color:#111827;">${escHtml(r.empName)}</div>
                <div style="font-size:11px;color:#9ca3af;">รหัส ${escHtml(r.empCode)}</div>
            </td>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${att ? att.workingDays+' วัน' : '-'}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;color:${att&&att.absent>0?'#ef4444':'#10b981'};font-weight:600;">${att ? att.absent+' วัน' : '-'}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;color:${att&&att.totalDeduction>0?'#f59e0b':'#10b981'};">${att ? att.totalDeduction.toLocaleString()+'฿' : '-'}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${stLabel}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:700;font-size:15px;color:${amt>0?'#059669':'#6b7280'};">${amt > 0 ? amt.toLocaleString()+' ฿' : '-'}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;">${escHtml(r.bonusNote||'-')}</td>
        </tr>`;
    }).join('');

    const modal = document.createElement('div');
    modal.id = 'bonusReportModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9998;display:flex;align-items:flex-start;justify-content:center;padding:24px;overflow-y:auto;';
    modal.innerHTML = `
        <div style="background:white;border-radius:16px;width:100%;max-width:900px;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
            <div style="padding:20px 24px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;">
                <div>
                    <h2 style="font-size:20px;font-weight:700;color:#111827;margin:0;">📋 รายงานสรุปโบนัสประจำปี ${bonusYear}</h2>
                    <p style="font-size:13px;color:#6b7280;margin:4px 0 0;">สรุปภาพรวมการพิจารณาโบนัสพนักงานทั้งหมด</p>
                </div>
                <button onclick="document.getElementById('bonusReportModal').remove()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#6b7280;padding:4px 8px;">✕</button>
            </div>
            <!-- Stats Row -->
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:#e5e7eb;">
                <div style="background:#f0fdf4;padding:16px 20px;text-align:center;">
                    <div style="font-size:24px;font-weight:700;color:#059669;">${approved.length}</div>
                    <div style="font-size:12px;color:#6b7280;margin-top:2px;">🟢 อนุมัติแล้ว</div>
                </div>
                <div style="background:#fffbeb;padding:16px 20px;text-align:center;">
                    <div style="font-size:24px;font-weight:700;color:#d97706;">${pending.length}</div>
                    <div style="font-size:12px;color:#6b7280;margin-top:2px;">🟡 รอพิจารณา</div>
                </div>
                <div style="background:#fff1f2;padding:16px 20px;text-align:center;">
                    <div style="font-size:24px;font-weight:700;color:#dc2626;">${rejected.length}</div>
                    <div style="font-size:12px;color:#6b7280;margin-top:2px;">🔴 ไม่อนุมัติ</div>
                </div>
                <div style="background:#f5f3ff;padding:16px 20px;text-align:center;">
                    <div style="font-size:22px;font-weight:700;color:#7c3aed;">${totalBudget.toLocaleString()} ฿</div>
                    <div style="font-size:12px;color:#6b7280;margin-top:2px;">💰 งบรวมทั้งหมด</div>
                </div>
            </div>
            <!-- Table -->
            <div style="padding:16px 24px;overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                    <thead>
                        <tr style="background:#f9fafb;">
                            <th style="padding:10px 12px;text-align:center;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb;">#</th>
                            <th style="padding:10px 12px;text-align:left;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb;">ชื่อพนักงาน</th>
                            <th style="padding:10px 12px;text-align:center;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb;">วันทำงาน</th>
                            <th style="padding:10px 12px;text-align:center;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb;">ขาดงาน</th>
                            <th style="padding:10px 12px;text-align:center;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb;">หักรวม</th>
                            <th style="padding:10px 12px;text-align:center;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb;">สถานะ</th>
                            <th style="padding:10px 12px;text-align:right;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb;">โบนัส (บาท)</th>
                            <th style="padding:10px 12px;text-align:left;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb;">หมายเหตุ</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                    <tfoot>
                        <tr style="background:#f5f3ff;">
                            <td colspan="6" style="padding:12px;font-weight:700;color:#7c3aed;border-top:2px solid #e5e7eb;">💰 รวมงบโบนัสที่อนุมัติ</td>
                            <td style="padding:12px;text-align:right;font-weight:700;font-size:16px;color:#7c3aed;border-top:2px solid #e5e7eb;">${totalBudget.toLocaleString()} ฿</td>
                            <td style="border-top:2px solid #e5e7eb;"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <div style="padding:12px 24px 20px;display:flex;justify-content:flex-end;gap:8px;">
                <button onclick="printBonusReport()" style="padding:8px 18px;border:1px solid #7c3aed;background:#f5f3ff;color:#7c3aed;border-radius:8px;cursor:pointer;font-weight:600;">🖨️ พิมพ์รายงาน</button>
                <button onclick="document.getElementById('bonusReportModal').remove()" style="padding:8px 18px;border:1px solid #d1d5db;background:white;color:#374151;border-radius:8px;cursor:pointer;">ปิด</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

function printBonusReport() {
    const modal = document.getElementById('bonusReportModal');
    if (!modal) return;
    const content = modal.querySelector('div');
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>รายงานโบนัสประจำปี ${bonusYear}</title>
    <style>body{font-family:'Sarabun',sans-serif;padding:20px;}table{width:100%;border-collapse:collapse;font-size:13px;}th,td{padding:8px 10px;border:1px solid #ccc;}th{background:#f3f4f6;font-weight:600;}tr:nth-child(even){background:#f9fafb;}.no-print{display:none;}@media print{.no-print{display:none;}}</style>
    </head><body>${content.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
}

function showBonusToast(msg) {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#1e3a5f;color:white;padding:12px 20px;border-radius:10px;font-size:14px;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.2);';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
}

async function uploadBonusPhoto(recId, input) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('ไฟล์ใหญ่เกิน 2MB กรุณาเลือกรูปขนาดเล็กกว่า'); return; }
    const reader = new FileReader();
    reader.onload = async (e) => {
        const original = e.target.result;
        const base64 = await resizeImageBase64(original, 300, 300);
        try {
            await api.updateBonusRecord(recId, { photo: base64 });
            const wrap = document.getElementById(`photoWrap_${recId}`);
            if (wrap) wrap.innerHTML = `<img src="${base64}" style="width:100%;height:100%;object-fit:cover;">`;
            showBonusToast('✅ อัปโหลดรูปสำเร็จ!');
        } catch (err) { alert('เกิดข้อผิดพลาด: ' + err.message); }
    };
    reader.readAsDataURL(file);
}

function minutesToTime(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}:${m.toString().padStart(2, '0')}`;
}
