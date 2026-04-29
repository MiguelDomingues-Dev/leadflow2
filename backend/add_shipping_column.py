import pymysql
import os
from dotenv import load_dotenv

def migrate():
    load_dotenv()
    conn = pymysql.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASSWORD', ''),
        database=os.getenv('DB_NAME', 'leadflow'),
        cursorclass=pymysql.cursors.DictCursor
    )
    try:
        with conn.cursor() as cur:
            # Add shipping_cost to sales
            print("Checking sales table...")
            cur.execute("DESCRIBE sales")
            columns = [row['Field'] for row in cur.fetchall()]
            if 'shipping_cost' not in columns:
                print("Adding shipping_cost to sales...")
                cur.execute("ALTER TABLE sales ADD COLUMN shipping_cost DECIMAL(10, 2) DEFAULT 0.00 AFTER discount")
            
            # Add full_name_encrypted to lead_billing_info
            print("Checking lead_billing_info table...")
            cur.execute("DESCRIBE lead_billing_info")
            columns = [row['Field'] for row in cur.fetchall()]
            if 'full_name_encrypted' not in columns:
                print("Adding full_name_encrypted to lead_billing_info...")
                cur.execute("ALTER TABLE lead_billing_info ADD COLUMN full_name_encrypted VARBINARY(255) AFTER lead_id")
            
        conn.commit()
        print("Migration completed successfully!")
    except Exception as e:
        print(f"Error during migration: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
