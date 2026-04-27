import os
from dotenv import load_dotenv
import pymysql

load_dotenv()

DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = int(os.getenv('DB_PORT', 3306))
DB_USER = os.getenv('DB_USER', 'root')
DB_PASSWORD = os.getenv('DB_PASSWORD', '')
DB_NAME = os.getenv('DB_NAME', 'leadflow')

print("Starting DB Phase 5 Update (Faturamento, Vendas, Crypto)...")

conn = pymysql.connect(host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASSWORD, database=DB_NAME, cursorclass=pymysql.cursors.DictCursor)

with conn.cursor() as cur:
    # 1. Tabela de Produtos (Catálogo do Admin)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS products (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 2. Tabela de Informações Sensíveis de Faturamento (Criptografado)
    # MySQL usará AES_ENCRYPT, que retorna binário (VARBINARY)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS lead_billing_info (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        lead_id INT UNSIGNED NOT NULL,
        cpf_encrypted VARBINARY(255),
        address_encrypted VARBINARY(512),
        city_encrypted VARBINARY(255),
        state_encrypted VARBINARY(255),
        zipcode_encrypted VARBINARY(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY(lead_id),
        FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    )
    """)

    # 3. Tabela de Vendas
    cur.execute("""
    CREATE TABLE IF NOT EXISTS sales (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        lead_id INT UNSIGNED NOT NULL,
        vendor_id INT UNSIGNED,
        total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        status ENUM('pendente_faturamento', 'faturado', 'enviado') DEFAULT 'pendente_faturamento',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
        FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
    )
    """)

    # 4. Itens da Venda
    cur.execute("""
    CREATE TABLE IF NOT EXISTS sale_items (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        sale_id INT UNSIGNED NOT NULL,
        product_id INT UNSIGNED,
        product_name VARCHAR(255) NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        total_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    )
    """)
    
    # Check if 'billing' role exists in users table schema, but role is just a VARCHAR in this app
    # In schema.sql: role ENUM('admin', 'vendor', 'sdr') DEFAULT 'vendor'
    # I need to alter the ENUM to include 'billing'
    try:
        cur.execute("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'vendor', 'sdr', 'billing') DEFAULT 'vendor'")
    except Exception as e:
        print(f"Role alter info (safe to ignore if already done): {e}")

    conn.commit()

print("DB Phase 5 Update Complete!")
