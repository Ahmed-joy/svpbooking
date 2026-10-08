-- EXBD / RWAS schema for MySQL (phpMyAdmin > Import). Safe to re-run.
SET NAMES utf8mb4; SET FOREIGN_KEY_CHECKS=0;

CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `first_name` VARCHAR(255) NOT NULL, `last_name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL, `company_name` VARCHAR(255) NULL, `phone` VARCHAR(255) NULL,
  `password` VARCHAR(255) NOT NULL, `remember_token` VARCHAR(100) NULL, `email_verified_at` TIMESTAMP NULL,
  `role` ENUM('client','admin','staff') NOT NULL DEFAULT 'client',
  `address` VARCHAR(255) NULL, `address2` VARCHAR(255) NULL, `city` VARCHAR(255) NULL, `state` VARCHAR(255) NULL,
  `country` VARCHAR(255) NOT NULL DEFAULT 'Bangladesh', `postcode` VARCHAR(255) NULL, `tax_id` VARCHAR(255) NULL,
  `tax_exempt` ENUM('yes','no') NOT NULL DEFAULT 'no',
  `credit_balance` DECIMAL(10,2) NOT NULL DEFAULT 0.00, `currency` VARCHAR(3) NOT NULL DEFAULT 'USD',
  `status` ENUM('active','inactive','suspended','closed') NOT NULL DEFAULT 'active',
  `language` VARCHAR(255) NOT NULL DEFAULT 'en', `email_opt_in` ENUM('yes','no') NOT NULL DEFAULT 'yes',
  `ip_address` VARCHAR(255) NULL, `last_login_ip` VARCHAR(255) NULL, `last_login_at` TIMESTAMP NULL,
  `admin_notes` TEXT NULL, `contact_id_at_provider` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL, `deleted_at` TIMESTAMP NULL,
  UNIQUE KEY `users_email_unique` (`email`), KEY `users_status_index` (`status`), KEY `users_created_at_index` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `password_reset_tokens` (`email` VARCHAR(255) PRIMARY KEY, `token` VARCHAR(255) NOT NULL, `created_at` TIMESTAMP NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS `sessions` (`id` VARCHAR(255) PRIMARY KEY, `user_id` BIGINT UNSIGNED NULL, `ip_address` VARCHAR(45) NULL, `user_agent` TEXT NULL, `payload` LONGTEXT NOT NULL, `last_activity` INT NOT NULL, KEY (`user_id`), KEY (`last_activity`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS `cache` (`key` VARCHAR(255) PRIMARY KEY, `value` MEDIUMTEXT NOT NULL, `expiration` INT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS `cache_locks` (`key` VARCHAR(255) PRIMARY KEY, `owner` VARCHAR(255) NOT NULL, `expiration` INT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS `jobs` (`id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, `queue` VARCHAR(255) NOT NULL, `payload` LONGTEXT NOT NULL, `attempts` TINYINT UNSIGNED NOT NULL, `reserved_at` INT UNSIGNED NULL, `available_at` INT UNSIGNED NOT NULL, `created_at` INT UNSIGNED NOT NULL, KEY (`queue`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS `job_batches` (`id` VARCHAR(255) PRIMARY KEY, `name` VARCHAR(255) NOT NULL, `total_jobs` INT NOT NULL, `pending_jobs` INT NOT NULL, `failed_jobs` INT NOT NULL, `failed_job_ids` LONGTEXT NOT NULL, `options` MEDIUMTEXT NULL, `cancelled_at` INT NULL, `created_at` INT NOT NULL, `finished_at` INT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS `failed_jobs` (`id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, `uuid` VARCHAR(255) NOT NULL UNIQUE, `connection` TEXT NOT NULL, `queue` TEXT NOT NULL, `payload` LONGTEXT NOT NULL, `exception` LONGTEXT NOT NULL, `failed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS `personal_access_tokens` (`id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, `tokenable_type` VARCHAR(255) NOT NULL, `tokenable_id` BIGINT UNSIGNED NOT NULL, `name` VARCHAR(255) NOT NULL, `token` VARCHAR(64) NOT NULL UNIQUE, `abilities` TEXT NULL, `last_used_at` TIMESTAMP NULL, `expires_at` TIMESTAMP NULL, `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL, KEY (`tokenable_type`,`tokenable_id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `credentials` (`id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, `user_id` BIGINT UNSIGNED NOT NULL, `email` VARCHAR(255) NOT NULL, `password` TEXT NULL, `reference` VARCHAR(255) NULL, `token` TEXT NULL, `name` VARCHAR(255) NULL, `passport` VARCHAR(255) NULL, `phone_number` VARCHAR(255) NULL, `passport_url` TEXT NULL, `profile_photo_url` TEXT NULL, `expires_at` TIMESTAMP NULL, `status` VARCHAR(50) NULL, `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL, KEY (`user_id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS `pacc_credentials` LIKE `credentials`;

CREATE TABLE IF NOT EXISTS `cards` (`id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, `user_id` BIGINT UNSIGNED NOT NULL, `card_name` VARCHAR(255) NULL, `holder_name` VARCHAR(255) NULL, `card_number` TEXT NULL, `cvv` TEXT NULL, `expiry_month` VARCHAR(10) NULL, `expiry_year` VARCHAR(10) NULL, `notes` TEXT NULL, `is_active` TINYINT(1) NOT NULL DEFAULT 1, `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL, KEY (`user_id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `exam_bookings` (`id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, `user_id` BIGINT UNSIGNED NOT NULL, `credential_id` BIGINT UNSIGNED NULL, `booking_id` VARCHAR(255) NULL, `occupation` VARCHAR(255) NULL, `city` VARCHAR(255) NULL, `test_center_id` VARCHAR(255) NULL, `available_date` DATE NULL, `exam_language` VARCHAR(255) NULL, `exam_session` VARCHAR(255) NULL, `card_id` BIGINT UNSIGNED NULL, `payment_status` VARCHAR(50) NOT NULL DEFAULT 'pending', `amount` DECIMAL(10,2) NULL, `notes` TEXT NULL, `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL, KEY (`user_id`), KEY (`credential_id`), KEY (`payment_status`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `credit_transactions` (`id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, `user_id` BIGINT UNSIGNED NOT NULL, `amount` DECIMAL(10,2) NOT NULL, `balance_after` DECIMAL(10,2) NULL, `type` VARCHAR(50) NULL, `note` TEXT NULL, `admin_id` BIGINT UNSIGNED NULL, `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL, KEY (`user_id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS `credit_packages` (`id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, `name` VARCHAR(255) NOT NULL, `credits` INT NOT NULL DEFAULT 0, `price` DECIMAL(10,2) NOT NULL DEFAULT 0, `is_active` TINYINT(1) NOT NULL DEFAULT 1, `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS `payment_gateways` (`id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, `name` VARCHAR(255) NOT NULL, `account_number` VARCHAR(255) NULL, `account_holder` VARCHAR(255) NULL, `instructions` TEXT NULL, `qr_image` VARCHAR(255) NULL, `is_active` TINYINT(1) NOT NULL DEFAULT 1, `sort_order` INT NOT NULL DEFAULT 0, `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS `credit_orders` (`id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, `user_id` BIGINT UNSIGNED NOT NULL, `payment_gateway_id` BIGINT UNSIGNED NULL, `credit_package_id` BIGINT UNSIGNED NULL, `credits` INT NOT NULL DEFAULT 0, `amount` DECIMAL(10,2) NOT NULL DEFAULT 0, `transaction_id` VARCHAR(255) NULL, `screenshot` VARCHAR(255) NULL, `status` VARCHAR(50) NOT NULL DEFAULT 'pending', `admin_notes` TEXT NULL, `approved_at` TIMESTAMP NULL, `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL, KEY (`user_id`), KEY (`status`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `test_centers` (`id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, `center_id` VARCHAR(255) NULL, `name` VARCHAR(255) NULL, `address` TEXT NULL, `city` VARCHAR(255) NULL, `country_code` VARCHAR(10) NULL, `phone` VARCHAR(255) NULL, `email` VARCHAR(255) NULL, `latitude` VARCHAR(50) NULL, `longitude` VARCHAR(50) NULL, `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS `exam_sessions` (`id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, `session` VARCHAR(255) NULL, `test_center_id` VARCHAR(255) NULL, `date` DATE NULL, `time` VARCHAR(50) NULL, `language` VARCHAR(50) NULL, `available_seats` INT NULL, `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS `occupations` (`id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, `name` VARCHAR(255) NULL, `category_id` VARCHAR(255) NULL, `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS `occupation_cities` (`id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, `occupation_id` BIGINT UNSIGNED NULL, `city` VARCHAR(255) NULL, `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS `occupation_languages` (`id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, `category_id` VARCHAR(255) NULL, `language_name` VARCHAR(255) NULL, `language_code` VARCHAR(20) NULL, `prometric_code` VARCHAR(50) NULL, `is_active` TINYINT(1) NOT NULL DEFAULT 1, `created_at` TIMESTAMP NULL, `updated_at` TIMESTAMP NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS=1;
