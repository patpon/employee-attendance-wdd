<?php
require_once __DIR__ . '/config.php';
requireAuth();

$db = getDB();
$method = getMethod();
$id = $_GET['id'] ?? null;

// ============================================================
// GET /api/bonus.php?shopId=xxx&year=2026  - List all bonus records for year
// GET /api/bonus.php?id=xxx               - Get single record with behavior logs
// ============================================================
if ($method === 'GET') {
    if ($id) {
        $stmt = $db->prepare('SELECT * FROM bonus_records WHERE id = ?');
        $stmt->execute([$id]);
        $rec = $stmt->fetch();
        if (!$rec) jsonResponse(['error' => 'Not found'], 404);

        $rec['attendanceSummary'] = $rec['attendanceSummary'] ? json_decode($rec['attendanceSummary'], true) : null;

        $stmt2 = $db->prepare('SELECT * FROM behavior_logs WHERE bonusRecordId = ? ORDER BY date ASC, createdAt ASC');
        $stmt2->execute([$id]);
        $rec['behaviorLogs'] = $stmt2->fetchAll();

        jsonResponse($rec);
    }

    $shopId = $_GET['shopId'] ?? DEFAULT_SHOP_ID;
    $year   = (int)($_GET['year'] ?? date('Y'));

    $stmt = $db->prepare('SELECT * FROM bonus_records WHERE shopId = ? AND year = ? ORDER BY empCode');
    $stmt->execute([$shopId, $year]);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$row) {
        $row['attendanceSummary'] = $row['attendanceSummary'] ? json_decode($row['attendanceSummary'], true) : null;
        $stmt2 = $db->prepare('SELECT * FROM behavior_logs WHERE bonusRecordId = ? ORDER BY date ASC');
        $stmt2->execute([$row['id']]);
        $row['behaviorLogs'] = $stmt2->fetchAll();
    }

    jsonResponse($rows);
}

// ============================================================
// POST /api/bonus.php  - Create or upsert bonus record
// ============================================================
if ($method === 'POST') {
    $body = getJsonBody();
    $shopId     = $body['shopId']     ?? DEFAULT_SHOP_ID;
    $employeeId = $body['employeeId'] ?? '';
    $empCode    = $body['empCode']    ?? '';
    $empName    = $body['empName']    ?? '';
    $year       = (int)($body['year'] ?? date('Y'));

    if (!$employeeId) jsonResponse(['error' => 'employeeId required'], 400);

    // Check if exists
    $stmt = $db->prepare('SELECT id FROM bonus_records WHERE employeeId = ? AND year = ?');
    $stmt->execute([$employeeId, $year]);
    $existing = $stmt->fetch();

    if ($existing) {
        jsonResponse(['id' => $existing['id'], 'created' => false]);
    }

    $newId = generateId();
    $attSummary = isset($body['attendanceSummary']) ? json_encode($body['attendanceSummary'], JSON_UNESCAPED_UNICODE) : null;

    $stmt = $db->prepare('INSERT INTO bonus_records (id, employeeId, empCode, empName, shopId, year, bonusAmount, bonusStatus, bonusNote, attendanceSummary) VALUES (?,?,?,?,?,?,0,"pending",NULL,?)');
    $stmt->execute([$newId, $employeeId, $empCode, $empName, $shopId, $year, $attSummary]);

    jsonResponse(['id' => $newId, 'created' => true]);
}

// ============================================================
// PUT /api/bonus.php?id=xxx  - Update bonus record
// ============================================================
if ($method === 'PUT' && $id) {
    $body = getJsonBody();

    $fields = [];
    $params = [];

    if (array_key_exists('photo', $body)) {
        $fields[] = 'photo = ?';
        $params[] = $body['photo']; // base64
    }
    if (array_key_exists('bonusAmount', $body)) {
        $fields[] = 'bonusAmount = ?';
        $params[] = (float)$body['bonusAmount'];
    }
    if (array_key_exists('bonusStatus', $body)) {
        $fields[] = 'bonusStatus = ?';
        $params[] = $body['bonusStatus'];
    }
    if (array_key_exists('bonusNote', $body)) {
        $fields[] = 'bonusNote = ?';
        $params[] = $body['bonusNote'];
    }
    if (array_key_exists('attendanceSummary', $body)) {
        $fields[] = 'attendanceSummary = ?';
        $params[] = json_encode($body['attendanceSummary'], JSON_UNESCAPED_UNICODE);
    }
    if (array_key_exists('empName', $body)) {
        $fields[] = 'empName = ?';
        $params[] = $body['empName'];
    }

    if (empty($fields)) jsonResponse(['error' => 'No fields to update'], 400);

    $params[] = $id;
    $stmt = $db->prepare('UPDATE bonus_records SET ' . implode(', ', $fields) . ' WHERE id = ?');
    $stmt->execute($params);

    jsonResponse(['updated' => $stmt->rowCount()]);
}

// ============================================================
// DELETE /api/bonus.php?id=xxx  - Delete bonus record (cascades to behavior_logs)
// ============================================================
if ($method === 'DELETE' && $id) {
    $stmt = $db->prepare('DELETE FROM bonus_records WHERE id = ?');
    $stmt->execute([$id]);
    jsonResponse(['deleted' => $stmt->rowCount()]);
}

jsonResponse(['error' => 'Method not allowed'], 405);
