<?php
// One-time script: Update shift1End from 10:30 to 11:30 for all employees
// Run once, then DELETE this file
require_once __DIR__ . '/config.php';

header('Content-Type: text/html; charset=utf-8');

$db = getDB();
$stmt = $db->query('SELECT id, empCode, name, shiftConfig FROM employees');
$rows = $stmt->fetchAll();

$updated = 0;
foreach ($rows as $row) {
    $config = json_decode($row['shiftConfig'], true);
    if (isset($config['shift1End']) && $config['shift1End'] === '10:30') {
        $config['shift1End'] = '11:30';
        $db->prepare('UPDATE employees SET shiftConfig = ? WHERE id = ?')
           ->execute([json_encode($config, JSON_UNESCAPED_UNICODE), $row['id']]);
        $updated++;
        echo "<p>✅ อัปเดต: {$row['empCode']} - {$row['name']} (shift1End: 10:30 → 11:30)</p>";
    } else {
        echo "<p>ℹ️ ข้าม: {$row['empCode']} - {$row['name']} (shift1End = {$config['shift1End']})</p>";
    }
}

echo "<hr><p><b>อัปเดตทั้งหมด: {$updated} คน</b></p>";
echo '<p style="color:red;font-weight:bold;">⚠️ กรุณาลบไฟล์ fix-shift1end.php หลังรันเสร็จ!</p>';
echo '<p>หลังจากนี้ให้ไปเมนู "ตารางเวลา" แล้วกด "ประมวลผลใหม่" เพื่อคำนวณข้อมูลใหม่</p>';
