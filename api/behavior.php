<?php
require_once __DIR__ . '/config.php';
requireAuth();

$db = getDB();
$method = getMethod();
$id = $_GET['id'] ?? null;

// POST /api/behavior.php - Add behavior log
if ($method === 'POST') {
    $body = getJsonBody();
    $bonusRecordId = $body['bonusRecordId'] ?? '';
    $type          = $body['type']          ?? 'good';
    $date          = $body['date']          ?? date('Y-m-d');
    $description   = $body['description']   ?? '';

    if (!$bonusRecordId || !$description) jsonResponse(['error' => 'bonusRecordId and description required'], 400);
    if (!in_array($type, ['good', 'bad'])) jsonResponse(['error' => 'type must be good or bad'], 400);

    $stmt = $db->prepare('INSERT INTO behavior_logs (bonusRecordId, type, date, description) VALUES (?,?,?,?)');
    $stmt->execute([$bonusRecordId, $type, $date, $description]);
    $newId = $db->lastInsertId();

    jsonResponse(['id' => $newId, 'bonusRecordId' => $bonusRecordId, 'type' => $type, 'date' => $date, 'description' => $description, 'createdAt' => date('Y-m-d H:i:s')]);
}

// PUT /api/behavior.php?id=xxx - Update behavior log
if ($method === 'PUT' && $id) {
    $body = getJsonBody();
    $fields = [];
    $params = [];

    if (array_key_exists('type', $body))        { $fields[] = 'type = ?';        $params[] = $body['type']; }
    if (array_key_exists('date', $body))        { $fields[] = 'date = ?';        $params[] = $body['date']; }
    if (array_key_exists('description', $body)) { $fields[] = 'description = ?'; $params[] = $body['description']; }

    if (empty($fields)) jsonResponse(['error' => 'No fields to update'], 400);
    $params[] = $id;
    $stmt = $db->prepare('UPDATE behavior_logs SET ' . implode(', ', $fields) . ' WHERE id = ?');
    $stmt->execute($params);
    jsonResponse(['updated' => $stmt->rowCount()]);
}

// DELETE /api/behavior.php?id=xxx - Delete behavior log
if ($method === 'DELETE' && $id) {
    $stmt = $db->prepare('DELETE FROM behavior_logs WHERE id = ?');
    $stmt->execute([$id]);
    jsonResponse(['deleted' => $stmt->rowCount()]);
}

jsonResponse(['error' => 'Method not allowed'], 405);
