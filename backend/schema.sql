CREATE DATABASE IF NOT EXISTS leadflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE leadflow;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(200) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','vendor') DEFAULT 'vendor',
  active TINYINT(1) DEFAULT 1,
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS auth_tokens (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  token VARCHAR(512) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_token_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token(64))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lead_statuses (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  color VARCHAR(7) DEFAULT '#64748b',
  sort_order INT DEFAULT 0,
  is_default TINYINT(1) DEFAULT 0,
  is_final TINYINT(1) DEFAULT 0,
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS platforms (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#3b82f6',
  icon VARCHAR(10) DEFAULT '📱',
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS vendors (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  user_id INT UNSIGNED,
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_vendor_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS leads (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(200),
  platform_id INT UNSIGNED,
  vendor_id INT UNSIGNED,
  status_id INT UNSIGNED,
  specific_video VARCHAR(300),
  follow_time ENUM('menos_1_mes','1_3_meses','3_6_meses','mais_6_meses','nao_acompanha') DEFAULT 'nao_acompanha',
  interest VARCHAR(300),
  notes TEXT,
  next_contact DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_lead_platform FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE SET NULL,
  CONSTRAINT fk_lead_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL,
  CONSTRAINT fk_lead_status FOREIGN KEY (status_id) REFERENCES lead_statuses(id) ON DELETE SET NULL,
  INDEX idx_platform (platform_id),
  INDEX idx_vendor (vendor_id),
  INDEX idx_status (status_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lead_activities (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  lead_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED,
  type ENUM('status_change','note','contact','created','audio') DEFAULT 'note',
  content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_act_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  CONSTRAINT fk_act_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_act_lead (lead_id)
) ENGINE=InnoDB;

INSERT IGNORE INTO lead_statuses (id, name, color, sort_order, is_default, is_final) VALUES
  (1,'Novo','#3b82f6',1,1,0),(2,'Em Contato','#f59e0b',2,0,0),
  (3,'Qualificado','#8b5cf6',3,0,0),(4,'Proposta','#06b6d4',4,0,0),
  (5,'Convertido','#22c55e',5,0,1),(6,'Perdido','#ef4444',6,0,1);

INSERT IGNORE INTO platforms (name, color, icon) VALUES
  ('YouTube','#ff0000','▶'),('Instagram','#e1306c','📷'),
  ('Kwai','#ff6900','🎬'),('TikTok','#010101','🎵'),
  ('Facebook','#1877f2','👍'),('Indicação','#22c55e','🤝'),('Outros','#64748b','🔗');
