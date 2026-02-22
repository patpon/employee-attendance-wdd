<?php
// ============================================
// Raw Scans API
// ============================================
require_once __DIR__ . '/config.php';

$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// Auto-create table if not exists
$db->exec("
    CREATE TABLE IF NOT EXISTS `raw_scans` (
        `id`        INT          NOT NULL AUTO_INCREMENT,
        `shopId`    VARCHAR(30)  NOT NULL,
        `empCode`   VARCHAR(255) NOT NULL,
        `empName`   VARCHAR(255) NOT NULL,
        `date`      VARCHAR(10)  NOT NULL,
        `time`      VARCHAR(8)   NOT NULL,
        `timestamp` BIGINT       NOT NULL,
        `month`     INT          NOT NULL,
        `year`      INT          NOT NULL,
        `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (`id`),
        UNIQUE KEY `raw_scans_unique` (`shopId`, `empCode`, `date`, `time`),
        INDEX `raw_scans_month_year_idx` (`shopId`, `month`, `year`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
");

// GET /api/scans.php?shopId=xxx&month=2&year=2026 - Get scans for a month
if ($method === 'GET') {
    $shopId = $_GET['shopId'] ?? '';
    $month = (int)($_GET['month'] ?? 0);
    $year = (int)($_GET['year'] ?? 0);
    
    if (!$shopId || !$month || !$year) {
        jsonResponse([]);
        exit;
    }
    
    $stmt = $db->prepare('SELECT empCode, empName, date, time, timestamp FROM raw_scans WHERE shopId = ? AND month = ? AND year = ? ORDER BY empCode, date, time');
    $stmt->execute([$shopId, $month, $year]);
    $rows = $stmt->fetchAll();
    
    // Cast timestamp to int
    foreach ($rows as &$row) {
        $row['timestamp'] = (int)$row['timestamp'];
    }
    
    jsonResponse($rows);
}

// POST /api/scans.php - Bulk insert scans (upsert)
if ($method === 'POST') {
    $body = getJsonBody();
    $shopId = $body['shopId'] ?? '';
    $month = (int)($body['month'] ?? 0);
    $year = (int)($body['year'] ?? 0);
    $scans = $body['scans'] ?? [];
    
    if (!$shopId || !$month || !$year || empty($scans)) {
        jsonResponse(['error' => 'Missing required fields'], 400);
        exit;
    }
    
    $inserted = 0;
    $skipped = 0;
    
    $stmt = $db->prepare('INSERT IGNORE INTO raw_scans (shopId, empCode, empName, date, time, timestamp, month, year) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    
    foreach ($scans as $scan) {
        $result = $stmt->execute([
            $shopId,
            $scan['empCode'],
            $scan['empName'],
            $scan['date'],
            $scan['time'],
            (int)$scan['timestamp'],
            $month,
            $year,
        ]);
        if ($stmt->rowCount() > 0) {
            $inserted++;
        } else {
            $skipped++;
        }
    }
    
    jsonResponse(['inserted' => $inserted, 'skipped' => $skipped, 'total' => count($scans)]);
}

// DELETE /api/scans.php?shopId=xxx&month=2&year=2026 - Delete scans for a month
if ($method === 'DELETE') {
    $shopId = $_GET['shopId'] ?? '';
    $month = (int)($_GET['month'] ?? 0);
    $year = (int)($_GET['year'] ?? 0);
    
    if (!$shopId || !$month || !$year) {
        jsonResponse(['error' => 'Missing required fields'], 400);
        exit;
    }
    
    $stmt = $db->prepare('DELETE FROM raw_scans WHERE shopId = ? AND month = ? AND year = ?');
    $stmt->execute([$shopId, $month, $year]);
    jsonResponse(['deleted' => $stmt->rowCount()]);
}
