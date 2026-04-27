"""Quick fix: add missing columns to sales table"""
from dotenv import load_dotenv
import os, pymysql

load_dotenv()

conn = pymysql.connect(
    host=os.getenv('DB_HOST', 'localhost'),
    port=int(os.getenv('DB_PORT', 3306)),
    user=os.getenv('DB_USER', 'root'),
    password=os.getenv('DB_PASSWORD', ''),
    database=os.getenv('DB_NAME', 'leadflow'),
    cursorclass=pymysql.cursors.DictCursor
)

with conn.cursor() as cur:
    try:
        cur.execute('SELECT final_amount FROM sales LIMIT 1')
        print('Column final_amount already exists.')
    except Exception as e:
        print(f'Column missing: {e}')
        cur.execute("""
            ALTER TABLE sales 
            ADD COLUMN payment_method ENUM('pix', 'credit_card', 'boleto', 'transfer') DEFAULT 'pix',
            ADD COLUMN installments INT DEFAULT 1,
            ADD COLUMN discount DECIMAL(10,2) DEFAULT 0.00,
            ADD COLUMN final_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER total_amount,
            ADD COLUMN observations TEXT NULL
        """)
        cur.execute('UPDATE sales SET final_amount = total_amount')
        conn.commit()
        print('Columns added successfully!')

conn.close()
print('Done.')
