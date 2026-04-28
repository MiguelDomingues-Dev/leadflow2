import os
from dotenv import load_dotenv
import pymysql

load_dotenv()

DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = int(os.getenv('DB_PORT', 3306))
DB_USER = os.getenv('DB_USER', 'root')
DB_PASSWORD = os.getenv('DB_PASSWORD', '')
DB_NAME = os.getenv('DB_NAME', 'leadflow')

print("Starting DB Phase 8 Update (Sales Overhaul)...")

conn = pymysql.connect(host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASSWORD, database=DB_NAME, cursorclass=pymysql.cursors.DictCursor)

def column_exists(cursor, table, column):
    cursor.execute(f"SHOW COLUMNS FROM {table} LIKE '{column}'")
    return cursor.fetchone() is not None

with conn.cursor() as cur:
    # 1. Atualizar tabela sales
    if not column_exists(cur, 'sales', 'amount_paid'):
        cur.execute("ALTER TABLE sales ADD COLUMN amount_paid DECIMAL(10, 2) DEFAULT 0.00")
        print("Added amount_paid to sales.")
        
    if not column_exists(cur, 'sales', 'remaining_balance'):
        cur.execute("ALTER TABLE sales ADD COLUMN remaining_balance DECIMAL(10, 2) DEFAULT 0.00")
        print("Added remaining_balance to sales.")
        cur.execute("UPDATE sales SET amount_paid = final_amount, remaining_balance = 0.00")
        
    # 2. Atualizar tabela sale_items
    if not column_exists(cur, 'sale_items', 'discount'):
        cur.execute("ALTER TABLE sale_items ADD COLUMN discount DECIMAL(10, 2) DEFAULT 0.00")
        print("Added discount to sale_items.")
        
    if not column_exists(cur, 'sale_items', 'is_freebie'):
        cur.execute("ALTER TABLE sale_items ADD COLUMN is_freebie TINYINT(1) DEFAULT 0")
        print("Added is_freebie to sale_items.")

    # 3. Criar tabela sale_reminders
    cur.execute("""
    CREATE TABLE IF NOT EXISTS sale_reminders (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        sale_id INT UNSIGNED NOT NULL,
        user_id INT UNSIGNED,
        due_date DATETIME NOT NULL,
        amount_due DECIMAL(10, 2) NOT NULL,
        status ENUM('pendente', 'pago') DEFAULT 'pendente',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_reminder_sale FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
        CONSTRAINT fk_reminder_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_due_date (due_date)
    ) ENGINE=InnoDB
    """)
    print("Created sale_reminders table.")

    conn.commit()

print("DB Phase 8 Update Complete!")
