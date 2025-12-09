from flask import Flask, render_template, request, session, redirect, url_for, jsonify, send_from_directory
import os
import database

app = Flask(__name__)
app.secret_key = 'super_secret_key_for_mini_games_project' # Change this in production
PORT = 8000

# Constants
GAMES_DIR = os.path.join(os.path.dirname(__file__), 'games')

def get_available_games():
    games = []
    if os.path.exists(GAMES_DIR):
        for name in os.listdir(GAMES_DIR):
            path = os.path.join(GAMES_DIR, name)
            if os.path.isdir(path):
                # Prettify name: 'neon-pong' -> 'Neon Pong'
                pretty_name = name.replace('-', ' ').title()
                games.append({'id': name, 'name': pretty_name})
    return games

@app.route('/')
def index():
    if 'username' in session:
        return redirect(url_for('home'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        if username:
            session['username'] = username
            return redirect(url_for('home'))
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('username', None)
    return redirect(url_for('login'))

@app.route('/home')
def home():
    if 'username' not in session:
        return redirect(url_for('login'))
    
    games = get_available_games()
    # Fetch top 10 recent scores globally
    recent_scores = database.get_all_scores(limit=10)
    
    return render_template('home.html', username=session['username'], games=games, scores=recent_scores)

@app.route('/game/<game_id>/')
def play_game(game_id):
    if 'username' not in session:
        return redirect(url_for('login'))
    return send_from_directory(os.path.join(GAMES_DIR, game_id), 'index.html')

@app.route('/game/<game_id>/<path:filename>')
def serve_game_files(game_id, filename):
    return send_from_directory(os.path.join(GAMES_DIR, game_id), filename)

@app.route('/api/score', methods=['POST'])
def save_score():
    data = request.json
    if not data:
        return jsonify({'error': 'No data'}), 400
    
    game_id = data.get('game_id')
    score = data.get('score')
    username = session.get('username')
    
    # If played anonymously (shouldn't happen with our flow but safe to handle)
    if not username:
        username = "Anonymous"
        
    if not game_id or score is None:
         return jsonify({'error': 'Missing game_id or score'}), 400

    ip_address = request.remote_addr
    
    database.add_score(game_id, username, score, ip_address)
    return jsonify({'success': True})

@app.route('/api/top_scores/<game_id>')
def api_top_scores(game_id):
    scores = database.get_top_scores(game_id, limit=10)
    # Convert to list of dicts
    result = [{'player': row[0], 'score': row[1], 'date': row[2]} for row in scores]
    return jsonify(result)

@app.route('/scores')
def view_scores():
    scores = database.get_all_scores(limit=100)
    return render_template('scores.html', scores=scores)

@app.route('/admin_scores')
def admin_scores():
    scores = database.get_admin_scores(limit=100)
    return render_template('admin_scores.html', scores=scores)

if __name__ == "__main__":
    database.init_db()
    print(f"Server running on port {PORT}")
    app.run(host='0.0.0.0', port=PORT, debug=True)
