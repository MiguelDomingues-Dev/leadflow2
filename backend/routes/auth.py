from flask import Blueprint, request, jsonify, g
from database import query, execute, log_audit
from auth_middleware import login_required
from werkzeug.security import generate_password_hash, check_password_hash
import secrets
from datetime import datetime, timedelta

auth_bp = Blueprint('auth', __name__)

def create_token(user_id):
    token = secrets.token_urlsafe(48)
    expires = datetime.now() + timedelta(days=7)
    execute("INSERT INTO auth_tokens (user_id, token, expires_at) VALUES (%s,%s,%s)", (user_id, token, expires))
    return token

@auth_bp.route('/login', methods=['POST'])
def login():
    d = request.json or {}
    email    = d.get('email','').strip().lower()
    password = d.get('password','')
    if not email or not password:
        return jsonify({'error': 'E-mail e senha sao obrigatorios'}), 400
    user = query("SELECT * FROM users WHERE email=%s AND active=1", (email,), fetchone=True)
    if not user or not check_password_hash(user['password_hash'], password):
        return jsonify({'error': 'E-mail ou senha incorretos'}), 401
    execute("DELETE FROM auth_tokens WHERE user_id=%s AND expires_at < NOW()", (user['id'],))
    token = create_token(user['id'])
    execute("UPDATE users SET last_login=NOW() WHERE id=%s", (user['id'],))
    log_audit(user['id'], 'login')
    return jsonify({'token': token, 'user': {'id': user['id'], 'name': user['name'], 'email': user['email'], 'role': user['role']}})

@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    token = request.headers.get('Authorization','')[7:]
    execute("DELETE FROM auth_tokens WHERE token=%s", (token,))
    return jsonify({'message': 'Logout realizado'})

@auth_bp.route('/me', methods=['GET'])
@login_required
def me():
    u = g.user
    vendor = query("SELECT id, name FROM vendors WHERE user_id=%s AND active=1", (u['id'],), fetchone=True)
    return jsonify({'id': u['id'], 'name': u['name'], 'email': u['email'], 'role': u['role'], 'vendor_id': vendor['id'] if vendor else None})

@auth_bp.route('/setup', methods=['POST'])
def setup():
    count = query("SELECT COUNT(*) AS n FROM users", fetchone=True)['n']
    if count > 0:
        return jsonify({'error': 'Setup ja realizado'}), 409
    d = request.json or {}
    hashed = generate_password_hash(d.get('password','admin123'))
    uid = execute("INSERT INTO users (name, email, password_hash, role) VALUES (%s,%s,%s,'admin')",
                  (d.get('name','Administrador'), d.get('email','admin@leadflow.com'), hashed))
    return jsonify({'message': 'Admin criado', 'token': create_token(uid)}), 201

@auth_bp.route('/change-password', methods=['PUT'])
@login_required
def change_password():
    d = request.json or {}
    if len(d.get('new_password','')) < 6:
        return jsonify({'error': 'Senha deve ter pelo menos 6 caracteres'}), 400
    user = query("SELECT * FROM users WHERE id=%s", (g.user['id'],), fetchone=True)
    if not check_password_hash(user['password_hash'], d.get('current_password','')):
        return jsonify({'error': 'Senha atual incorreta'}), 401
    execute("UPDATE users SET password_hash=%s WHERE id=%s",
            (generate_password_hash(d['new_password']), g.user['id']))
    log_audit(g.user['id'], 'change_password')
    return jsonify({'message': 'Senha atualizada'})
