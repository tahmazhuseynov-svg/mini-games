import sqlite3
import datetime

DB_NAME = "arcade.db"

def init_db():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id TEXT NOT NULL,
            player_name TEXT NOT NULL,
            score INTEGER NOT NULL,
            ip_address TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

def add_score(game_id, player_name, score, ip_address):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("INSERT INTO scores (game_id, player_name, score, ip_address) VALUES (?, ?, ?, ?)",
              (game_id, player_name, score, ip_address))
    conn.commit()
    conn.close()

def get_top_scores(game_id, limit=10):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("SELECT player_name, score, timestamp FROM scores WHERE game_id = ? ORDER BY score DESC, timestamp DESC LIMIT ?", (game_id, limit))
    rows = c.fetchall()
    conn.close()
    return rows

def get_all_games_stats():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("SELECT game_id, COUNT(*), MAX(score) FROM scores GROUP BY game_id")
    rows = c.fetchall()
    conn.close()
    return rows

def get_all_scores(limit=100):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    # Public view: No IP address
    c.execute("SELECT game_id, player_name, score, timestamp FROM scores ORDER BY score DESC, timestamp DESC LIMIT ?", (limit,))
    rows = c.fetchall()
    conn.close()
    return rows

def get_admin_scores(limit=100):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    # Admin view: Includes IP address
    c.execute("SELECT game_id, player_name, score, ip_address, timestamp FROM scores ORDER BY score DESC, timestamp DESC LIMIT ?", (limit,))
    rows = c.fetchall()
    conn.close()
    return rows

if __name__ == "__main__":
    init_db()
