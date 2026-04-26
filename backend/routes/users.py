from flask import Blueprint, request, jsonify, g
from database import query, execute
from auth_middleware import login_required, admin_required
from werkzeug.security import generate_password_hash

users_bp = Blueprint('users', __name__)

@users_bp.route('/', methods=['GET'])
@admin_required
def list_users():
    rows = query("""
        SELECT u.id, u.name, u.email, u.role, u.active, u.last_login, u.created_at,
               v.id AS vendor_id, v.name AS vendor_name
        FROM users u
        LEFT JOIN vendors v ON v.user_id = u.id AND v.active = 1
        ORDER BY u.role, u.name
    """)
    return jsonify(rows)

@users_bp.route('/', methods=['POST'])
@admin_required
def create_user():
    d = request.json or {}
    name     = d.get('name','').strip()
    email    = d.get('email','').strip().lower()
    password = d.get('password','')
    role     = d.get('role','vendor')

    if not name or not email or not password:
        return jsonify({'error': 'Nome, e-mail e senha sao obrigatorios'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Senha deve ter pelo menos 6 caracteres'}), 400
    if role not in ('admin','vendor'):
        return jsonify({'error': 'Role invalido'}), 400

    exists = query("SELECT id FROM users WHERE email=%s", (email,), fetchone=True)
    if exists:
        return jsonify({'error': 'E-mail ja cadastrado'}), 409

    uid = execute(
        "INSERT INTO users (name, email, password_hash, role) VALUES (%s,%s,%s,%s)",
        (name, email, generate_password_hash(password), role)
    )

    # Se for vendor, criar o registro em vendors automaticamente
    if role == 'vendor':
        vid = execute("INSERT INTO vendors (name, user_id) VALUES (%s,%s)", (name, uid))

    return jsonify({'id': uid, 'message': 'Usuario criado'}), 201

@users_bp.route('/<int:uid>', methods=['PUT'])
@admin_required
def update_user(uid):
    d = request.json or {}
    # Não permite alterar a si mesmo via essa rota
    fields = []
    params = []
    if d.get('name'):
        fields.append("name=%s"); params.append(d['name'].strip())
    if d.get('email'):
        fields.append("email=%s"); params.append(d['email'].strip().lower())
    if d.get('role') in ('admin','vendor'):
        fields.append("role=%s"); params.append(d['role'])
    if 'active' in d:
        fields.append("active=%s"); params.append(1 if d['active'] else 0)
    if d.get('password') and len(d['password']) >= 6:
        fields.append("password_hash=%s"); params.append(generate_password_hash(d['password']))

    if fields:
        params.append(uid)
        execute(f"UPDATE users SET {','.join(fields)}, updated_at=NOW() WHERE id=%s", params)

    return jsonify({'message': 'Usuario atualizado'})

@users_bp.route('/<int:uid>', methods=['DELETE'])
@admin_required
def delete_user(uid):
    if uid == g.user['id']:
        return jsonify({'error': 'Voce nao pode excluir sua propria conta'}), 400
    execute("UPDATE users SET active=0 WHERE id=%s", (uid,))
    execute("DELETE FROM auth_tokens WHERE user_id=%s", (uid,))
    return jsonify({'message': 'Usuario desativado'})
