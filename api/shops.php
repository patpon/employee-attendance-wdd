<?php
require_once __DIR__ . '/config.php';
requireAuth();

$method = getMethod();
$db = getDB();
$id = $_GET['id'] ?? null;

// GET /api/shops.php - List all shops
if ($method === 'GET' && !$id) {
    $stmt = $db->query('SELECT * FROM shops ORDER BY createdAt DESC');
    jsonResponse($stmt->fetchAll());
}

// GET /api/shops.php?id=xxx - Get single shop
if ($method === 'GET' && $id) {
    $stmt = $db->prepare('SELECT * FROM shops WHERE id = ?');
    $stmt->execute([$id]);
    $shop = $stmt->fetch();
    if (!$shop) jsonResponse(['error' => 'Not found'], 404);
    jsonResponse($shop);
}

// POST /api/shops.php - Create shop
if ($method === 'POST') {
    $body = getJsonBody();
    $newId = generateId();
    $now = date('Y-m-d H:i:s.000');
    $stmt = $db->prepare('INSERT INTO shops (id, name, createdAt, updatedAt) VALUES (?, ?, ?, ?)');
    $stmt->execute([$newId, $body['name'], $now, $now]);
    
    $stmt = $db->prepare('SELECT * FROM shops WHERE id = ?');
    $stmt->execute([$newId]);
    jsonResponse($stmt->fetch());
}

// PUT /api/shops.php?id=xxx - Update shop
if ($method === 'PUT' && $id) {
    $body = getJsonBody();
    $now = date('Y-m-d H:i:s.000');
    $stmt = $db->prepare('UPDATE shops SET name = ?, updatedAt = ? WHERE id = ?');
    $stmt->execute([$body['name'], $now, $id]);
    
    $stmt = $db->prepare('SELECT * FROM shops WHERE id = ?');
    $stmt->execute([$id]);
    jsonResponse($stmt->fetch());
}

// DELETE /api/shops.php?id=xxx - Delete shop
if ($method === 'DELETE' && $id) {
    $stmt = $db->prepare('DELETE FROM shops WHERE id = ?');
    $stmt->execute([$id]);
    jsonResponse(['success' => true]);
}

jsonResponse(['error' => 'Invalid request'], 400);
