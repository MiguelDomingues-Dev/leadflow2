import jwt
import os
from functools import wraps
from flask import request, jsonify
from database import query

SECRET = os.getenv('JWT_SECRET', 'leadflow-secret-change-me')
EXPIRE = int(os.getenv('JWT_EXPIRE_HOURS', 12))

def decode_token(token):
    return jwt.decode(token, SECRET, algorithms=['HS256'])

def get_token():
    auth = request.headers.get('Authorization', '')
    if auth.startswith('Bearer '):
        return auth[7:]
    return None

def require_auth(f):
    """Qualquer usuário autenticado."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = get_token()
        if not token:
            return jsonify({'error': 'Token necessário'}), 401
        try:
            payload = decode_token(token)
            user = query("SELECT id, name, email, role, active FROM users WHERE id=%s",
                         (payload['id'],), fetchone=True)
            if not user or not user['active']:
                return jsonify({'error': 'Usuário inativo ou não encontrado'}), 401
            request.current_user = user
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expirado, faça login novamente'}), 401
        except Exception:
            return jsonify({'error': 'Token inválido'}), 401
        return f(*args, **kwargs)
    return decorated

def require_admin(f):
    """Somente administradores."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = get_token()
        if not token:
            return jsonify({'error': 'Token necessário'}), 401
        try:
            payload = decode_token(token)
            user = query("SELECT id, name, email, role, active FROM users WHERE id=%s",
                         (payload['id'],), fetchone=True)
            if not user or not user['active']:
                return jsonify({'error': 'Usuário inativo'}), 401
            if user['role'] != 'admin':
                return jsonify({'error': 'Acesso restrito a administradores'}), 403
            request.current_user = user
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expirado'}), 401
        except Exception:
            return jsonify({'error': 'Token inválido'}), 401
        return f(*args, **kwargs)
    return decorated
