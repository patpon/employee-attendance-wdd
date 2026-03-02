# ระบบลงเวลาพนักงาน - WDD

## ข้อมูลการเชื่อมต่อฐานข้อมูล
- **Database Name**: `ajpatpon_wdd_attendance`
- **Username**: `ajpatpon_wdd`
- **Password**: `wdd123456`

## Users และสิทธิ์
| Username | Password | สิทธิ์ | เมนูที่เข้าได้ |
|----------|----------|-------|---------------|
| **admin** | admin | admin | ทุกเมนู (แดชบอร์ด, นำเข้า, ตารางเวลา, รายงาน, ตั้งค่า) |
| **wdd** | wdd | importer | เฉพาะเมนู "นำเข้าข้อมูล" |

## ขั้นตอนการติดตั้ง

### 1. สร้างฐานข้อมูล
```sql
CREATE DATABASE ajpatpon_wdd_attendance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'ajpatpon_wdd'@'localhost' IDENTIFIED BY 'wdd123456';
GRANT ALL PRIVILEGES ON ajpatpon_wdd_attendance.* TO 'ajpatpon_wdd'@'localhost';
FLUSH PRIVILEGES;
```

### 2. สร้างตาราง
รันไฟล์ `database.sql` ในฐานข้อมูล `ajpatpon_wdd_attendance`

### 3. อัปโหลดไฟล์
อัปโหลดทุกไฟล์ในโฟลเดอร์นี้ขึ้น server:

```
/employee-attendance-wdd/
├── api/
├── css/
├── js/
├── fonts/
├── index.html
├── login.html
└── README-WDD.md
```

### 4. ทดสอบ
- เข้า `https://yourdomain.com/employee-attendance-wdd/`
- Login ด้วย:
  - `admin / admin` (สำหรับ admin)
  - `wdd / wdd` (สำหรับพนักงานนำเข้าข้อมูล)

## การทำงาน
1. **พนักงาน (wdd)** → นำเข้าไฟล์ Excel ที่เมนู "นำเข้าข้อมูล"
2. **Admin (admin)** → ไปเมนู "ตารางเวลา" → กด "ประมวลผลและบันทึก"
3. **Admin (admin)** → ดูรายงานและพิมพ์ PDF ได้

## หมายเหตุ
- ร้าน WDD เป็นโครงการแยกจากร้านหลัก
- ข้อมูลไม่ปนกันกับร้านอื่น
- สามารถเพิ่ม/ลบ/แก้ไข user ได้ที่ `api/config.php` ในส่วน `AUTH_USERS`
