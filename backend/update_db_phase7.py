import os
from dotenv import load_dotenv
import pymysql

load_dotenv()

DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = int(os.getenv('DB_PORT', 3306))
DB_USER = os.getenv('DB_USER', 'root')
DB_PASSWORD = os.getenv('DB_PASSWORD', '')
DB_NAME = os.getenv('DB_NAME', 'leadflow')

print("Starting DB Phase 7 Update (Goals, Attachments, Pipelines, Custom Fields)...")

conn = pymysql.connect(host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASSWORD, database=DB_NAME, cursorclass=pymysql.cursors.DictCursor)

def column_exists(cursor, table, column):
    cursor.execute(f"SHOW COLUMNS FROM {table} LIKE '{column}'")
    return cursor.fetchone() is not None

with conn.cursor() as cur:
    # 1. Metas Individuais (Users)
    if not column_exists(cur, 'users', 'monthly_goal'):
        cur.execute("ALTER TABLE users ADD COLUMN monthly_goal INT DEFAULT 0")
        print("Added monthly_goal to users.")

    # 2. Agenda Avançada (Datetime em leads.next_contact)
    cur.execute("ALTER TABLE leads MODIFY COLUMN next_contact DATETIME NULL")
    print("Modified next_contact to DATETIME in leads.")

    # 3. Pipelines (Múltiplos Funis)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS pipelines (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        is_default TINYINT(1) DEFAULT 0,
        active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
    """)
    print("Created pipelines table.")

    # Inserir funil padrão se não existir
    cur.execute("SELECT id FROM pipelines WHERE is_default=1 LIMIT 1")
    default_pipe = cur.fetchone()
    if not default_pipe:
        cur.execute("INSERT INTO pipelines (name, is_default) VALUES ('Vendas Padrão', 1)")
        pipe_id = cur.lastrowid
        print("Created default pipeline.")
    else:
        pipe_id = default_pipe['id']

    # Adicionar pipeline_id aos status
    if not column_exists(cur, 'lead_statuses', 'pipeline_id'):
        cur.execute("ALTER TABLE lead_statuses ADD COLUMN pipeline_id INT UNSIGNED")
        cur.execute("UPDATE lead_statuses SET pipeline_id = %s", (pipe_id,))
        cur.execute("ALTER TABLE lead_statuses ADD CONSTRAINT fk_status_pipeline FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE")
        print("Added pipeline_id to lead_statuses.")

    # Adicionar pipeline_id aos leads
    if not column_exists(cur, 'leads', 'pipeline_id'):
        cur.execute("ALTER TABLE leads ADD COLUMN pipeline_id INT UNSIGNED")
        cur.execute("UPDATE leads SET pipeline_id = %s", (pipe_id,))
        cur.execute("ALTER TABLE leads ADD CONSTRAINT fk_lead_pipeline FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE SET NULL")
        print("Added pipeline_id to leads.")

    # 4. Anexos
    cur.execute("""
    CREATE TABLE IF NOT EXISTS attachments (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        lead_id INT UNSIGNED NULL,
        sale_id INT UNSIGNED NULL,
        file_name VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_size INT NOT NULL DEFAULT 0,
        file_type VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_attach_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
        CONSTRAINT fk_attach_sale FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
    """)
    print("Created attachments table.")

    # 5. Campos Dinâmicos (Custom Fields)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS custom_fields (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        type ENUM('text', 'number', 'date', 'select') DEFAULT 'text',
        options JSON NULL,
        active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
    """)
    print("Created custom_fields table.")

    cur.execute("""
    CREATE TABLE IF NOT EXISTS lead_custom_fields (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        lead_id INT UNSIGNED NOT NULL,
        field_id INT UNSIGNED NOT NULL,
        value TEXT NULL,
        UNIQUE KEY uk_lead_field (lead_id, field_id),
        CONSTRAINT fk_lcf_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
        CONSTRAINT fk_lcf_field FOREIGN KEY (field_id) REFERENCES custom_fields(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
    """)
    print("Created lead_custom_fields table.")

    conn.commit()

print("DB Phase 7 Update Complete!")
