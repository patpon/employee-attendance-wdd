<?php
require_once __DIR__ . '/config.php';
requireAuth();

$method = getMethod();
$db = getDB();
$id = $_GET['id'] ?? null;

// GET /api/attendance.php - List attendance records
if ($method === 'GET' && !$id) {
    $where = [];
    $params = [];
    
    if (!empty($_GET['shopId'])) {
        $where[] = 'shopId = ?';
        $params[] = $_GET['shopId'];
    }
    if (!empty($_GET['month'])) {
        $where[] = 'month = ?';
        $params[] = (int)$_GET['month'];
    }
    if (!empty($_GET['year'])) {
        $where[] = 'year = ?';
        $params[] = (int)$_GET['year'];
    }
    if (!empty($_GET['employeeId'])) {
        $where[] = 'employeeId = ?';
        $params[] = $_GET['employeeId'];
    }
    
    $sql = 'SELECT * FROM monthly_attendance';
    if ($where) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }
    $sql .= ' ORDER BY empName ASC';
    
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();
    
    foreach ($rows as &$row) {
        $row['month'] = (int)$row['month'];
        $row['year'] = (int)$row['year'];
        $row['totalDays'] = (int)$row['totalDays'];
        $row['holidays'] = (int)$row['holidays'];
        $row['absent'] = (int)$row['absent'];
        $row['leave'] = (int)$row['leave'];
        $row['quarantine'] = (int)$row['quarantine'];
        $row['workingDays'] = (int)$row['workingDays'];
        $row['totalLate1Baht'] = (int)$row['totalLate1Baht'];
        $row['totalLate2Baht'] = (int)$row['totalLate2Baht'];
        $row['totalDeduction'] = (int)$row['totalDeduction'];
        $row['days'] = json_decode($row['days'], true);
        $row['shiftConfig'] = json_decode($row['shiftConfig'], true);
    }
    jsonResponse($rows);
}

