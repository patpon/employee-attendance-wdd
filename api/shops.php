<?php
require_once __DIR__ . '/config.php';
requireAuth();

$method = getMethod();
$db = getDB();
$id = $_GET['id'] ?? null;

// GET /api/shops.php - List all shops
if ($method === 'GET' && !$id) {
    $stmt = $db->query('SELECT * FROM shops ORDER BY createdAt DESC');
    $rows = $stmt->fetchAll();
    foreach ($rows as &$row) {
        $row['publicHolidays'] = isset($row['publicHolidays']) ? json_decode($row['publicHolidays'], true) : [];
    }
    jsonResponse($rows);
}

// GET /api/shops.php?id=xxx - Get single shop
if ($method === 'GET' && $id) {
    $stmt = $db->prepare('SELECT * FROM shops WHERE id = ?');
    $stmt->execute([$id]);
    $shop = $stmt->fetch();
    if (!$shop) jsonResponse(['error' => 'Not found'], 404);
    $shop['publicHolidays'] = isset($shop['publicHolidays']) ? json_decode($shop['publicHolidays'], true) : [];
    jsonResponse($shop);
}

// POST /api/shops.php - Create shop
if ($method === 'POST') {
    $body = getJsonBody();
    $newId = generateId();
    $now = date('Y-m-d H:i:s.000');
    $ph = json_encode($body['publicHolidays'] ?? [], JSON_UNESCAPED_UNICODE);
    $stmt = $db->prepare('INSERT INTO shops (id, name, publicHolidays, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)');
    $stmt->execute([$newId, $body['name'], $ph, $now, $now]);
    
    $stmt = $db->prepare('SELECT * FROM shops WHERE id = ?');
    $stmt->execute([$newId]);
    $shop = $stmt->fetch();
    $shop['publicHolidays'] = json_decode($shop['publicHolidays'], true) ?? [];
    jsonResponse($shop);
}

// PUT /api/shops.php?id=xxx - Update shop
if ($method === 'PUT' && $id) {
    $body = getJsonBody();
    $now = date('Y-m-d H:i:s.000');
    $ph = json_encode($body['publicHolidays'] ?? [], JSON_UNESCAPED_UNICODE);
    $stmt = $db->prepare('UPDATE shops SET name = ?, publicHolidays = ?, updatedAt = ? WHERE id = ?');
    $stmt->execute([$body['name'], $ph, $now, $id]);
    
    $stmt = $db->prepare('SELECT * FROM shops WHERE id = ?');
    $stmt->execute([$id]);
    $shop = $stmt->fetch();
    $shop['publicHolidays'] = json_decode($shop['publicHolidays'], true) ?? [];
    jsonResponse($shop);
}

// DELETE /api/shops.php?id=xxx - Delete shop
if ($method === 'DELETE' && $id) {
    $stmt = $db->prepare('DELETE FROM shops WHERE id = ?');
    $stmt->execute([$id]);
    jsonResponse(['success' => true]);
}

jsonResponse(['error' => 'Invalid request'], 400);
