from flask import Blueprint, request, jsonify, g
from database import query, execute, log_audit
from auth_middleware import admin_required

products_bp = Blueprint('products', __name__)

@products_bp.route('/', methods=['GET'])
def get_products():
    active_only = request.args.get('active', '0') == '1'
    if active_only:
        rows = query("SELECT * FROM products WHERE active=1 ORDER BY name ASC")
    else:
        rows = query("SELECT * FROM products ORDER BY name ASC")
    return jsonify(rows)

@products_bp.route('/', methods=['POST'])
@admin_required
def create_product():
    d = request.json or {}
    name = d.get('name', '').strip()
    price = d.get('price', 0.0)
    
    if not name:
        return jsonify({'error': 'Nome do produto é obrigatório'}), 400
        
    pid = execute("INSERT INTO products (name, price) VALUES (%s, %s)", (name, price))
    log_audit(g.user['id'], 'create_product', target_id=pid, details=name)
    return jsonify({'id': pid, 'message': 'Produto criado com sucesso'}), 201

@products_bp.route('/<int:pid>', methods=['PUT'])
@admin_required
def update_product(pid):
    d = request.json or {}
    name = d.get('name', '').strip()
    price = d.get('price', 0.0)
    active = d.get('active', 1)
    
    if not name:
        return jsonify({'error': 'Nome do produto é obrigatório'}), 400
        
    execute("UPDATE products SET name=%s, price=%s, active=%s WHERE id=%s", (name, price, active, pid))
    log_audit(g.user['id'], 'update_product', target_id=pid)
    return jsonify({'message': 'Produto atualizado'})

@products_bp.route('/<int:pid>', methods=['DELETE'])
@admin_required
def delete_product(pid):
    execute("DELETE FROM products WHERE id=%s", (pid,))
    log_audit(g.user['id'], 'delete_product', target_id=pid)
    return jsonify({'message': 'Produto excluído'})
