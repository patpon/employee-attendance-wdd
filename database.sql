-- =====================================================
-- ระบบจัดการลงเวลาพนักงาน (Employee Attendance) - WDD
-- สำหรับ MySQL 5.7+ / 8.x
-- =====================================================

CREATE TABLE IF NOT EXISTS `shops` (
  `id`             VARCHAR(30)  NOT NULL,
  `name`           VARCHAR(255) NOT NULL,
  `publicHolidays` JSON         NULL,
  `createdAt`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default shop
INSERT IGNORE INTO `shops` (`id`, `name`, `publicHolidays`, `createdAt`, `updatedAt`)
VALUES ('default', 'WDD', '[]', NOW(3), NOW(3));

-- Migrate: add publicHolidays column if not exists (for existing installations)
ALTER TABLE `shops` ADD COLUMN IF NOT EXISTS `publicHolidays` JSON NULL;

CREATE TABLE IF NOT EXISTS `employees` (
  `id`          VARCHAR(30)  NOT NULL,
  `empCode`     VARCHAR(255) NOT NULL,
  `name`        VARCHAR(255) NOT NULL,
  `shopId`      VARCHAR(30)  NOT NULL,
  `shiftConfig` JSON         NOT NULL,
  `holidays`    JSON         NOT NULL,
  `isActive`    TINYINT(1)   NOT NULL DEFAULT 1,
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `employees_empCode_shopId_key` (`empCode`, `shopId`),
  INDEX `employees_shopId_idx` (`shopId`),
  CONSTRAINT `employees_shopId_fkey`
    FOREIGN KEY (`shopId`) REFERENCES `shops` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `monthly_attendance` (
  `id`             VARCHAR(30)  NOT NULL,
  `employeeId`     VARCHAR(30)  NOT NULL,
  `empCode`        VARCHAR(255) NOT NULL,
  `empName`        VARCHAR(255) NOT NULL,
  `shopId`         VARCHAR(30)  NOT NULL,
  `shopName`       VARCHAR(255) NOT NULL,
  `month`          INT          NOT NULL,
  `year`           INT          NOT NULL,
  `totalDays`      INT          NOT NULL,
  `holidays`       INT          NOT NULL,
  `absent`         INT          NOT NULL,
  `leave`          INT          NOT NULL DEFAULT 0,
  `quarantine`     INT          NOT NULL DEFAULT 0,
  `workingDays`    INT          NOT NULL,
  `totalLate1Baht` INT          NOT NULL DEFAULT 0,
  `totalLate2Baht` INT          NOT NULL DEFAULT 0,
  `totalDeduction` INT          NOT NULL DEFAULT 0,
  `days`           JSON         NOT NULL,
  `shiftConfig`    JSON         NOT NULL,
  `createdAt`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `monthly_attendance_employeeId_month_year_key` (`employeeId`, `month`, `year`),
  INDEX `monthly_attendance_employeeId_idx` (`employeeId`),
  CONSTRAINT `monthly_attendance_employeeId_fkey`
    FOREIGN KEY (`employeeId`) REFERENCES `employees` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `import_sessions` (
  `id`          VARCHAR(30)  NOT NULL,
  `shopId`      VARCHAR(30)  NOT NULL,
  `month`       INT          NOT NULL,
  `year`        INT          NOT NULL,
  `importedAt`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `fileName`    VARCHAR(255) NOT NULL,
  `recordCount` INT          NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bonus_records` (
  `id`                VARCHAR(30)  NOT NULL,
  `shopId`            VARCHAR(30)  NOT NULL,
  `employeeId`        VARCHAR(30)  NOT NULL,
  `empCode`           VARCHAR(255) NOT NULL,
  `empName`           VARCHAR(255) NOT NULL,
  `year`              INT          NOT NULL,
  `photo`             LONGTEXT     NULL,
  `attendanceSummary` JSON         NULL,
  `bonusAmount`       DECIMAL(10,2) NULL,
  `bonusStatus`       VARCHAR(20)  NOT NULL DEFAULT 'pending',
  `bonusNote`         TEXT         NULL,
  `createdAt`         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `bonus_records_emp_year_key` (`employeeId`, `year`),
  INDEX `bonus_records_year_idx` (`shopId`, `year`),
  CONSTRAINT `bonus_records_employeeId_fkey`
    FOREIGN KEY (`employeeId`) REFERENCES `employees` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `behavior_logs` (
  `id`             INT          NOT NULL AUTO_INCREMENT,
  `bonusRecordId`  VARCHAR(30)  NOT NULL,
  `type`           VARCHAR(10)  NOT NULL DEFAULT 'good' COMMENT 'good or bad',
  `date`           VARCHAR(10)  NULL,
  `description`    TEXT         NOT NULL,
  `createdAt`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `behavior_logs_bonusRecordId_idx` (`bonusRecordId`),
  CONSTRAINT `behavior_logs_bonusRecordId_fkey`
    FOREIGN KEY (`bonusRecordId`) REFERENCES `bonus_records` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrate: add type column if not exists (for existing installations)
ALTER TABLE `behavior_logs` ADD COLUMN IF NOT EXISTS `type` VARCHAR(10) NOT NULL DEFAULT 'good' COMMENT 'good or bad' AFTER `bonusRecordId`;
