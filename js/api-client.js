// ============================================
// API Client - PHP Backend
// ============================================

const API_BASE = 'api';

async function fetchJSON(url, options = {}) {
    const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    if (res.status === 401) {
        window.location.href = 'login.html';
        throw new Error('Unauthorized');
    }
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`API Error ${res.status}: ${text}`);
    }
    return res.json();
}

const api = {
    // Employees
    getEmployees: () => fetchJSON(`${API_BASE}/employees.php`),
    createEmployee: (data) =>
        fetchJSON(`${API_BASE}/employees.php`, { method: 'POST', body: JSON.stringify(data) }),
    updateEmployee: (id, data) =>
        fetchJSON(`${API_BASE}/employees.php?id=${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteEmployee: (id) =>
        fetchJSON(`${API_BASE}/employees.php?id=${id}`, { method: 'DELETE' }),

    // Attendance
    getAttendance: (params = {}) => {
        const sp = new URLSearchParams();
        if (params.shopId) sp.set('shopId', params.shopId);
        if (params.month) sp.set('month', params.month.toString());
        if (params.year) sp.set('year', params.year.toString());
        if (params.employeeId) sp.set('employeeId', params.employeeId);
        return fetchJSON(`${API_BASE}/attendance.php?${sp.toString()}`);
    },
    saveAttendance: (data) =>
        fetchJSON(`${API_BASE}/attendance.php`, { method: 'POST', body: JSON.stringify(data) }),
    updateAttendance: (id, data) =>
        fetchJSON(`${API_BASE}/attendance.php?id=${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteAttendance: (id) =>
        fetchJSON(`${API_BASE}/attendance.php?id=${id}`, { method: 'DELETE' }),
    deleteAttendanceMonth: (params) =>
        fetchJSON(`${API_BASE}/attendance.php?shopId=${params.shopId}&month=${params.month}&year=${params.year}`, { method: 'DELETE' }),

    // Raw Scans
    getScans: (params) => {
        const sp = new URLSearchParams();
        if (params.shopId) sp.set('shopId', params.shopId);
        if (params.month) sp.set('month', params.month.toString());
        if (params.year) sp.set('year', params.year.toString());
        return fetchJSON(`${API_BASE}/scans.php?${sp.toString()}`);
    },
    saveScans: (data) =>
        fetchJSON(`${API_BASE}/scans.php`, { method: 'POST', body: JSON.stringify(data) }),
    deleteScans: (params) =>
        fetchJSON(`${API_BASE}/scans.php?shopId=${params.shopId}&month=${params.month}&year=${params.year}`, { method: 'DELETE' }),

    // Import Sessions
    getImportSessions: () => fetchJSON(`${API_BASE}/import-sessions.php`),
    createImportSession: (data) =>
        fetchJSON(`${API_BASE}/import-sessions.php`, { method: 'POST', body: JSON.stringify(data) }),

    // Settings (uses shops table for shop name)
    getShop: (id) => fetchJSON(`${API_BASE}/shops.php?id=${id}`),
    updateShop: (id, data) =>
        fetchJSON(`${API_BASE}/shops.php?id=${id}`, { method: 'PUT', body: JSON.stringify(data) }),

};
