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
            # Add actual_shipping_cost to sales
            print("Checking sales table for actual_shipping_cost...")
            cur.execute("DESCRIBE sales")
            columns = [row['Field'] for row in cur.fetchall()]
            if 'actual_shipping_cost' not in columns:
                print("Adding actual_shipping_cost to sales...")
                cur.execute("ALTER TABLE sales ADD COLUMN actual_shipping_cost DECIMAL(10, 2) DEFAULT 0.00 AFTER shipping_cost")
            
        conn.commit()
        print("Migration completed successfully!")
    except Exception as e:
        print(f"Error during migration: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
