<?php
// ============================================
// Database Configuration
// ============================================
define('DB_HOST', 'localhost');
define('DB_NAME', 'ajpatpon_wtt');
define('DB_USER', 'ajpatpon_wtt');
define('DB_PASS', 'Du*n8L3jdH$gt7zg');
define('DB_CHARSET', 'utf8mb4');

// Default Shop (ร้านเดียว)
define('DEFAULT_SHOP_ID', 'default');
define('DEFAULT_SHOP_NAME', 'WDD');

// Authentication - Users list: [username => [password, role, displayName]]
// role: admin = ทุกเมนู, importer = เฉพาะนำเข้าข้อมูล
define('AUTH_USERS', [
    'admin' => ['password' => 'admin', 'role' => 'admin',    'displayName' => 'ผู้ดูแลระบบ WDD'],
    'wdd'   => ['password' => 'wdd',   'role' => 'importer', 'displayName' => 'ผู้นำเข้าข้อมูล WDD'],
]);
define('AUTH_SECRET', 'change-this-to-a-random-secret-string');

// CORS & Headers
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Database connection
function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }
    return $pdo;
}

// Helper: generate unique ID
function generateId(): string {
    return base_convert(time(), 10, 36) . bin2hex(random_bytes(5));
}

// Helper: get JSON body
function getJsonBody(): array {
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?: [];
}

// Helper: send JSON response
function jsonResponse($data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// Helper: get request method
function getMethod(): string {
    return $_SERVER['REQUEST_METHOD'];
}

// Helper: verify session
function verifySession(): bool {
    session_start();
    return isset($_SESSION['authenticated']) && $_SESSION['authenticated'] === true;
}

// Helper: require authentication for API
function requireAuth(): void {
    session_start();
    if (!isset($_SESSION['authenticated']) || $_SESSION['authenticated'] !== true) {
        jsonResponse(['error' => 'Unauthorized'], 401);
    }
}

// Helper: require specific role(s)
function requireRole(array $allowedRoles): void {
    requireAuth();
    $role = $_SESSION['role'] ?? '';
    if (!in_array($role, $allowedRoles)) {
        jsonResponse(['error' => 'ไม่มีสิทธิ์เข้าถึง'], 403);
    }
}
