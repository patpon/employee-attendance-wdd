# ระบบจัดการลงเวลาพนักงาน (PHP Version)

สำหรับ deploy บน Shared Hosting (Hostatom / Plesk)

**โหมดร้านเดียว** - ใช้ร้านค้าเดียว (default) พนักงานถูกสร้างอัตโนมัติจากไฟล์ Excel ที่นำเข้า

## โครงสร้างไฟล์

```
├── api/
│   ├── config.php          ← ตั้งค่า DB + Auth + ชื่อร้าน (แก้ไขก่อน deploy)
│   ├── auth.php             ← Login/Logout API
│   ├── shops.php            ← ร้านค้า (ใช้ default ร้านเดียว)
│   ├── employees.php        ← พนักงาน (สร้างอัตโนมัติจาก Excel)
│   ├── attendance.php       ← CRUD ข้อมูลเวลา
│   └── import-sessions.php  ← ประวัติการนำเข้า
├── js/
│   ├── app.js               ← Main SPA (ทุกหน้า)
│   ├── api-client.js        ← เรียก PHP API
│   ├── date-utils.js        ← ฟังก์ชันวันที่/เวลา
│   ├── excel-parser.js      ← อ่านไฟล์ Excel (SheetJS)
│   ├── shift-assigner.js    ← จัดกะอัตโนมัติ
│   └── pdf-generator.js     ← สร้าง PDF (jsPDF)
├── css/
│   └── style.css            ← Stylesheet
├── index.html               ← หน้าหลัก (SPA)
├── login.html               ← หน้า Login
├── database.sql             ← SQL สร้างตาราง + insert ร้าน default
├── .htaccess                ← Security rules
└── README.md
```

## ขั้นตอน Deploy บน Hostatom

### 1. สร้างฐานข้อมูล (ทำแล้ว)
- Database: `ajpatpon_attendance`
- User: `ajpatpon_attendance`
- Password: `3Vt72lx*j~BnIfmm`

### 2. สร้างตารางในฐานข้อมูล
1. เข้า **phpMyAdmin** บน Plesk
2. เลือกฐานข้อมูล `ajpatpon_attendance`
3. ไปที่แท็บ **SQL**
4. วาง SQL จากไฟล์ `database.sql` ทั้งหมด
5. กด **Go** เพื่อรัน

### 3. แก้ไข config.php (สำคัญ!)
เปิดไฟล์ `api/config.php` แก้ไขค่าเหล่านี้:
```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'ajpatpon_attendance');
define('DB_USER', 'ajpatpon_attendance');
define('DB_PASS', '3Vt72lx*j~BnIfmm');

// เปลี่ยนรหัสผ่าน admin ตามต้องการ
define('AUTH_USERNAME', 'admin');
define('AUTH_PASSWORD', 'admin');
```

### 4. อัปโหลดไฟล์ไปยัง Hosting
ใช้ **File Manager** ใน Plesk หรือ **FTP**:

1. เข้า File Manager ของ `att.ajpatpon.com`
2. อัปโหลด **ทุกไฟล์และโฟลเดอร์** ไปที่ root ของ domain:
   - `api/` (ทั้งโฟลเดอร์)
   - `js/` (ทั้งโฟลเดอร์)
   - `css/` (ทั้งโฟลเดอร์)
   - `fonts/` (ทั้งโฟลเดอร์ - สำหรับ PDF ภาษาไทย)
   - `index.html`
   - `login.html`
   - `.htaccess`
3. **ไม่ต้อง** อัปโหลด `database.sql` และ `README.md`

### 5. ทดสอบ
เปิด `https://att.ajpatpon.com/login.html`
- Username: `admin`
- Password: `admin`

## ข้อมูล Login เริ่มต้น
- **Username:** admin
- **Password:** admin
- (เปลี่ยนได้ที่ `api/config.php`)

## ความต้องการของ Server
- PHP 7.4+ (รองรับ PDO MySQL)
- MySQL 5.7+ หรือ 8.x
- ไม่ต้องการ Node.js, npm, หรือ composer
