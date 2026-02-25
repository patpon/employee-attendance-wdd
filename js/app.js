// ============================================
// Main Application - SPA Router & Page Renderers
// ============================================

// ===== Dark Mode =====
function initDarkMode() {
    const saved = localStorage.getItem('darkMode');
    if (saved === 'true') {
        document.body.classList.add('dark');
        updateDarkToggleUI(true);
    }
}
function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('darkMode', isDark);
    updateDarkToggleUI(isDark);
}
function updateDarkToggleUI(isDark) {
    const icon = document.getElementById('darkToggleIcon');
    const label = document.getElementById('darkToggleLabel');
    if (icon) icon.textContent = isDark ? '☀️' : '🌙';
    if (label) label.textContent = isDark ? 'โหมดสว่าง' : 'โหมดมืด';
}

let currentPage = 'dashboard';

// Default shop (single shop mode)
const DEFAULT_SHOP_ID = 'default';
let DEFAULT_SHOP_NAME = 'ร้านค้า';

// Current user info
let currentUser = { username: '', displayName: '', role: 'viewer' };

// Role-based menu permissions
const ROLE_PERMISSIONS = {
    admin:    ['dashboard', 'import', 'attendance', 'reports', 'settings'],
    importer: ['import'],
};

function canAccess(page) {
    const perms = ROLE_PERMISSIONS[currentUser.role] || [];
    return perms.includes(page);
}

function applyRoleToSidebar() {
    document.querySelectorAll('.nav-item[data-page]').forEach(el => {
        const page = el.dataset.page;
        el.style.display = canAccess(page) ? '' : 'none';
    });
    // Show user info in sidebar
    const userInfoEl = document.getElementById('sidebarUserInfo');
    if (userInfoEl) {
        const roleLabels = { admin: 'ผู้ดูแลระบบ', importer: 'ผู้นำเข้าข้อมูล' };
        const roleColors = { admin: '#ef4444', importer: '#2563eb' };
        userInfoEl.innerHTML = `
            <div style="padding:12px 16px;border-top:1px solid rgba(255,255,255,0.1);font-size:12px;color:rgba(255,255,255,0.7);">
                <p style="font-weight:600;color:white;font-size:13px;">${escHtml(currentUser.displayName || currentUser.username)}</p>
                <span style="display:inline-block;margin-top:4px;padding:2px 8px;border-radius:8px;font-size:10px;font-weight:600;color:white;background:${roleColors[currentUser.role] || '#6b7280'};">${roleLabels[currentUser.role] || currentUser.role}</span>
            </div>`;
    }
}

// Check auth on load
(async function checkAuth() {
    initDarkMode();
    try {
        const res = await fetch('api/auth.php?action=check');
        const data = await res.json();
        if (!data.authenticated) {
            window.location.href = 'login.html';
            return;
        }
        currentUser = {
            username: data.username || '',
            displayName: data.displayName || '',
            role: data.role || 'viewer',
        };
    } catch {
        window.location.href = 'login.html';
        return;
    }
    // Load shop name and public holidays from DB
    try {
        const shop = await api.getShop(DEFAULT_SHOP_ID);
        if (shop && shop.name) DEFAULT_SHOP_NAME = shop.name;
        if (shop && Array.isArray(shop.publicHolidays)) PUBLIC_HOLIDAYS = shop.publicHolidays;
    } catch {}
    applyRoleToSidebar();
    navigateTo('dashboard');
})();

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('active');
}

function navigateTo(page) {
    // Role guard: redirect to first allowed page if no access
    if (!canAccess(page)) {
        const perms = ROLE_PERMISSIONS[currentUser.role] || [];
        page = perms[0] || 'dashboard';
    }
    currentPage = page;
    // Update nav
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.page === page);
    });
    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('active');
    // Render page
    renderPage(page);
}

async function handleLogout() {
    await fetch('api/auth.php?action=logout', { method: 'POST' });
    window.location.href = 'login.html';
}

function renderPage(page) {
    const main = document.getElementById('mainContent');
    switch (page) {
        case 'dashboard': renderDashboard(main); break;
        case 'import': renderImport(main); break;
        case 'attendance': renderAttendance(main); break;
        case 'reports': renderReports(main); break;
        case 'settings': renderSettings(main); break;
        default: main.innerHTML = '<p>Page not found</p>';
    }
}

