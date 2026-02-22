<?php
require_once __DIR__ . '/config.php';

$method = getMethod();
$action = $_GET['action'] ?? '';

if ($method === 'POST' && $action === 'login') {
    $body = getJsonBody();
    $username = $body['username'] ?? '';
    $password = $body['password'] ?? '';

    $users = AUTH_USERS;
    if (isset($users[$username]) && $users[$username]['password'] === $password) {
        $user = $users[$username];
        session_start();
        $_SESSION['authenticated'] = true;
        $_SESSION['username'] = $username;
        $_SESSION['displayName'] = $user['displayName'];
        $_SESSION['role'] = $user['role'];
        jsonResponse([
            'success' => true,
            'username' => $username,
            'displayName' => $user['displayName'],
            'role' => $user['role'],
        ]);
    }

    jsonResponse(['success' => false, 'message' => 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'], 401);
}

if ($method === 'POST' && $action === 'logout') {
    session_start();
    session_destroy();
    jsonResponse(['success' => true]);
}

if ($method === 'GET' && $action === 'check') {
    session_start();
    $authenticated = isset($_SESSION['authenticated']) && $_SESSION['authenticated'] === true;
    jsonResponse([
        'authenticated' => $authenticated,
        'username' => $_SESSION['username'] ?? '',
        'displayName' => $_SESSION['displayName'] ?? '',
        'role' => $_SESSION['role'] ?? '',
    ]);
}

jsonResponse(['error' => 'Invalid action'], 400);
