from database import execute
import sys

try:
    print("Creating audit_logs table...")
    execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            user_id INT UNSIGNED,
            action VARCHAR(255) NOT NULL,
            target_id INT UNSIGNED,
            details TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB
    """)
    
    print("Creating settings table...")
    execute("""
        CREATE TABLE IF NOT EXISTS settings (
            `key` VARCHAR(50) PRIMARY KEY,
            `value` TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB
    """)
    
    print("Inserting default goal...")
    execute("INSERT IGNORE INTO settings (`key`, `value`) VALUES ('sales_goal', '50')")
    
    print("Database updated successfully!")
except Exception as e:
    print(f"Error updating database: {e}")
    sys.exit(1)
