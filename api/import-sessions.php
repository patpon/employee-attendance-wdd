<?php
require_once __DIR__ . '/config.php';
requireAuth();

$method = getMethod();
$db = getDB();

// GET /api/import-sessions.php - List all import sessions
if ($method === 'GET') {
    $stmt = $db->query('SELECT * FROM import_sessions ORDER BY importedAt DESC');
    $rows = $stmt->fetchAll();
    foreach ($rows as &$row) {
        $row['month'] = (int)$row['month'];
        $row['year'] = (int)$row['year'];
        $row['recordCount'] = (int)$row['recordCount'];
    }
    jsonResponse($rows);
}

// POST /api/import-sessions.php - Create import session
if ($method === 'POST') {
    $body = getJsonBody();
    $newId = generateId();
    $now = date('Y-m-d H:i:s.000');
    $stmt = $db->prepare('INSERT INTO import_sessions (id, shopId, month, year, importedAt, fileName, recordCount) VALUES (?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $newId,
        $body['shopId'],
        (int)$body['month'],
        (int)$body['year'],
        $now,
        $body['fileName'],
        (int)$body['recordCount'],
    ]);
    
    $stmt = $db->prepare('SELECT * FROM import_sessions WHERE id = ?');
    $stmt->execute([$newId]);
    $row = $stmt->fetch();
    $row['month'] = (int)$row['month'];
    $row['year'] = (int)$row['year'];
    $row['recordCount'] = (int)$row['recordCount'];
    jsonResponse($row);
}

jsonResponse(['error' => 'Invalid request'], 400);