// ============================================
// DASHBOARD
// ============================================
async function renderDashboard(container) {
    container.innerHTML = `
        <div style="max-width:1100px;margin:0 auto;">
            <div class="mb-8">
                <h1 class="text-3xl font-bold text-gray-800">แดชบอร์ด</h1>
                <p class="text-gray-500 mt-1">ภาพรวมระบบจัดการลงเวลาพนักงาน</p>
            </div>
            <div class="grid-3 mb-8" id="dashStats">
                <div class="card stat-card" onclick="navigateTo('import')">
                    <div class="flex items-center justify-between mb-4">
                        <div class="stat-icon bg-emerald-500">&#128101;</div>
                        <span class="text-gray-300" style="font-size:20px;">&#8594;</span>
                    </div>
                    <p class="text-3xl font-bold text-gray-800" id="statEmployees">0</p>
                    <p class="text-sm text-gray-500 mt-1">พนักงาน</p>
                </div>
                <div class="card stat-card" onclick="navigateTo('attendance')">
                    <div class="flex items-center justify-between mb-4">
                        <div class="stat-icon bg-amber-500">&#128197;</div>
                        <span class="text-gray-300" style="font-size:20px;">&#8594;</span>
                    </div>
                    <p class="text-3xl font-bold text-gray-800" id="statAttendance">0</p>
                    <p class="text-sm text-gray-500 mt-1">ข้อมูลเวลา</p>
                </div>
                <div class="card stat-card" onclick="navigateTo('import')">
                    <div class="flex items-center justify-between mb-4">
                        <div class="stat-icon bg-purple-500">&#128228;</div>
                        <span class="text-gray-300" style="font-size:20px;">&#8594;</span>
                    </div>
                    <p class="text-3xl font-bold text-gray-800" id="statImports">0</p>
                    <p class="text-sm text-gray-500 mt-1">การนำเข้า</p>
                </div>
            </div>
            <div class="grid-2">
                <div class="card">
                    <h2 class="text-lg font-semibold text-gray-800 mb-4">เริ่มต้นใช้งาน</h2>
                    <div class="space-y-3">
                        <a onclick="navigateTo('import')" class="flex items-center gap-3 p-3 rounded-lg" style="cursor:pointer;transition:background 0.2s;" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background=''">
                            <div style="width:32px;height:32px;background:#dbeafe;color:#1d4ed8;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0;">1</div>
                            <div><p class="font-medium text-gray-800">นำเข้าข้อมูล Excel</p><p class="text-sm text-gray-500">อัพโหลดไฟล์ข้อมูลการสแกนเวลา (พนักงานจะถูกสร้างอัตโนมัติ)</p></div>
                        </a>
                        <a onclick="navigateTo('attendance')" class="flex items-center gap-3 p-3 rounded-lg" style="cursor:pointer;transition:background 0.2s;" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background=''">
                            <div style="width:32px;height:32px;background:#dbeafe;color:#1d4ed8;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0;">2</div>
                            <div><p class="font-medium text-gray-800">ดูตารางเวลา</p><p class="text-sm text-gray-500">ตรวจสอบและแก้ไขข้อมูลเวลาทำงาน</p></div>
                        </a>
                        <a onclick="navigateTo('reports')" class="flex items-center gap-3 p-3 rounded-lg" style="cursor:pointer;transition:background 0.2s;" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background=''">
                            <div style="width:32px;height:32px;background:#dbeafe;color:#1d4ed8;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0;">3</div>
                            <div><p class="font-medium text-gray-800">ออกรายงาน PDF</p><p class="text-sm text-gray-500">สร้างรายงานและส่งออกเป็น PDF</p></div>
                        </a>
                    </div>
                </div>
                <div class="card">
                    <h2 class="text-lg font-semibold text-gray-800 mb-4">คุณสมบัติระบบ</h2>
                    <div class="space-y-3">
                        <div class="flex items-center gap-3 p-3">
                            <div style="width:32px;height:32px;background:#d1fae5;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">&#128228;</div>
                            <div><p class="font-medium text-gray-800">นำเข้า Excel</p><p class="text-sm text-gray-500">รองรับไฟล์ .xlsx/.xls จากเครื่องสแกน</p></div>
                        </div>
                        <div class="flex items-center gap-3 p-3">
                            <div style="width:32px;height:32px;background:#d1fae5;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">&#128197;</div>
                            <div><p class="font-medium text-gray-800">จัดกะอัตโนมัติ</p><p class="text-sm text-gray-500">แยก 4 กะ/วัน ตามการตั้งค่าแต่ละคน</p></div>
                        </div>
                        <div class="flex items-center gap-3 p-3">
                            <div style="width:32px;height:32px;background:#d1fae5;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">&#128101;</div>
                            <div><p class="font-medium text-gray-800">สร้างพนักงานอัตโนมัติ</p><p class="text-sm text-gray-500">รายชื่อพนักงานถูกสร้างจากไฟล์ Excel ที่นำเข้า</p></div>
                        </div>
                        <div class="flex items-center gap-3 p-3">
                            <div style="width:32px;height:32px;background:#d1fae5;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">&#128196;</div>
                            <div><p class="font-medium text-gray-800">รายงาน PDF</p><p class="text-sm text-gray-500">ออกรายงานรายบุคคล พร้อมปริ้น</p></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Load stats
    try {
        const [employees, attendance, imports] = await Promise.all([
            api.getEmployees(), api.getAttendance({}), api.getImportSessions(),
        ]);
        document.getElementById('statEmployees').textContent = employees.length;
        document.getElementById('statAttendance').textContent = attendance.length;
        document.getElementById('statImports').textContent = imports.length;
    } catch {}
}

// ============================================
// IMPORT
// ============================================
let importParsedData = null;
let importDedupedScans = [];
let importFileName = '';

async function renderImport(container) {
    const now = new Date();
    container.innerHTML = `
        <div style="max-width:800px;margin:0 auto;">
            <div class="mb-6">
                <h1 class="text-2xl font-bold text-gray-800">นำเข้าข้อมูล</h1>
                <p class="text-gray-500 text-sm mt-1">อัพโหลดไฟล์ Excel จากเครื่องสแกนเวลา (พนักงานจะถูกสร้างอัตโนมัติ)</p>
            </div>
            <div class="card mb-6">
                <h3 class="text-sm font-semibold text-gray-700 mb-3">ตั้งค่าการนำเข้า</h3>
                <div class="grid-2">
                    <div><label class="text-sm text-gray-600" style="display:block;margin-bottom:4px;">เดือน</label>
                        <select id="importMonth" class="input-field">
                            ${THAI_MONTHS.map((m, i) => `<option value="${i + 1}" ${i + 1 === now.getMonth() + 1 ? 'selected' : ''}>${m}</option>`).join('')}
                        </select>
                    </div>
                    <div><label class="text-sm text-gray-600" style="display:block;margin-bottom:4px;">ปี (ค.ศ.)</label>
                        <input type="number" id="importYear" class="input-field" value="${now.getFullYear()}" min="2020" max="2030">
                    </div>
                </div>
            </div>
            <div class="upload-area mb-6" id="uploadArea" ondragover="event.preventDefault();this.classList.add('dragover')" ondragleave="this.classList.remove('dragover')" ondrop="handleImportDrop(event)">
                <div style="font-size:48px;color:#d1d5db;margin-bottom:16px;">&#128228;</div>
                <p class="text-gray-600 mb-2">ลากไฟล์ Excel มาวางที่นี่ หรือ</p>
                <label class="btn-primary" style="cursor:pointer;">เลือกไฟล์
                    <input type="file" accept=".xlsx,.xls,.csv" onchange="handleImportFile(this.files[0])" style="display:none;">
                </label>
                <p class="text-xs text-gray-400" style="margin-top:12px;">รองรับ .xlsx, .xls, .csv</p>
                <div id="importFileName" class="hidden" style="margin-top:16px;font-size:14px;color:#4b5563;"></div>
            </div>
            <div id="importStatus" class="hidden mb-6"></div>
            <div id="importPreview" class="hidden mb-6"></div>
        </div>
    `;
    importParsedData = null;
    importDedupedScans = [];
}

function handleImportDrop(e) {
    e.preventDefault();
    document.getElementById('uploadArea').classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) handleImportFile(file);
}

function handleImportFile(file) {
    if (!file) return;
    importFileName = file.name;
    document.getElementById('importFileName').textContent = '📊 ' + file.name;
    document.getElementById('importFileName').classList.remove('hidden');
    document.getElementById('importStatus').classList.add('hidden');
    document.getElementById('importPreview').classList.add('hidden');

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = parseExcelFile(e.target.result);
            const deduped = deduplicateScans(data.scans);
            importParsedData = data;
            importDedupedScans = deduped;
            showImportStatus('info', `พบ ${data.employees.length} พนักงาน, ${data.scans.length} รายการ (หลัง dedup: ${deduped.length})`);
            showImportPreview();
            // Auto-process after showing preview
            setTimeout(() => processImport(), 300);
        } catch (err) {
            showImportStatus('error', 'ไม่สามารถอ่านไฟล์ได้: ' + err.message);
        }
    };
    reader.readAsArrayBuffer(file);
}

function showImportStatus(type, message) {
    const el = document.getElementById('importStatus');
    const cls = type === 'error' ? 'alert-error' : type === 'success' ? 'alert-success' : 'alert-info';
    el.className = `alert ${cls} mb-6`;
    el.innerHTML = message;
    el.classList.remove('hidden');
}

async function showImportPreview() {
    if (!importParsedData) return;
    let currentEmployees = [];
    try { currentEmployees = await api.getEmployees(); } catch {}

    const el = document.getElementById('importPreview');
    el.classList.remove('hidden');
    el.innerHTML = `
        <div class="card">
            <h3 class="text-sm font-semibold text-gray-700 mb-3">ข้อมูลที่พบในไฟล์</h3>
            <div class="overflow-x-auto">
                <table style="font-size:14px;">
                    <thead><tr style="background:#f9fafb;"><th style="padding:8px 12px;text-align:left;">รหัส</th><th style="padding:8px 12px;text-align:left;">ชื่อ</th><th style="padding:8px 12px;text-align:center;">จำนวน scan</th><th style="padding:8px 12px;text-align:center;">สถานะ</th></tr></thead>
                    <tbody>
                        ${importParsedData.employees.map(emp => {
                            const scanCount = importDedupedScans.filter(s => s.empCode === emp.code).length;
                            const existing = currentEmployees.find(e => e.empCode === emp.code && e.shopId === DEFAULT_SHOP_ID);
                            return `<tr style="border-top:1px solid #f3f4f6;">
                                <td style="padding:8px 12px;" class="font-mono">${escHtml(emp.code)}</td>
                                <td style="padding:8px 12px;">${escHtml(emp.name)}</td>
                                <td style="padding:8px 12px;text-align:center;">${scanCount}</td>
                                <td style="padding:8px 12px;text-align:center;">${existing ? '<span class="badge badge-green">มีในระบบ</span>' : '<span class="badge badge-amber">จะสร้างใหม่</span>'}</td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            <div style="margin-top:16px;display:flex;justify-content:flex-end;">
                <button class="btn-success" onclick="processImport()" id="processImportBtn">&#10004; นำเข้าและประมวลผล</button>
            </div>
        </div>
    `;
}

async function processImport() {
    const shopId = DEFAULT_SHOP_ID;
    const shopName = DEFAULT_SHOP_NAME;
    const month = parseInt(document.getElementById('importMonth').value);
    const year = parseInt(document.getElementById('importYear').value);
    if (!importParsedData) return;

    const btn = document.getElementById('processImportBtn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> กำลังประมวลผล...';

    try {
        let currentEmployees = await api.getEmployees();
        let newEmployeeCount = 0;

        // Auto-create employees from Excel
        for (const emp of importParsedData.employees) {
            const existing = currentEmployees.find(e => e.empCode === emp.code && e.shopId === shopId);
            if (!existing) {
                await api.createEmployee({ empCode: emp.code, name: emp.name, shopId, shiftConfig: { ...DEFAULT_SHIFT_CONFIG }, holidays: {} });
                newEmployeeCount++;
            }
        }

        currentEmployees = await api.getEmployees();

        // Save new scans to DB (INSERT IGNORE = no duplicates)
        const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
        const newMonthScans = importDedupedScans.filter(s => s.date.startsWith(monthStr));
        if (newMonthScans.length > 0) {
            await api.saveScans({ shopId, month, year, scans: newMonthScans });
        }

        // Load ALL scans for this month from DB (merged from all imports)
        const allScans = await api.getScans({ shopId, month, year });

        // Group merged scans by employee
        const scansByEmp = new Map();
        for (const scan of allScans) {
            if (!scansByEmp.has(scan.empCode)) scansByEmp.set(scan.empCode, []);
            scansByEmp.get(scan.empCode).push(scan);
        }

        // Load existing attendance to preserve HR edits (waive flags, notes, manual scan3)
        let existingAttList = [];
        try { existingAttList = await api.getAttendance({ shopId, month, year }); } catch {}
        const existingAttByEmp = new Map(existingAttList.map(a => [a.empCode, a]));

        // Process each employee using ALL merged scans
        let processedCount = 0;
        for (const [empCode, empScans] of scansByEmp) {
            const employee = currentEmployees.find(e => e.empCode === empCode && e.shopId === shopId);
            if (!employee) continue;

            if (empScans.length === 0) continue;

            const attendance = processEmployeeAttendanceWDD(employee, empScans, shopName, month, year);

            // Merge HR overrides: preserve manual scan3, waive flags, notes
            const oldAtt = existingAttByEmp.get(empCode);
            if (oldAtt && oldAtt.days) {
                const oldDaysByDate = new Map(oldAtt.days.map(d => [d.date, d]));
                for (const day of attendance.days) {
                    const oldDay = oldDaysByDate.get(day.date);
                    if (!oldDay || oldDay.isHoliday) continue;
                    if (!day.scan3 && oldDay.scan3) {
                        day.scan3 = oldDay.scan3;
                        const baseConfig = employee.shiftConfig;
                        const deductRate = (baseConfig && baseConfig.deductionPerMinute) || 1;
                        const firstForConfig = (day.scan1 && timeToMinutes(day.scan1) >= 180) ? day.scan1 : null;
                        const wddConfig = getWddDayConfig(employee.name, day.date, firstForConfig);
                        const config = wddConfig || baseConfig;
                        if (day.scan2 && config.breakOutFixed && config.breakInDeadline) {
                            const fixedOutMin = timeToMinutes(config.breakOutFixed);
                            const actualOutMin = timeToMinutes(day.scan2);
                            const baseDeadlineMin = timeToMinutes(config.breakInDeadline);
                            let deadlineMin = baseDeadlineMin;
                            if (actualOutMin > fixedOutMin) deadlineMin = baseDeadlineMin + (actualOutMin - fixedOutMin);
                            const dh = Math.floor(deadlineMin / 60), dm = deadlineMin % 60;
                            const breakDL = `${dh.toString().padStart(2,'0')}:${dm.toString().padStart(2,'0')}`;
                            const late2 = calculateLateness(day.scan3, breakDL, deductRate);
                            day.late2Minutes = late2.minutes;
                            day.late2Baht = late2.baht;
                        }
                    }
                    if (oldDay.waiveLate1 !== undefined) day.waiveLate1 = oldDay.waiveLate1;
                    if (oldDay.waiveLate2 !== undefined) day.waiveLate2 = oldDay.waiveLate2;
                    if (oldDay.note) day.note = oldDay.note;
                }
                let t1 = 0, t2 = 0;
                for (const d of attendance.days) {
                    if (!d.waiveLate1) t1 += (d.late1Baht || 0);
                    if (!d.waiveLate2) t2 += (d.late2Baht || 0);
                }
                attendance.totalLate1Baht = t1;
                attendance.totalLate2Baht = t2;
                attendance.totalDeduction = t1 + t2;
            }

            await api.saveAttendance(attendance);
            processedCount++;
        }

        // Save import session
        await api.createImportSession({ shopId, month, year, fileName: importFileName, recordCount: importDedupedScans.length });

        const mergeNote = allScans.length > newMonthScans.length
            ? ` (รวม scan เดิม ${allScans.length - newMonthScans.length} + ใหม่ ${newMonthScans.length} = ทั้งหมด ${allScans.length} รายการ)`
            : '';
        showImportStatus('success', `สำเร็จ! ประมวลผล ${processedCount} พนักงาน` + (newEmployeeCount > 0 ? ` (สร้างใหม่ ${newEmployeeCount} คน)` : '') + mergeNote);
        document.getElementById('importPreview').classList.add('hidden');
    } catch (err) {
        showImportStatus('error', 'เกิดข้อผิดพลาด: ' + err.message);
    }
    btn.disabled = false;
    btn.innerHTML = '&#10004; ประมวลผลและบันทึก';
}

// ============================================
// ATTENDANCE
// ============================================
let attendanceRecords = [];
let expandedAttId = null;
let attSortOrder = 'asc'; // 'asc' or 'desc'
let attSearchQuery = '';

async function renderAttendance(container) {
    const now = new Date();
    container.innerHTML = `
        <div style="max-width:1200px;margin:0 auto;">
            <div class="mb-6">
                <h1 class="text-2xl font-bold text-gray-800">ตารางเวลา</h1>
                <p class="text-gray-500 text-sm mt-1">ดูและแก้ไขข้อมูลเวลาทำงานรายเดือน</p>
            </div>
            <div class="card mb-6">
                <div class="grid-2">
                    <div><label class="text-sm text-gray-600" style="display:block;margin-bottom:4px;">เดือน</label>
                        <select id="attMonth" class="input-field" onchange="loadAttendance()">
                            ${THAI_MONTHS.map((m, i) => `<option value="${i + 1}" ${i + 1 === now.getMonth() + 1 ? 'selected' : ''}>${m}</option>`).join('')}
                        </select>
                    </div>
                    <div><label class="text-sm text-gray-600" style="display:block;margin-bottom:4px;">ปี (ค.ศ.)</label>
                        <input type="number" id="attYear" class="input-field" value="${now.getFullYear()}" min="2020" max="2030" onchange="loadAttendance()">
                    </div>
                </div>
            </div>
            <div class="card mb-4">
                <div class="flex items-center gap-3 flex-wrap">
                    <div style="flex:1;min-width:200px;">
                        <input type="text" id="attSearch" class="input-field" placeholder="&#128269; ค้นหาชื่อหรือรหัสพนักงาน..." oninput="attSearchQuery=this.value;renderAttList()">
                    </div>
                    <div class="flex gap-2">
                        <button id="btnSortAsc" class="btn-secondary" onclick="setAttSort('asc')" style="font-size:13px;padding:6px 12px;">&#9650; น้อย→มาก</button>
                        <button id="btnSortDesc" class="btn-secondary" onclick="setAttSort('desc')" style="font-size:13px;padding:6px 12px;">&#9660; มาก→น้อย</button>
                        <button class="btn-success" onclick="reprocessAttendance()" style="font-size:13px;padding:6px 12px;">&#128260; ประมวลผลใหม่</button>
                        <button class="btn-danger" onclick="resetMonthData()" style="font-size:13px;padding:6px 12px;">&#128465; รีเซ็ตเดือนนี้</button>
                    </div>
                </div>
            </div>
            <div id="attList"></div>
        </div>
    `;
    attendanceRecords = [];
    expandedAttId = null;
    attSearchQuery = '';
    loadAttendance();
}

async function loadAttendance() {
    const month = parseInt(document.getElementById('attMonth').value);
    const year = parseInt(document.getElementById('attYear').value);
    try {
        attendanceRecords = await api.getAttendance({ shopId: DEFAULT_SHOP_ID, month, year });
    } catch { attendanceRecords = []; }
    expandedAttId = null;
    renderAttList();
}

function setAttSort(order) {
    attSortOrder = order;
    renderAttList();
}

async function reprocessAttendance() {
    const month = parseInt(document.getElementById('attMonth').value);
    const year = parseInt(document.getElementById('attYear').value);
    const shopId = DEFAULT_SHOP_ID;
    const shopName = DEFAULT_SHOP_NAME;

    if (!confirm('ต้องการประมวลผลข้อมูลใหม่ทั้งหมดหรือไม่?\n\n(ระบบจะดึง scan จาก DB แล้วคำนวณใหม่ทั้งเดือน)')) return;

    // Show loading popup
    const overlay = document.createElement('div');
    overlay.id = 'reprocessOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
    overlay.innerHTML = `<div style="background:white;border-radius:16px;padding:32px 48px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
        <div style="font-size:48px;margin-bottom:12px;animation:spin 1s linear infinite;">&#9881;</div>
        <p style="font-size:18px;font-weight:600;color:#1e3a5f;margin-bottom:8px;">กำลังประมวลผลใหม่...</p>
        <p id="reprocessStatus" style="font-size:14px;color:#6b7280;">กำลังโหลดข้อมูล scan</p>
        <style>@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}</style>
    </div>`;
    document.body.appendChild(overlay);
    const statusEl = document.getElementById('reprocessStatus');

    try {
        statusEl.textContent = 'กำลังโหลดข้อมูล scan...';
        const allScans = await api.getScans({ shopId, month, year });
        if (allScans.length === 0) {
            overlay.remove();
            alert('ไม่พบข้อมูล scan ในเดือนนี้\nกรุณานำเข้าข้อมูลใหม่');
            return;
        }

        statusEl.textContent = 'กำลังโหลดข้อมูลพนักงาน...';
        const employees = await api.getEmployees();

        const scansByEmp = new Map();
        for (const scan of allScans) {
            if (!scansByEmp.has(scan.empCode)) scansByEmp.set(scan.empCode, []);
            scansByEmp.get(scan.empCode).push(scan);
        }

        // Load existing attendance to preserve HR edits
        statusEl.textContent = 'กำลังโหลดข้อมูลเดิม (preserve การแก้ไข HR)...';
        let existingAttList = [];
        try { existingAttList = await api.getAttendance({ shopId, month, year }); } catch {}
        const existingAttByEmp = new Map(existingAttList.map(a => [a.empCode, a]));

        let processedCount = 0;
        const totalEmp = scansByEmp.size;
        for (const [empCode, empScans] of scansByEmp) {
            const employee = employees.find(e => e.empCode === empCode && e.shopId === shopId);
            if (!employee) continue;
            processedCount++;
            statusEl.textContent = `กำลังประมวลผล ${processedCount}/${totalEmp} คน...`;
            const attendance = processEmployeeAttendanceWDD(employee, empScans, shopName, month, year);

            // Merge HR overrides: preserve scan values that HR manually entered
            // (i.e. values that differ from raw scan assignment, like scan3 typed in manually)
            const oldAtt = existingAttByEmp.get(empCode);
            if (oldAtt && oldAtt.days) {
                const oldDaysByDate = new Map(oldAtt.days.map(d => [d.date, d]));
                for (const day of attendance.days) {
                    const oldDay = oldDaysByDate.get(day.date);
                    if (!oldDay || oldDay.isHoliday) continue;
                    // Preserve scan3 if HR entered it manually (new result has no scan3 but old has one)
                    if (!day.scan3 && oldDay.scan3) {
                        day.scan3 = oldDay.scan3;
                        // Recalculate breakDeadline label and late2 with the preserved scan3
                        const baseConfig = employee.shiftConfig;
                        const deductRate = (baseConfig && baseConfig.deductionPerMinute) || 1;
                        const firstForConfig = (day.scan1 && timeToMinutes(day.scan1) >= 180) ? day.scan1 : null;
                        const wddConfig = getWddDayConfig(employee.name, day.date, firstForConfig);
                        const config = wddConfig || baseConfig;
                        if (day.scan2 && config.breakOutFixed && config.breakInDeadline) {
                            const fixedOutMin = timeToMinutes(config.breakOutFixed);
                            const actualOutMin = timeToMinutes(day.scan2);
                            const baseDeadlineMin = timeToMinutes(config.breakInDeadline);
                            let deadlineMin = baseDeadlineMin;
                            if (actualOutMin > fixedOutMin) deadlineMin = baseDeadlineMin + (actualOutMin - fixedOutMin);
                            const dh = Math.floor(deadlineMin / 60), dm = deadlineMin % 60;
                            const breakDL = `${dh.toString().padStart(2,'0')}:${dm.toString().padStart(2,'0')}`;
                            const late2 = calculateLateness(day.scan3, breakDL, deductRate);
                            day.late2Minutes = late2.minutes;
                            day.late2Baht = late2.baht;
                            attendance.totalLate2Baht = (attendance.totalLate2Baht || 0) + late2.baht;
                            attendance.totalDeduction = (attendance.totalLate1Baht || 0) + attendance.totalLate2Baht;
                        }
                    }
                    // Preserve waive flags and notes
                    if (oldDay.waiveLate1 !== undefined) day.waiveLate1 = oldDay.waiveLate1;
                    if (oldDay.waiveLate2 !== undefined) day.waiveLate2 = oldDay.waiveLate2;
                    if (oldDay.note) day.note = oldDay.note;
                }
                // Recalc totals after merge
                let t1 = 0, t2 = 0;
                for (const d of attendance.days) {
                    if (!d.waiveLate1) t1 += (d.late1Baht || 0);
                    if (!d.waiveLate2) t2 += (d.late2Baht || 0);
                }
                attendance.totalLate1Baht = t1;
                attendance.totalLate2Baht = t2;
                attendance.totalDeduction = t1 + t2;
            }

            await api.saveAttendance(attendance);
        }

        overlay.remove();
        alert(`ประมวลผลใหม่สำเร็จ! ${processedCount} พนักงาน (${allScans.length} scan)`);
        loadAttendance();
    } catch (err) {
        overlay.remove();
        alert('เกิดข้อผิดพลาด: ' + err.message);
    }
}

async function resetMonthData() {
    const month = parseInt(document.getElementById('attMonth').value);
    const year = parseInt(document.getElementById('attYear').value);
    const shopId = DEFAULT_SHOP_ID;
    const monthName = THAI_MONTHS[month - 1];

    if (!confirm(`⚠️ รีเซ็ตข้อมูลเดือน ${monthName} ${year}\n\nจะลบข้อมูลต่อไปนี้ทั้งหมด:\n• ข้อมูล Scan ทั้งเดือน\n• ข้อมูลตารางเวลาทั้งเดือน\n\nหลังรีเซ็ต ให้นำเข้าไฟล์ Excel ใหม่\n\nยืนยันหรือไม่?`)) return;
    if (!confirm(`⚠️ ยืนยันอีกครั้ง!\n\nลบข้อมูลเดือน ${monthName} ${year} ทั้งหมด?`)) return;

    try {
        await api.deleteScans({ shopId, month, year });
        await api.deleteAttendanceMonth({ shopId, month, year });
        attendanceRecords = [];
        renderAttList();
        alert(`✅ รีเซ็ตเดือน ${monthName} ${year} สำเร็จ!\n\nกรุณานำเข้าไฟล์ Excel ใหม่`);
    } catch (err) {
        alert('เกิดข้อผิดพลาด: ' + err.message);
    }
}

function getFilteredAttRecords() {
    let filtered = attendanceRecords;
    if (attSearchQuery.trim()) {
        const q = attSearchQuery.trim().toLowerCase();
        filtered = filtered.filter(r => r.empName.toLowerCase().includes(q) || String(r.empCode).toLowerCase().includes(q));
    }
    filtered = [...filtered].sort((a, b) => {
        const cmp = String(a.empCode).localeCompare(String(b.empCode), undefined, { numeric: true });
        return attSortOrder === 'asc' ? cmp : -cmp;
    });
    return filtered;
}

function renderAttList() {
    const el = document.getElementById('attList');
    if (!el) return;

    // Update sort button styles
    const btnAsc = document.getElementById('btnSortAsc');
    const btnDesc = document.getElementById('btnSortDesc');
    if (btnAsc) btnAsc.className = attSortOrder === 'asc' ? 'btn-primary' : 'btn-secondary';
    if (btnDesc) btnDesc.className = attSortOrder === 'desc' ? 'btn-primary' : 'btn-secondary';

    const displayRecords = getFilteredAttRecords();

    if (attendanceRecords.length === 0) {
        el.innerHTML = `<div class="card text-center py-12"><div style="font-size:64px;color:#d1d5db;margin-bottom:16px;">&#128197;</div><p class="text-gray-500 text-lg">ไม่พบข้อมูล</p><p class="text-gray-400 text-sm mt-1">กรุณาเลือกเดือน หรือนำเข้าข้อมูลก่อน</p></div>`;
        return;
    }
    if (displayRecords.length === 0) {
        el.innerHTML = `<div class="card text-center py-8"><p class="text-gray-500">ไม่พบพนักงานที่ค้นหา "${escHtml(attSearchQuery)}"</p></div>`;
        return;
    }
    el.innerHTML = '<div class="space-y-4">' + displayRecords.map(record => {
        const rIdx = attendanceRecords.indexOf(record);
        const highDeduct = record.totalDeduction >= 60;
        return `
        <div class="card card-no-pad overflow-hidden" style="${highDeduct ? 'border-left:4px solid #ef4444;' : ''}">
            <div class="accordion-header" onclick="toggleAttRecord('${record.id}')" style="${highDeduct ? 'background:#fef2f2;' : ''}">
                <div class="flex items-center gap-4">
                    <div style="width:40px;height:40px;background:${highDeduct ? '#fee2e2' : '#dbeafe'};border-radius:50%;display:flex;align-items:center;justify-content:center;">
                        <span style="color:${highDeduct ? '#dc2626' : '#1d4ed8'};font-weight:700;font-size:14px;">${escHtml(record.empCode)}</span>
                    </div>
                    <div>
                        <p class="font-semibold text-gray-800" style="font-size:16px;">${escHtml(record.empName)}${highDeduct ? ' <span style="background:#ef4444;color:white;font-size:11px;padding:2px 8px;border-radius:10px;margin-left:8px;font-weight:600;">&#9888; หักเกิน 60</span>' : ''}</p>
                        <p style="font-size:12px;color:#6b7280;margin-top:2px;">${escHtml(record.shopName)} | ${THAI_MONTHS[record.month - 1]} ${record.year}</p>
                    </div>
                    <div class="flex gap-1" style="margin-left:8px;" onclick="event.stopPropagation()">
                        <button class="btn-icon" onclick="editEmployeeName('${record.employeeId}','${escHtml(record.empName)}')" title="แก้ไขชื่อ" style="font-size:14px;padding:4px 6px;">&#9998;</button>
                        <button class="btn-icon" onclick="deleteEmployee('${record.employeeId}','${escHtml(record.empName)}')" title="ลบพนักงาน" style="font-size:14px;padding:4px 6px;color:#ef4444;">&#128465;</button>
                    </div>
                </div>
                <div class="flex items-center gap-6">
                    <div class="text-right" style="font-size:13px;">
                        <p style="color:#374151;font-weight:500;">ทำงาน <b>${record.workingDays}</b> | หยุด <b>${record.holidays}</b> | ขาด <b style="${record.absent > 0 ? 'color:#ef4444;' : ''}">${record.absent}</b></p>
                        <p style="margin-top:2px;font-weight:600;">รวมหัก <b style="${highDeduct ? 'color:#ef4444;font-size:16px;' : 'color:#059669;'}">${record.totalDeduction}</b> บาท</p>
                    </div>
                    <span class="chevron ${expandedAttId === record.id ? 'open' : ''}" style="font-size:20px;color:#9ca3af;">&#9660;</span>
                </div>
            </div>
            ${expandedAttId === record.id ? renderAttDetail(record, rIdx) : ''}
        </div>
    `; }).join('') + '</div>';
}

function toggleAttRecord(id) {
    expandedAttId = expandedAttId === id ? null : id;
    renderAttList();
}

function renderAttDetail(record, rIdx) {
    return `
        <div class="accordion-body">
            <div class="overflow-x-auto">
                <table class="att-table">
                    <thead><tr>
                        <th>#</th><th>วันที่</th><th>วัน</th><th>หยุด</th>
                        <th>เข้า</th><th>พักออก</th><th>พักเข้า</th><th>เลิก</th>
                        <th>เข้าสาย</th><th>บาท</th>
                        <th>รอบพัก</th>
                        <th>สายพัก</th><th>บาท</th>
                        <th>ยกเว้น</th>
                        <th>หมายเหตุ</th>
                    </tr></thead>
                    <tbody>
                        ${record.days.map((day, idx) => {
                            const breakDeadline = day.breakRound || '';
                            const scanCount = [day.scan1, day.scan2, day.scan3, day.scan4].filter(s => s && s.trim() !== '').length;
                            const hasEmptyScan = !day.isHoliday && scanCount > 0 && scanCount < 4;
                            const emptyCellStyle = 'background:#fff3e0;';
                            const s1empty = !day.isHoliday && !day.scan1;
                            const s2empty = !day.isHoliday && !day.scan2;
                            const s3empty = !day.isHoliday && !day.scan3;
                            const s4empty = !day.isHoliday && !day.scan4;
                            const anyEmpty = s1empty || s2empty || s3empty || s4empty;
                            // Auto scan1: ระบบ auto-fill จาก shift1Deadline ตาม config ตำแหน่ง (ลืม scan เข้างาน)
                            const isAutoScan1 = !day.isHoliday && day.autoScan1 && day.scan1;
                            // Auto scan2: ระบบ auto-fill จาก breakOutFixed ตาม config ตำแหน่ง (ลืม scan พักออก)
                            const isAutoScan2 = !day.isHoliday && day.autoScan2 && day.scan2;
                            // Auto scan3: ระบบ auto-fill จาก breakInDeadline ตาม config ตำแหน่ง (ลืม scan พักเข้า)
                            const isAutoScan3 = !day.isHoliday && day.autoScan3 && day.scan3;
                            // ⚠ ลืม scan พักเข้า: มี scan2 แต่ไม่มี scan3 (กรณี auto-fill ไม่ทำงาน)
                            const forgotScan3 = !day.isHoliday && day.scan2 && !day.scan3 && day.breakRound;
                            return `
                            <tr class="${day.isHoliday ? 'holiday' : day.isAbsent ? 'absent' : ''}">
                                <td style="color:#9ca3af;">${idx + 1}</td>
                                <td>${formatDate(day.date)}</td>
                                <td>${day.dayOfWeek}</td>
                                <td><input type="checkbox" ${day.isHoliday ? 'checked' : ''} onchange="toggleHoliday(${rIdx},${idx})"></td>
                                <td style="${isAutoScan1 ? 'background:#fef2f2;' : (!day.isHoliday && s1empty && anyEmpty ? emptyCellStyle : '')}">${day.isHoliday ? '-' : '<input type="time" class="time-input" value="'+(day.scan1||'')+'" onchange="updateScanTime('+rIdx+','+idx+',1,this.value)" style="'+(isAutoScan1 ? 'color:#dc2626;font-weight:600;' : '')+'">' + (isAutoScan1 ? '<span title="ระบบ auto-fill ตาม shift1Deadline ตำแหน่ง (สมมติเข้าตรงเวลา)" style="color:#dc2626;font-size:9px;margin-left:1px;font-weight:600;">auto</span>' : '')}</td>
                                <td style="${isAutoScan2 ? 'background:#fef2f2;' : (!day.isHoliday && s2empty && anyEmpty ? emptyCellStyle : '')}">${day.isHoliday ? '-' : '<input type="time" class="time-input" value="'+(day.scan2||'')+'" onchange="updateScanTime('+rIdx+','+idx+',2,this.value)" style="'+(isAutoScan2 ? 'color:#dc2626;font-weight:600;' : '')+'">' + (isAutoScan2 ? '<span title="ระบบ auto-fill ตาม breakOutFixed ตำแหน่ง (สมมติพักออกตรงเวลา)" style="color:#dc2626;font-size:9px;margin-left:1px;font-weight:600;">auto</span>' : '')}</td>
                                <td style="${isAutoScan3 ? 'background:#fef2f2;' : forgotScan3 ? 'background:#fef2f2;' : (!day.isHoliday && s3empty && anyEmpty ? emptyCellStyle : '')}">${day.isHoliday ? '-' : '<input type="time" class="time-input" value="'+(day.scan3||'')+'" onchange="updateScanTime('+rIdx+','+idx+',3,this.value)" style="'+(isAutoScan3 ? 'color:#dc2626;font-weight:600;' : '')+'">' + (isAutoScan3 ? '<span title="ระบบ auto-fill ตาม DL ตำแหน่ง (สมมติพักเข้าตรงเวลา)" style="color:#dc2626;font-size:9px;margin-left:1px;font-weight:600;">auto</span>' : forgotScan3 ? '<span title="น่าจะลืม scan พักเข้า" style="color:#ef4444;font-size:11px;margin-left:2px;">⚠ลืม?</span>' : '')}</td>
                                <td style="${!day.isHoliday && s4empty && anyEmpty ? emptyCellStyle : ''}">${day.isHoliday ? '-' : '<input type="time" class="time-input" value="'+(day.scan4||'')+'" onchange="updateScanTime('+rIdx+','+idx+',4,this.value)">'}</td>
                                <td style="${day.waiveLate1 ? 'text-decoration:line-through;color:#9ca3af;' : ''}">${day.late1Minutes > 0 ? minutesToTime(day.late1Minutes) : ''}</td>
                                <td class="text-red-600" style="${day.waiveLate1 ? 'text-decoration:line-through;color:#9ca3af;' : ''}">${day.late1Baht > 0 ? day.late1Baht : 0}</td>
                                <td class="text-center">${day.isHoliday ? '-' : (breakDeadline ? '<span class="badge badge-blue" style="font-size:10px;">'+breakDeadline+'</span>' + (forgotScan3 ? '<span title="ไม่มี scan พักเข้า ไม่สามารถตรวจสอบได้" style="color:#ef4444;font-size:11px;font-weight:700;margin-left:3px;">?</span>' : '') : '')}</td>
                                <td style="${day.waiveLate2 ? 'text-decoration:line-through;color:#9ca3af;' : ''}">${day.late2Minutes > 0 ? minutesToTime(day.late2Minutes) : ''}</td>
                                <td class="text-red-600" style="${day.waiveLate2 ? 'text-decoration:line-through;color:#9ca3af;' : ''}">${day.late2Baht > 0 ? day.late2Baht : 0}</td>
                                <td>${day.isHoliday ? '' : ((day.late1Baht > 0 || day.late2Baht > 0 || day.waiveLate1 || day.waiveLate2) ? '<div style="display:flex;gap:2px;justify-content:center;">' + (day.late1Baht > 0 || day.waiveLate1 ? '<button onclick="toggleWaive('+rIdx+','+idx+',1)" title="'+(day.waiveLate1?'ยกเลิกยกเว้นเข้าสาย':'ยกเว้นเข้าสาย')+'" style="font-size:10px;padding:2px 6px;border:1px solid '+(day.waiveLate1?'#059669':'#f59e0b')+';background:'+(day.waiveLate1?'#ecfdf5':'#fffbeb')+';color:'+(day.waiveLate1?'#059669':'#d97706')+';border-radius:4px;cursor:pointer;white-space:nowrap;">'+(day.waiveLate1?'&#10003; เข้า':'เข้า')+'</button>' : '') + (day.late2Baht > 0 || day.waiveLate2 ? '<button onclick="toggleWaive('+rIdx+','+idx+',2)" title="'+(day.waiveLate2?'ยกเลิกยกเว้นพักสาย':'ยกเว้นพักสาย')+'" style="font-size:10px;padding:2px 6px;border:1px solid '+(day.waiveLate2?'#059669':'#f59e0b')+';background:'+(day.waiveLate2?'#ecfdf5':'#fffbeb')+';color:'+(day.waiveLate2?'#059669':'#d97706')+';border-radius:4px;cursor:pointer;white-space:nowrap;">'+(day.waiveLate2?'&#10003; พัก':'พัก')+'</button>' : '') + '</div>' : '')}</td>
                                <td style="min-width:120px;"><input type="text" class="note-input" value="${escHtml(day.note||'')}" placeholder="หมายเหตุ..." onchange="updateNote(${rIdx},${idx},this.value)" style="width:100%;padding:2px 6px;border:1px solid var(--input-border);border-radius:4px;font-size:11px;font-family:inherit;background:var(--input-bg);color:var(--text-primary);outline:none;"></td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                    <tfoot><tr>
                        <td colspan="8" class="text-right">รวม</td>
                        <td>${minutesToTime(record.days.reduce((s, d) => s + (d.waiveLate1 ? 0 : d.late1Minutes), 0))}</td>
                        <td class="text-red-600">${record.totalLate1Baht}</td>
                        <td></td>
                        <td>${minutesToTime(record.days.reduce((s, d) => s + (d.waiveLate2 ? 0 : d.late2Minutes), 0))}</td>
                        <td class="text-red-600">${record.totalLate2Baht}</td>
                        <td></td>
                        <td></td>
                    </tr></tfoot>
                </table>
            </div>
            <div style="padding:12px 24px;background:var(--bg-surface2);display:flex;justify-content:flex-end;">
                <button class="btn-primary text-sm" onclick="saveAttRecord(${rIdx})">&#128190; บันทึกการเปลี่ยนแปลง</button>
            </div>
        </div>
    `;
}

function toggleHoliday(rIdx, dayIdx) {
    const record = attendanceRecords[rIdx];
    const day = record.days[dayIdx];
    day.isHoliday = !day.isHoliday;
    if (day.isHoliday) {
        day.scan1 = null; day.scan2 = null; day.scan3 = null; day.scan4 = null;
        day.isAbsent = false;
        day.late1Minutes = 0; day.late1Baht = 0;
        day.late2Minutes = 0; day.late2Baht = 0;
        day.waiveLate1 = false; day.waiveLate2 = false;
    }
    recalcRecordTotals(record);
    renderAttList();
}

function updateScanTime(rIdx, dayIdx, scanNum, value) {
    const record = attendanceRecords[rIdx];
    const day = record.days[dayIdx];
    const baseConfig = record.shiftConfig;
    const deductRate = (baseConfig && baseConfig.deductionPerMinute) || 1;

    // Update the scan value
    day['scan' + scanNum] = value || null;

    // Resolve per-day config: WDD position-based or legacy
    // Use scan1 as firstScanTime only if it's not a cross-midnight scan (00:00-02:59)
    const rawFirst = day.scan1;
    const firstForConfig = (rawFirst && timeToMinutes(rawFirst) >= 180) ? rawFirst : null;
    const wddConfig = getWddDayConfig(record.empName, day.date, firstForConfig);
    const config = wddConfig || baseConfig;

    // Recalculate break deadline
    let breakDL = null;
    if (day.scan2) {
        // Unified logic: if config has breakOutFixed and breakInDeadline, shift deadline when scan2 is late
        if (config.breakOutFixed && config.breakInDeadline) {
            const fixedOutMin = timeToMinutes(config.breakOutFixed);
            const actualOutMin = timeToMinutes(day.scan2);
            const baseDeadlineMin = timeToMinutes(config.breakInDeadline);
            let deadlineMin = baseDeadlineMin;
            if (actualOutMin > fixedOutMin) {
                deadlineMin = baseDeadlineMin + (actualOutMin - fixedOutMin);
            }
            const dh = Math.floor(deadlineMin / 60);
            const dm = deadlineMin % 60;
            breakDL = dh.toString().padStart(2, '0') + ':' + dm.toString().padStart(2, '0');
            // For WDD, show shift number; for legacy, show (DL ...)
            const label = wddConfig ? `กะ${detectWddShiftNum(firstForConfig)} ` : '';
            day.breakRound = `${label}(DL ${breakDL})`;
        }
    } else {
        day.breakRound = null;
    }

    // Recalculate late1 (scan1 vs shift1Deadline)
    const late1 = calculateLateness(day.scan1, config.shift1Deadline, deductRate);
    day.late1Minutes = late1.minutes;
    day.late1Baht = late1.baht;

    // Recalculate late2 (scan3 vs break deadline)
    const late2 = breakDL ? calculateLateness(day.scan3, breakDL, deductRate) : { minutes: 0, baht: 0 };
    day.late2Minutes = late2.minutes;
    day.late2Baht = late2.baht;

    // Check absent status
    day.isAbsent = !day.scan1 && !day.scan2 && !day.scan3 && !day.scan4;

    // Recalculate record totals
    recalcRecordTotals(record);
    renderAttList();
}

function recalcRecordTotals(record) {
    let holidays = 0, absent = 0, workingDays = 0, totalLate1 = 0, totalLate2 = 0;
    for (const d of record.days) {
        if (d.isHoliday) holidays++;
        else if (d.isAbsent) absent++;
        else workingDays++;
        if (!d.waiveLate1) totalLate1 += d.late1Baht;
        if (!d.waiveLate2) totalLate2 += d.late2Baht;
    }
    record.holidays = holidays;
    record.absent = absent;
    record.workingDays = workingDays;
    record.totalLate1Baht = totalLate1;
    record.totalLate2Baht = totalLate2;
    record.totalDeduction = totalLate1 + totalLate2;
}

function toggleWaive(rIdx, dayIdx, type) {
    const record = attendanceRecords[rIdx];
    const day = record.days[dayIdx];
    if (type === 1) day.waiveLate1 = !day.waiveLate1;
    if (type === 2) day.waiveLate2 = !day.waiveLate2;
    recalcRecordTotals(record);
    renderAttList();
}

function updateNote(rIdx, dayIdx, value) {
    const record = attendanceRecords[rIdx];
    const day = record.days[dayIdx];
    day.note = value.trim();
}

async function saveAttRecord(rIdx) {
    const record = attendanceRecords[rIdx];
    try {
        await api.updateAttendance(record.id, {
            holidays: record.holidays,
            absent: record.absent,
            workingDays: record.workingDays,
            totalLate1Baht: record.totalLate1Baht,
            totalLate2Baht: record.totalLate2Baht,
            totalDeduction: record.totalDeduction,
            days: record.days,
        });
        // Also save holidays to employee
        const emps = await api.getEmployees();
        const emp = emps.find(e => e.id === record.employeeId);
        if (emp) {
            const monthKey = `${record.year}-${record.month.toString().padStart(2, '0')}`;
            const holidayDates = record.days.filter(d => d.isHoliday).map(d => d.date);
            const holidays = { ...(emp.holidays || {}), [monthKey]: holidayDates };
            await api.updateEmployee(emp.id, { ...emp, holidays });
        }
        alert('บันทึกสำเร็จ!');
    } catch (err) { alert('Error: ' + err.message); }
}

async function editEmployeeName(employeeId, currentName) {
    const newName = prompt('แก้ไขชื่อพนักงาน:', currentName);
    if (!newName || newName.trim() === '' || newName.trim() === currentName) return;
    try {
        const emps = await api.getEmployees();
        const emp = emps.find(e => e.id === employeeId);
        if (!emp) { alert('ไม่พบพนักงาน'); return; }
        await api.updateEmployee(employeeId, { ...emp, name: newName.trim() });
        // Update attendance records in memory
        for (const rec of attendanceRecords) {
            if (rec.employeeId === employeeId) rec.empName = newName.trim();
        }
        // Update attendance in DB
        for (const rec of attendanceRecords) {
            if (rec.employeeId === employeeId) {
                await api.updateAttendance(rec.id, { empName: newName.trim() });
            }
        }
        renderAttList();
        alert('แก้ไขชื่อสำเร็จ!');
    } catch (err) { alert('เกิดข้อผิดพลาด: ' + err.message); }
}

async function deleteEmployee(employeeId, empName) {
    if (!confirm(`ต้องการลบพนักงาน "${empName}" หรือไม่?\n\n(ข้อมูลเวลาทั้งหมดของพนักงานคนนี้จะถูกลบด้วย)`)) return;
    try {
        await api.deleteEmployee(employeeId);
        attendanceRecords = attendanceRecords.filter(r => r.employeeId !== employeeId);
        renderAttList();
        alert('ลบพนักงานสำเร็จ!');
    } catch (err) { alert('เกิดข้อผิดพลาด: ' + err.message); }
}

// ============================================
// REPORTS
// ============================================
let reportRecords = [];
let selectedReportIds = new Set();

async function renderReports(container) {
    const now = new Date();
    container.innerHTML = `
        <div style="max-width:1100px;margin:0 auto;">
            <div class="mb-6">
                <h1 class="text-2xl font-bold text-gray-800">รายงาน / PDF</h1>
                <p class="text-gray-500 text-sm mt-1">สร้างรายงานรายบุคคลและส่งออก PDF</p>
            </div>
            <div class="card mb-6">
                <div class="grid-2">
                    <div><label class="text-sm text-gray-600" style="display:block;margin-bottom:4px;">เดือน</label>
                        <select id="rptMonth" class="input-field" onchange="loadReports()">
                            ${THAI_MONTHS.map((m, i) => `<option value="${i + 1}" ${i + 1 === now.getMonth() + 1 ? 'selected' : ''}>${m}</option>`).join('')}
                        </select>
                    </div>
                    <div><label class="text-sm text-gray-600" style="display:block;margin-bottom:4px;">ปี (ค.ศ.)</label>
                        <input type="number" id="rptYear" class="input-field" value="${now.getFullYear()}" min="2020" max="2030" onchange="loadReports()">
                    </div>
                </div>
            </div>
            <div id="rptList"></div>
        </div>
    `;
    reportRecords = [];
    selectedReportIds = new Set();
    loadReports();
}

async function loadReports() {
    const month = parseInt(document.getElementById('rptMonth').value);
    const year = parseInt(document.getElementById('rptYear').value);
    try {
        reportRecords = await api.getAttendance({ shopId: DEFAULT_SHOP_ID, month, year });
        reportRecords.sort((a, b) => String(a.empCode).localeCompare(String(b.empCode), undefined, { numeric: true }));
        selectedReportIds = new Set(reportRecords.map(r => r.id));
    } catch { reportRecords = []; }
    renderReportList();
}

function renderReportList() {
    const el = document.getElementById('rptList');
    if (!el) return;
    if (reportRecords.length === 0) {
        el.innerHTML = `<div class="card text-center py-12"><div style="font-size:64px;color:#d1d5db;margin-bottom:16px;">&#128196;</div><p class="text-gray-500 text-lg">ไม่พบข้อมูล</p><p class="text-gray-400 text-sm mt-1">กรุณาเลือกเดือน หรือนำเข้าข้อมูลก่อน</p></div>`;
        return;
    }
    el.innerHTML = `
        <div class="card mb-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <input type="checkbox" ${selectedReportIds.size === reportRecords.length ? 'checked' : ''} onchange="toggleAllReports()">
                <span class="text-sm text-gray-600">เลือก ${selectedReportIds.size} / ${reportRecords.length} คน</span>
            </div>
            <div class="flex gap-2">
                <button class="btn-success" onclick="printSummaryReport()" ${reportRecords.length === 0 ? 'disabled' : ''}>&#128202; สรุปรวม</button>
                <button class="btn-primary" onclick="printAllReports()" ${reportRecords.length === 0 ? 'disabled' : ''}>&#128424; พิมพ์ทั้งหมด</button>
            </div>
        </div>
        <div class="space-y-3">
            ${reportRecords.map(record => {
                const highDeduct = record.totalDeduction >= 60;
                return `
                <div class="card flex items-center justify-between" style="${highDeduct ? 'border-left:4px solid #ef4444;background:#fef2f2;' : ''}">
                    <div class="flex items-center gap-4">
                        <input type="checkbox" ${selectedReportIds.has(record.id) ? 'checked' : ''} onchange="toggleReportId('${record.id}')">
                        <div style="width:40px;height:40px;background:${highDeduct ? '#fee2e2' : '#dbeafe'};border-radius:50%;display:flex;align-items:center;justify-content:center;">
                            <span style="color:${highDeduct ? '#dc2626' : '#1d4ed8'};font-weight:700;font-size:14px;">${escHtml(record.empCode)}</span>
                        </div>
                        <div>
                            <p class="font-semibold text-gray-800" style="font-size:16px;">${escHtml(record.empName)}${highDeduct ? ' <span style="background:#ef4444;color:white;font-size:11px;padding:2px 8px;border-radius:10px;margin-left:8px;font-weight:600;">&#9888; หักเกิน 60</span>' : ''}</p>
                            <p style="font-size:13px;color:#374151;font-weight:500;margin-top:2px;">ทำงาน <b>${record.workingDays}</b> | หยุด <b>${record.holidays}</b> | ขาด <b style="${record.absent > 0 ? 'color:#ef4444;' : ''}">${record.absent}</b> | หัก <b style="${highDeduct ? 'color:#ef4444;font-size:15px;' : 'color:#059669;'}">${record.totalDeduction} บาท</b></p>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button class="btn-icon" onclick="printReport('${record.id}')" title="พิมพ์" style="background:#2563eb;color:white;border-radius:6px;padding:6px 10px;font-size:14px;">&#128424; พิมพ์</button>
                        <button class="btn-icon" onclick="downloadSinglePDF('${record.id}')" title="ดาวน์โหลด PDF" style="background:#10b981;color:white;border-radius:6px;padding:6px 10px;font-size:14px;">&#128196; PDF</button>
                    </div>
                </div>`;
            }).join('')}
        </div>
    `;
}

function toggleReportId(id) {
    if (selectedReportIds.has(id)) selectedReportIds.delete(id);
    else selectedReportIds.add(id);
    renderReportList();
}

function toggleAllReports() {
    if (selectedReportIds.size === reportRecords.length) {
        selectedReportIds = new Set();
    } else {
        selectedReportIds = new Set(reportRecords.map(r => r.id));
    }
    renderReportList();
}

async function downloadReportPDF() {
    const selected = reportRecords.filter(r => selectedReportIds.has(r.id));
    if (selected.length === 0) { alert('กรุณาเลือกพนักงานอย่างน้อย 1 คน'); return; }
    try { await generatePDF(selected); } catch (err) { alert('เกิดข้อผิดพลาด: ' + err.message); }
}

async function downloadSinglePDF(id) {
    const record = reportRecords.find(r => r.id === id);
    if (!record) { alert('ไม่พบข้อมูล'); return; }
    if (!record.days || record.days.length === 0) { alert('ไม่มีข้อมูลรายวัน กรุณาประมวลผลใหม่ก่อน'); return; }
    try { await generatePDF([record]); } catch (err) { alert('เกิดข้อผิดพลาด: ' + err.message); }
}

function printSummaryReport() {
    if (reportRecords.length === 0) { alert('ไม่มีข้อมูลให้สรุป'); return; }
    const sorted = [...reportRecords].sort((a, b) => String(a.empCode).localeCompare(String(b.empCode), undefined, { numeric: true }));
    const shopName = DEFAULT_SHOP_NAME;
    const month = parseInt(document.getElementById('rptMonth').value);
    const year = parseInt(document.getElementById('rptYear').value);
    const buddhistYear = ceToBuddhist(year);

    // Calculate grand totals
    let grandWorkingDays = 0, grandHolidays = 0, grandAbsent = 0;
    let grandLate1 = 0, grandLate2 = 0, grandDeduction = 0;
    for (const r of sorted) {
        grandWorkingDays += r.workingDays;
        grandHolidays += r.holidays;
        grandAbsent += r.absent;
        grandLate1 += r.totalLate1Baht;
        grandLate2 += r.totalLate2Baht;
        grandDeduction += r.totalDeduction;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><title>สรุปรวมพนักงาน</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'Sarabun',sans-serif;font-size:12px;padding:20px;}
        .header{text-align:center;margin-bottom:20px;}
        .header h2{font-size:18px;font-weight:700;margin-bottom:4px;}
        .header p{font-size:13px;color:#555;}
        .stats{display:flex;justify-content:center;gap:24px;margin-bottom:16px;}
        .stat-box{text-align:center;padding:8px 16px;border-radius:8px;background:#f3f4f6;}
        .stat-box .num{font-size:20px;font-weight:700;}
        .stat-box .lbl{font-size:10px;color:#6b7280;}
        table{width:100%;border-collapse:collapse;font-size:11px;margin-top:10px;}
        th,td{border:1px solid #333;padding:5px 8px;text-align:center;}
        th{background:#2563eb;color:white;font-weight:600;font-size:10px;}
        tbody tr:nth-child(even){background:#f9fafb;}
        tbody tr:hover{background:#eff6ff;}
        .text-right{text-align:right;}
        .text-left{text-align:left;}
        tfoot td{background:#1e3a5f;color:white;font-weight:700;}
        .footer{margin-top:15px;font-size:10px;color:#999;}
        .badge{display:inline-block;padding:1px 6px;border-radius:10px;font-size:9px;font-weight:600;}
        .badge-green{background:#dcfce7;color:#15803d;}
        .badge-red{background:#fee2e2;color:#dc2626;}
        .badge-amber{background:#fef3c7;color:#b45309;}
        @media print{body{padding:10px;}}
    </style></head><body>
    <div class="header">
        <h2>สรุปภาพรวมพนักงานทั้งหมด</h2>
        <p>ร้าน: ${shopName} | ประจำเดือน: ${THAI_MONTHS[month - 1]} ${buddhistYear} | จำนวน ${sorted.length} คน</p>
    </div>
    <div class="stats">
        <div class="stat-box"><div class="num" style="color:#2563eb;">${sorted.length}</div><div class="lbl">พนักงาน</div></div>
        <div class="stat-box"><div class="num" style="color:#16a34a;">${grandWorkingDays}</div><div class="lbl">วันทำงานรวม</div></div>
        <div class="stat-box"><div class="num" style="color:#d97706;">${grandHolidays}</div><div class="lbl">วันหยุดรวม</div></div>
        <div class="stat-box"><div class="num" style="color:#dc2626;">${grandAbsent}</div><div class="lbl">ขาดรวม</div></div>
        <div class="stat-box"><div class="num" style="color:#dc2626;">${grandDeduction.toLocaleString()}</div><div class="lbl">หักรวม (บาท)</div></div>
    </div>
    <table>
        <thead><tr>
            <th>ลำดับ</th><th>รหัส</th><th>ชื่อพนักงาน</th>
            <th>วันทำงาน</th><th>วันหยุด</th><th>ขาด</th>
            <th>สายเข้า (บาท)</th><th>สายพัก (บาท)</th><th>รวมหัก (บาท)</th>
            <th>สถานะ</th>
        </tr></thead>
        <tbody>${sorted.map((r, i) => {
            let status = '';
            if (r.totalDeduction === 0 && r.absent === 0) status = '<span class="badge badge-green">ดี</span>';
            else if (r.absent > 0) status = '<span class="badge badge-red">มีขาด</span>';
            else status = '<span class="badge badge-amber">มีหัก</span>';
            return '<tr>' +
                '<td>' + (i + 1) + '</td>' +
                '<td>' + r.empCode + '</td>' +
                '<td class="text-left">' + r.empName + '</td>' +
                '<td>' + r.workingDays + '</td>' +
                '<td>' + r.holidays + '</td>' +
                '<td style="color:' + (r.absent > 0 ? '#dc2626' : 'inherit') + ';font-weight:' + (r.absent > 0 ? '700' : '400') + ';">' + r.absent + '</td>' +
                '<td>' + (r.totalLate1Baht > 0 ? r.totalLate1Baht : 0) + '</td>' +
                '<td>' + (r.totalLate2Baht > 0 ? r.totalLate2Baht : 0) + '</td>' +
                '<td style="color:#dc2626;font-weight:700;">' + r.totalDeduction + '</td>' +
                '<td>' + status + '</td>' +
            '</tr>';
        }).join('')}</tbody>
        <tfoot><tr>
            <td colspan="3" class="text-right">รวมทั้งหมด</td>
            <td>${grandWorkingDays}</td><td>${grandHolidays}</td><td>${grandAbsent}</td>
            <td>${grandLate1}</td><td>${grandLate2}</td><td>${grandDeduction.toLocaleString()}</td>
            <td></td>
        </tr></tfoot>
    </table>
    <div class="footer"><p>พิมพ์เมื่อ: ${new Date().toLocaleString('th-TH')}</p></div>
    <script>window.onload=function(){window.print();}<\/script></body></html>`);
    printWindow.document.close();
}

function buildReportHTML(record) {
    const shopName = DEFAULT_SHOP_NAME;
    const buddhistYear = ceToBuddhist(record.year);
    return `
        <div class="header"><h2>ตารางสรุปการทำงานรายบุคคล</h2><p>ร้าน: ${shopName} | ประจำเดือน: ${THAI_MONTHS[record.month - 1]} ${buddhistYear}</p></div>
        <div class="info-grid">
            <div><span class="label">ชื่อ:</span> ${record.empName}</div><div><span class="label">รหัส:</span> ${record.empCode}</div>
            <div><span class="label">วันทำงาน:</span> ${record.workingDays} วัน</div><div><span class="label">วันหยุด:</span> ${record.holidays} วัน</div>
            <div><span class="label">ขาด:</span> ${record.absent} วัน</div><div><span class="label">รวมหัก:</span> ${record.totalDeduction} บาท</div>
        </div>
        <table><thead><tr><th>#</th><th>วันที่</th><th>วัน</th><th>หยุด</th><th>เข้า</th><th>พักออก</th><th>พักเข้า</th><th>เลิก</th><th>เข้าสาย</th><th>หัก(บาท)</th><th>รอบพัก</th><th>สายพัก</th><th>หัก(บาท)</th></tr></thead>
        <tbody>${record.days.map((day, idx) => {
            return '<tr class="' + (day.isHoliday ? 'holiday' : day.isAbsent ? 'absent' : '') + '">' +
            '<td>' + (idx + 1) + '</td><td>' + formatDate(day.date) + '</td><td>' + day.dayOfWeek + '</td><td>' + (day.isHoliday ? 'YES' : '') + '</td>' +
            '<td>' + (day.isHoliday ? '-' : (day.autoScan1 ? '-' : formatTime(day.scan1))) + '</td><td>' + (day.isHoliday ? '-' : (day.autoScan2 ? '-' : formatTime(day.scan2))) + '</td>' +
            '<td>' + (day.isHoliday ? '-' : (day.autoScan3 ? '-' : formatTime(day.scan3))) + '</td><td>' + (day.isHoliday ? '-' : formatTime(day.scan4)) + '</td>' +
            '<td>' + (day.late1Minutes > 0 ? minutesToTime(day.late1Minutes) : '') + '</td><td>' + (day.late1Baht > 0 ? day.late1Baht : 0) + '</td>' +
            '<td>' + (day.isHoliday ? '-' : (day.breakRound || '')) + '</td>' +
            '<td>' + (day.late2Minutes > 0 ? minutesToTime(day.late2Minutes) : '') + '</td><td>' + (day.late2Baht > 0 ? day.late2Baht : 0) + '</td>' +
            '</tr>';
        }).join('')}</tbody>
        <tfoot><tr style="background:#f3f4f6;font-weight:bold;"><td colspan="8" class="text-right">รวม</td>
            <td>${minutesToTime(record.days.reduce((s, d) => s + d.late1Minutes, 0))}</td><td>${record.totalLate1Baht}</td><td></td>
            <td>${minutesToTime(record.days.reduce((s, d) => s + d.late2Minutes, 0))}</td><td>${record.totalLate2Baht}</td>
        </tr></tfoot></table>
        <div class="summary"><p>รวมหักทั้งหมด: ${record.totalDeduction} บาท</p></div>`;
}

function getPrintStyles() {
    return `
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Sarabun',sans-serif;font-size:11px;padding:20px;}
        .header{text-align:center;margin-bottom:15px;}.header h2{font-size:16px;margin-bottom:5px;}
        .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:10px;font-size:12px;}.info-grid .label{font-weight:600;}
        table{width:100%;border-collapse:collapse;font-size:10px;}th,td{border:1px solid #333;padding:3px 5px;text-align:center;}
        th{background:#2563eb;color:white;font-weight:600;}.holiday{background:#fef3c7;}.absent{background:#fee2e2;}
        .text-right{text-align:right;}.summary{margin-top:10px;font-size:12px;}.footer{margin-top:15px;font-size:10px;color:#666;}
        .page-break{page-break-after:always;margin-bottom:20px;}
        .page-break:last-child{page-break-after:auto;}
        @media print{body{padding:10px;}.page-break{page-break-after:always;}.page-break:last-child{page-break-after:auto;}}
    `;
}

function printReport(id) {
    const record = reportRecords.find(r => r.id === id);
    if (!record) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><title>รายงาน ${record.empName}</title>
        <style>${getPrintStyles()}</style></head><body>
        ${buildReportHTML(record)}
        <div class="footer"><p>พิมพ์เมื่อ: ${new Date().toLocaleString('th-TH')}</p></div>
        <script>window.onload=function(){window.print();}<\/script></body></html>`);
    printWindow.document.close();
}

function printAllReports() {
    const sorted = [...reportRecords].sort((a, b) => String(a.empCode).localeCompare(String(b.empCode), undefined, { numeric: true }));
    if (sorted.length === 0) { alert('ไม่มีข้อมูลให้พิมพ์'); return; }
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const pages = sorted.map(record => `<div class="page-break">${buildReportHTML(record)}</div>`).join('');
    printWindow.document.write(`<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><title>รายงานทั้งหมด</title>
        <style>${getPrintStyles()}</style></head><body>
        ${pages}
        <script>window.onload=function(){window.print();}<\/script></body></html>`);
    printWindow.document.close();
}

// ============================================
// SETTINGS
// ============================================
function renderSettings(container) {
    container.innerHTML = `
        <div style="max-width:600px;margin:0 auto;">
            <div class="mb-6">
                <h1 class="text-2xl font-bold text-gray-800">ตั้งค่า</h1>
                <p class="text-gray-500 text-sm mt-1">ตั้งค่าทั่วไปของระบบ</p>
            </div>
            <div class="card mb-6">
                <h3 class="text-sm font-semibold text-gray-700 mb-4">ข้อมูลร้านค้า</h3>
                <div style="margin-bottom:16px;">
                    <label class="text-sm text-gray-600" style="display:block;margin-bottom:4px;">ชื่อร้านค้า</label>
                    <input type="text" id="settingShopName" class="input-field" value="${escHtml(DEFAULT_SHOP_NAME)}" placeholder="กรอกชื่อร้านค้า">
                    <p class="text-xs text-gray-400" style="margin-top:4px;">ชื่อร้านจะแสดงในรายงานและ PDF</p>
                </div>
                <div style="display:flex;justify-content:flex-end;">
                    <button class="btn-success" onclick="saveSettings()">&#10004; บันทึกการตั้งค่า</button>
                </div>
            </div>
            <div class="card">
                <h3 class="text-sm font-semibold text-gray-700 mb-1">วันหยุดนักขัตฤกษ์</h3>
                <p class="text-xs text-gray-400 mb-4">วันที่กำหนดจะใช้กฎ เสาร์-อาทิตย์ ในการคำนวณเวลาพนักงาน WDD (เสิร์ฟ)</p>
                <div style="display:flex;gap:8px;margin-bottom:12px;">
                    <input type="date" id="phDateInput" class="input-field" style="flex:1;">
                    <input type="text" id="phNameInput" class="input-field" style="flex:1;" placeholder="ชื่อวันหยุด (ไม่บังคับ)">
                    <button class="btn-primary" onclick="addPublicHoliday()" style="white-space:nowrap;">+ เพิ่ม</button>
                </div>
                <div id="phList"></div>
            </div>
        </div>
    `;
    renderPublicHolidayList();
}

// PUBLIC_HOLIDAYS_NAMES: stored in memory only (names are display-only, dates are in DB)
let PUBLIC_HOLIDAYS_NAMES = {};

function renderPublicHolidayList() {
    const el = document.getElementById('phList');
    if (!el) return;
    const holidays = [...PUBLIC_HOLIDAYS].sort();
    if (holidays.length === 0) {
        el.innerHTML = '<p class="text-sm text-gray-400 text-center py-4">ยังไม่มีวันหยุดนักขัตฤกษ์</p>';
        return;
    }
    el.innerHTML = `<div style="max-height:300px;overflow-y:auto;">
        <table style="width:100%;font-size:13px;border-collapse:collapse;">
            <thead><tr style="background:#f9fafb;">
                <th style="padding:6px 10px;text-align:left;border-bottom:1px solid #e5e7eb;">วันที่</th>
                <th style="padding:6px 10px;text-align:left;border-bottom:1px solid #e5e7eb;">วัน</th>
                <th style="padding:6px 10px;text-align:left;border-bottom:1px solid #e5e7eb;">ชื่อวันหยุด</th>
                <th style="padding:6px 10px;text-align:center;border-bottom:1px solid #e5e7eb;">ลบ</th>
            </tr></thead>
            <tbody>${holidays.map(d => {
                const dayName = getThaiDayName(d);
                const name = PUBLIC_HOLIDAYS_NAMES[d] || '';
                return `<tr style="border-bottom:1px solid #f3f4f6;">
                    <td style="padding:6px 10px;font-family:monospace;">${formatDate(d)}</td>
                    <td style="padding:6px 10px;">${dayName}</td>
                    <td style="padding:6px 10px;color:#6b7280;">${escHtml(name)}</td>
                    <td style="padding:6px 10px;text-align:center;">
                        <button onclick="removePublicHoliday('${d}')" style="color:#ef4444;background:none;border:none;cursor:pointer;font-size:16px;" title="ลบ">&#128465;</button>
                    </td>
                </tr>`;
            }).join('')}</tbody>
        </table>
    </div>`;
}

async function savePublicHolidaysToDB() {
    try {
        await api.updateShop(DEFAULT_SHOP_ID, { name: DEFAULT_SHOP_NAME, publicHolidays: PUBLIC_HOLIDAYS });
    } catch (err) {
        alert('เกิดข้อผิดพลาดบันทึกวันหยุด: ' + err.message);
    }
}

async function addPublicHoliday() {
    const dateInput = document.getElementById('phDateInput');
    const nameInput = document.getElementById('phNameInput');
    const d = dateInput.value;
    if (!d) { alert('กรุณาเลือกวันที่'); return; }
    if (!PUBLIC_HOLIDAYS.includes(d)) PUBLIC_HOLIDAYS.push(d);
    if (nameInput.value.trim()) PUBLIC_HOLIDAYS_NAMES[d] = nameInput.value.trim();
    await savePublicHolidaysToDB();
    dateInput.value = '';
    nameInput.value = '';
    renderPublicHolidayList();
}

async function removePublicHoliday(d) {
    PUBLIC_HOLIDAYS = PUBLIC_HOLIDAYS.filter(h => h !== d);
    delete PUBLIC_HOLIDAYS_NAMES[d];
    await savePublicHolidaysToDB();
    renderPublicHolidayList();
}

async function saveSettings() {
    const shopName = document.getElementById('settingShopName').value.trim();
    if (!shopName) {
        alert('กรุณากรอกชื่อร้านค้า');
        return;
    }
    try {
        await api.updateShop(DEFAULT_SHOP_ID, { name: shopName, publicHolidays: PUBLIC_HOLIDAYS });
        DEFAULT_SHOP_NAME = shopName;
        alert('บันทึกการตั้งค่าสำเร็จ!');
    } catch (err) {
        alert('เกิดข้อผิดพลาด: ' + err.message);
    }
}

// ============================================
// UTILITIES
// ============================================
function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
