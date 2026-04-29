from database import execute, query

def migrate():
    try:
        # Check columns
        cols = query("DESCRIBE sales")
        column_names = [c['Field'] for c in cols]
        
        if 'actual_shipping_cost' not in column_names:
            print("Adding actual_shipping_cost to sales...")
            execute("ALTER TABLE sales ADD COLUMN actual_shipping_cost DECIMAL(10, 2) DEFAULT 0.00 AFTER shipping_cost")
            print("Done.")
        else:
            print("Column already exists.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    migrate()
