from flask import Blueprint, request, jsonify
from database import query, execute
from auth_middleware import login_required, admin_required

vendors_bp = Blueprint('vendors', __name__)

@vendors_bp.route('/', methods=['GET'])
@login_required
def list_vendors():
    sql = """
        SELECT v.*, u.role 
        FROM vendors v
        LEFT JOIN users u ON v.user_id = u.id
        WHERE v.active=1 
        ORDER BY v.name ASC
    """
    return jsonify(query(sql))

@vendors_bp.route('/', methods=['POST'])
@admin_required
def create_vendor():
    d = request.json or {}
    if not d.get('name','').strip(): return jsonify({'error': 'Nome obrigatorio'}), 400
    vid = execute("INSERT INTO vendors (name,user_id) VALUES (%s,%s)",
                  (d['name'].strip(), d.get('user_id') or None))
    return jsonify({'id': vid, 'name': d['name']}), 201

@vendors_bp.route('/<int:vid>', methods=['PUT'])
@admin_required
def update_vendor(vid):
    d = request.json or {}
    execute("UPDATE vendors SET name=%s,active=%s WHERE id=%s",
            (d.get('name',''), d.get('active',1), vid))
    return jsonify({'message': 'Atualizado'})

@vendors_bp.route('/<int:vid>', methods=['DELETE'])
@admin_required
def delete_vendor(vid):
    execute("UPDATE vendors SET active=0 WHERE id=%s", (vid,))
    return jsonify({'message': 'Desativado'})
