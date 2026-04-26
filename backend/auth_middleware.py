from functools import wraps
from flask import request, jsonify, g
from database import query
from datetime import datetime

def get_token():
    auth = request.headers.get('Authorization', '')
    if auth.startswith('Bearer '):
        return auth[7:]
    return request.cookies.get('token', '')

def get_current_user():
    token = get_token()
    if not token:
        return None
    row = query("""
        SELECT u.id, u.name, u.email, u.role, u.active
        FROM auth_tokens t
        JOIN users u ON t.user_id = u.id
        WHERE t.token = %s AND t.expires_at > NOW() AND u.active = 1
    """, (token,), fetchone=True)
    return row

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({'error': 'Não autenticado'}), 401
        g.user = user
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({'error': 'Não autenticado'}), 401
        if user['role'] != 'admin':
            return jsonify({'error': 'Acesso restrito a administradores'}), 403
        g.user = user
        return f(*args, **kwargs)
    return decorated
