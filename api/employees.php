<?php
require_once __DIR__ . '/config.php';
requireAuth();

$method = getMethod();
$db = getDB();
$id = $_GET['id'] ?? null;
$shopId = $_GET['shopId'] ?? null;

// GET /api/employees.php - List employees
if ($method === 'GET' && !$id) {
    if ($shopId) {
        $stmt = $db->prepare('SELECT * FROM employees WHERE shopId = ? ORDER BY createdAt DESC');
        $stmt->execute([$shopId]);
    } else {
        $stmt = $db->query('SELECT * FROM employees ORDER BY createdAt DESC');
    }
    $rows = $stmt->fetchAll();
    // Parse JSON fields
    foreach ($rows as &$row) {
        $row['shiftConfig'] = json_decode($row['shiftConfig'], true);
        $row['holidays'] = json_decode($row['holidays'], true);
    }
    jsonResponse($rows);
}

// GET /api/employees.php?id=xxx
if ($method === 'GET' && $id) {
    $stmt = $db->prepare('SELECT * FROM employees WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) jsonResponse(['error' => 'Not found'], 404);
    $row['shiftConfig'] = json_decode($row['shiftConfig'], true);
    $row['holidays'] = json_decode($row['holidays'], true);
    jsonResponse($row);
}

// POST /api/employees.php - Create employee
if ($method === 'POST') {
    $body = getJsonBody();
    $newId = generateId();
    $now = date('Y-m-d H:i:s.000');
    $stmt = $db->prepare('INSERT INTO employees (id, empCode, name, shopId, shiftConfig, holidays, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $newId,
        $body['empCode'],
        $body['name'],
        $body['shopId'],
        json_encode($body['shiftConfig'], JSON_UNESCAPED_UNICODE),
        json_encode($body['holidays'] ?? new \stdClass(), JSON_UNESCAPED_UNICODE),
        $now,
        $now,
    ]);
    
    $stmt = $db->prepare('SELECT * FROM employees WHERE id = ?');
    $stmt->execute([$newId]);
    $row = $stmt->fetch();
    $row['shiftConfig'] = json_decode($row['shiftConfig'], true);
    $row['holidays'] = json_decode($row['holidays'], true);
    jsonResponse($row);
}

// PUT /api/employees.php?id=xxx - Update employee
if ($method === 'PUT' && $id) {
    $body = getJsonBody();
    $now = date('Y-m-d H:i:s.000');
    $stmt = $db->prepare('UPDATE employees SET empCode = ?, name = ?, shopId = ?, shiftConfig = ?, holidays = ?, updatedAt = ? WHERE id = ?');
    $stmt->execute([
        $body['empCode'],
        $body['name'],
        $body['shopId'],
        json_encode($body['shiftConfig'], JSON_UNESCAPED_UNICODE),
        json_encode($body['holidays'] ?? new \stdClass(), JSON_UNESCAPED_UNICODE),
        $now,
        $id,
    ]);
    
    $stmt = $db->prepare('SELECT * FROM employees WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    $row['shiftConfig'] = json_decode($row['shiftConfig'], true);
    $row['holidays'] = json_decode($row['holidays'], true);
    jsonResponse($row);
}

// DELETE /api/employees.php?id=xxx
if ($method === 'DELETE' && $id) {
    $stmt = $db->prepare('DELETE FROM employees WHERE id = ?');
    $stmt->execute([$id]);
    jsonResponse(['success' => true]);
}

jsonResponse(['error' => 'Invalid request'], 400);
