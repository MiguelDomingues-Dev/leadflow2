import mysql.connector
from dotenv import load_dotenv
import os

load_dotenv()

def main():
    try:
        conn = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASS', 'Dbmy#26dev'),
            database=os.getenv('DB_NAME', 'leadflow')
        )
        cur = conn.cursor()
        
        # Add new columns to sales table
        try:
            cur.execute("""
                ALTER TABLE sales 
                ADD COLUMN payment_method ENUM('pix', 'credit_card', 'boleto') DEFAULT 'pix',
                ADD COLUMN installments INT DEFAULT 1,
                ADD COLUMN discount DECIMAL(10,2) DEFAULT 0.00,
                ADD COLUMN final_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER total_amount,
                ADD COLUMN observations TEXT NULL
            """)
            print("Successfully added payment columns to sales table.")
        except mysql.connector.Error as e:
            if e.errno == 1060:
                print("Columns already exist in sales table.")
            else:
                print(f"Error adding columns: {e}")
                
        # Initialize final_amount = total_amount for existing sales
        cur.execute("UPDATE sales SET final_amount = total_amount WHERE final_amount = 0.00 OR final_amount IS NULL")
        
        conn.commit()
        print("Database update phase 6 completed successfully.")
        
    except Exception as e:
        print(f"Database connection error: {e}")
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    main()