// POST /api/attendance.php - Create or upsert attendance
if ($method === 'POST') {
    $body = getJsonBody();
    $now = date('Y-m-d H:i:s.000');
    
    // Check if exists
    $stmt = $db->prepare('SELECT id FROM monthly_attendance WHERE employeeId = ? AND month = ? AND year = ?');
    $stmt->execute([$body['employeeId'], (int)$body['month'], (int)$body['year']]);
    $existing = $stmt->fetch();
    
    if ($existing) {
        // Update
        $stmt = $db->prepare('UPDATE monthly_attendance SET empCode=?, empName=?, shopId=?, shopName=?, totalDays=?, holidays=?, absent=?, `leave`=?, quarantine=?, workingDays=?, totalLate1Baht=?, totalLate2Baht=?, totalDeduction=?, days=?, shiftConfig=?, updatedAt=? WHERE id=?');
        $stmt->execute([
            $body['empCode'],
            $body['empName'],
            $body['shopId'],
            $body['shopName'],
            (int)$body['totalDays'],
            (int)$body['holidays'],
            (int)$body['absent'],
            (int)($body['leave'] ?? 0),
            (int)($body['quarantine'] ?? 0),
            (int)$body['workingDays'],
            (int)($body['totalLate1Baht'] ?? 0),
            (int)($body['totalLate2Baht'] ?? 0),
            (int)($body['totalDeduction'] ?? 0),
            json_encode($body['days'], JSON_UNESCAPED_UNICODE),
            json_encode($body['shiftConfig'], JSON_UNESCAPED_UNICODE),
            $now,
            $existing['id'],
        ]);
        $recordId = $existing['id'];
    } else {
        // Insert
        $recordId = $body['id'] ?? generateId();
        $stmt = $db->prepare('INSERT INTO monthly_attendance (id, employeeId, empCode, empName, shopId, shopName, month, year, totalDays, holidays, absent, `leave`, quarantine, workingDays, totalLate1Baht, totalLate2Baht, totalDeduction, days, shiftConfig, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
        $stmt->execute([
            $recordId,
            $body['employeeId'],
            $body['empCode'],
            $body['empName'],
            $body['shopId'],
            $body['shopName'],
            (int)$body['month'],
            (int)$body['year'],
            (int)$body['totalDays'],
            (int)$body['holidays'],
            (int)$body['absent'],
            (int)($body['leave'] ?? 0),
            (int)($body['quarantine'] ?? 0),
            (int)$body['workingDays'],
            (int)($body['totalLate1Baht'] ?? 0),
            (int)($body['totalLate2Baht'] ?? 0),
            (int)($body['totalDeduction'] ?? 0),
            json_encode($body['days'], JSON_UNESCAPED_UNICODE),
            json_encode($body['shiftConfig'], JSON_UNESCAPED_UNICODE),
            $now,
            $now,
        ]);
    }
    
    $stmt = $db->prepare('SELECT * FROM monthly_attendance WHERE id = ?');
    $stmt->execute([$recordId]);
    $row = $stmt->fetch();
    $row['days'] = json_decode($row['days'], true);
    $row['shiftConfig'] = json_decode($row['shiftConfig'], true);
    $row['month'] = (int)$row['month'];
    $row['year'] = (int)$row['year'];
    $row['totalDays'] = (int)$row['totalDays'];
    $row['holidays'] = (int)$row['holidays'];
    $row['absent'] = (int)$row['absent'];
    $row['leave'] = (int)$row['leave'];
    $row['quarantine'] = (int)$row['quarantine'];
    $row['workingDays'] = (int)$row['workingDays'];
    $row['totalLate1Baht'] = (int)$row['totalLate1Baht'];
    $row['totalLate2Baht'] = (int)$row['totalLate2Baht'];
    $row['totalDeduction'] = (int)$row['totalDeduction'];
    jsonResponse($row);
}

// PUT /api/attendance.php?id=xxx - Update attendance
if ($method === 'PUT' && $id) {
    $body = getJsonBody();
    $now = date('Y-m-d H:i:s.000');

    // Support partial update (e.g. only empName)
    $sets = [];
    $params = [];
    if (isset($body['empName'])) { $sets[] = 'empName=?'; $params[] = $body['empName']; }
    if (isset($body['holidays'])) { $sets[] = 'holidays=?'; $params[] = (int)$body['holidays']; }
    if (isset($body['absent'])) { $sets[] = 'absent=?'; $params[] = (int)$body['absent']; }
    if (isset($body['workingDays'])) { $sets[] = 'workingDays=?'; $params[] = (int)$body['workingDays']; }
    if (isset($body['totalLate1Baht'])) { $sets[] = 'totalLate1Baht=?'; $params[] = (int)$body['totalLate1Baht']; }
    if (isset($body['totalLate2Baht'])) { $sets[] = 'totalLate2Baht=?'; $params[] = (int)$body['totalLate2Baht']; }
    if (isset($body['totalDeduction'])) { $sets[] = 'totalDeduction=?'; $params[] = (int)$body['totalDeduction']; }
    if (isset($body['days'])) { $sets[] = 'days=?'; $params[] = json_encode($body['days'], JSON_UNESCAPED_UNICODE); }
    $sets[] = 'updatedAt=?'; $params[] = $now;
    $params[] = $id;

    $stmt = $db->prepare('UPDATE monthly_attendance SET ' . implode(', ', $sets) . ' WHERE id=?');
    $stmt->execute($params);
    
    $stmt = $db->prepare('SELECT * FROM monthly_attendance WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    $row['days'] = json_decode($row['days'], true);
    $row['shiftConfig'] = json_decode($row['shiftConfig'], true);
    jsonResponse($row);
}

// DELETE /api/attendance.php?id=xxx - Delete single record
if ($method === 'DELETE' && $id) {
    $stmt = $db->prepare('DELETE FROM monthly_attendance WHERE id = ?');
    $stmt->execute([$id]);
    jsonResponse(['success' => true]);
}

// DELETE /api/attendance.php?shopId=xxx&month=2&year=2026 - Delete all records for a month
if ($method === 'DELETE' && !$id) {
    $shopId = $_GET['shopId'] ?? '';
    $month = (int)($_GET['month'] ?? 0);
    $year = (int)($_GET['year'] ?? 0);
    if ($shopId && $month && $year) {
        $stmt = $db->prepare('DELETE FROM monthly_attendance WHERE shopId = ? AND month = ? AND year = ?');
        $stmt->execute([$shopId, $month, $year]);
        jsonResponse(['deleted' => $stmt->rowCount()]);
    }
}

jsonResponse(['error' => 'Invalid request'], 400);
