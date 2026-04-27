-- ============================================================
-- LeadFlow 2.0 — Schema Completo
-- Consolidado com todas as migrações (phase 4, 5, 6, links, etc.)
-- ============================================================

CREATE DATABASE IF NOT EXISTS leadflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE leadflow;

-- -----------------------------------------------
-- 1. Usuários
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(200) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','vendor','sdr','billing') DEFAULT 'vendor',
  active TINYINT(1) DEFAULT 1,
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email)
) ENGINE=InnoDB;

-- -----------------------------------------------
-- 2. Tokens de Autenticação
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS auth_tokens (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  token VARCHAR(512) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_token_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token(64))
) ENGINE=InnoDB;

-- -----------------------------------------------
-- 3. Status do Lead (Funil)
-- -----------------------------------------------
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

-- -----------------------------------------------
-- 4. Plataformas de Origem
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS platforms (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#3b82f6',
  icon VARCHAR(10) DEFAULT '📱',
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -----------------------------------------------
-- 5. Vendedores (Closers / SDRs)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS vendors (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  user_id INT UNSIGNED,
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_vendor_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- -----------------------------------------------
-- 6. Leads
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(200),
  platform_id INT UNSIGNED,
  sdr_id INT UNSIGNED,
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
  CONSTRAINT fk_lead_sdr FOREIGN KEY (sdr_id) REFERENCES vendors(id) ON DELETE SET NULL,
  CONSTRAINT fk_lead_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL,
  CONSTRAINT fk_lead_status FOREIGN KEY (status_id) REFERENCES lead_statuses(id) ON DELETE SET NULL,
  INDEX idx_platform (platform_id),
  INDEX idx_sdr (sdr_id),
  INDEX idx_vendor (vendor_id),
  INDEX idx_status (status_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB;

-- -----------------------------------------------
-- 7. Atividades / Histórico do Lead
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS lead_activities (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  lead_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED,
  type ENUM('status_change','note','contact','created','audio','transfer','link_click') DEFAULT 'note',
  content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_act_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  CONSTRAINT fk_act_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_act_lead (lead_id)
) ENGINE=InnoDB;

-- -----------------------------------------------
-- 8. Links Rastreáveis
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS tracked_links (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  lead_id INT UNSIGNED NOT NULL,
  slug VARCHAR(20) NOT NULL UNIQUE,
  original_url TEXT NOT NULL,
  clicks INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_link_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------
-- 9. Logs de Auditoria
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED,
  action VARCHAR(255) NOT NULL,
  target_id INT UNSIGNED,
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- -----------------------------------------------
-- 10. Configurações Globais
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  `key` VARCHAR(50) PRIMARY KEY,
  `value` TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -----------------------------------------------
-- 11. Catálogo de Produtos
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -----------------------------------------------
-- 12. Informações de Faturamento do Lead (Criptografadas)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS lead_billing_info (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  lead_id INT UNSIGNED NOT NULL,
  cpf_encrypted VARBINARY(255),
  address_encrypted VARBINARY(512),
  city_encrypted VARBINARY(255),
  state_encrypted VARBINARY(255),
  zipcode_encrypted VARBINARY(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_billing_lead (lead_id),
  CONSTRAINT fk_billing_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------
-- 13. Vendas (Sales)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS sales (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  lead_id INT UNSIGNED NOT NULL,
  vendor_id INT UNSIGNED,
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  final_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  status ENUM('pendente_faturamento', 'faturado', 'enviado') DEFAULT 'pendente_faturamento',
  payment_method ENUM('pix', 'credit_card', 'boleto', 'transfer') DEFAULT 'pix',
  installments INT DEFAULT 1,
  discount DECIMAL(10, 2) DEFAULT 0.00,
  observations TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sale_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  CONSTRAINT fk_sale_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- -----------------------------------------------
-- 14. Itens da Venda
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS sale_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sale_id INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED,
  product_name VARCHAR(255) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  total_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  CONSTRAINT fk_item_sale FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  CONSTRAINT fk_item_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- DADOS INICIAIS (Seeds)
-- ============================================================

-- Status padrão do funil
INSERT IGNORE INTO lead_statuses (id, name, color, sort_order, is_default, is_final) VALUES
  (1,'Novo','#3b82f6',1,1,0),(2,'Em Contato','#f59e0b',2,0,0),
  (3,'Qualificado','#8b5cf6',3,0,0),(4,'Proposta','#06b6d4',4,0,0),
  (5,'Convertido','#22c55e',5,0,1),(6,'Perdido','#ef4444',6,0,1);

-- Plataformas de origem
INSERT IGNORE INTO platforms (name, color, icon) VALUES
  ('YouTube','#ff0000','▶'),('Instagram','#e1306c','📷'),
  ('Kwai','#ff6900','🎬'),('TikTok','#010101','🎵'),
  ('Facebook','#1877f2','👍'),('Indicação','#22c55e','🤝'),('Outros','#64748b','🔗');

-- Configuração padrão: meta de vendas
INSERT IGNORE INTO settings (`key`, `value`) VALUES ('sales_goal', '50');
