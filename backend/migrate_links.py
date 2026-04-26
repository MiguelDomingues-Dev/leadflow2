from database import execute

def setup():
    try:
        # Create tracked_links table
        execute("""
            CREATE TABLE IF NOT EXISTS tracked_links (
                id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                lead_id INT UNSIGNED NOT NULL,
                slug VARCHAR(20) NOT NULL UNIQUE,
                original_url TEXT NOT NULL,
                clicks INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_link_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
            ) ENGINE=InnoDB
        """)
        print("Table tracked_links created or already exists.")

        # Update lead_activities type
        execute("ALTER TABLE lead_activities MODIFY COLUMN type ENUM('status_change','note','contact','created','audio','link_click') DEFAULT 'note'")
        print("Updated lead_activities type enum.")

    except Exception as e:
        print(f"Error during setup: {e}")

if __name__ == "__main__":
    setup()
