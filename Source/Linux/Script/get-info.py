import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime
import sqlite3
import time
import os

cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

DB_PATH = "users.db"


if not os.path.exists(DB_PATH):
    print("Creating new SQLite database...")
conn = sqlite3.connect(DB_PATH, check_same_thread=False)
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    account TEXT NOT NULL,
    role TEXT NOT NULL,
    processed INTEGER DEFAULT 0,
    created_at TEXT
)
""")
conn.commit()
print("SQLite connected at", DB_PATH)



# HÀM LƯU DỮ LIỆU VÀO SQLITE

def save_to_sqlite(user_id, account, role):
    created_at = datetime.now().isoformat()
    cursor.execute("""
        INSERT OR REPLACE INTO users (id, account, role, processed, created_at)
        VALUES (?, ?, ?, ?, ?)
    """, (user_id, account, role, 1, created_at))
    conn.commit()
    print(f"Saved '{account}' ({role}) into SQLite")



# HÀM XỬ LÝ FIRESTORE SNAPSHOT

def on_snapshot(col_snapshot, changes, read_time):
    for change in changes:
        data = change.document.to_dict()
        doc_id = change.document.id

        # Nếu user chưa xử lý thì tiến hành xử lý
        if not data.get("processed", False):
            account = data.get("account")
            role = data.get("role")

            print(f"\nNew user or didn't process")
            print(f"Account: {account}")
            print(f"Role: {role}")

            # Lưu vào SQLite
            save_to_sqlite(doc_id, account, role)

            # Cập nhật lại processed trên Firestore
            db.collection("users").document(doc_id).update({
                "processed": True,
                "processedAt": datetime.now().isoformat()
            })

            print(f"Updated with processed=True for {account}")
        else:
            print(f"User {data.get('account')} processed")


print("Listening for new or unprocessed users in Firestore...")

query = db.collection("users").where("processed", "==", False)
query.on_snapshot(on_snapshot)

while True:
    time.sleep(1)
