import json
from flask import Blueprint, request, jsonify, g
from database import query, execute, log_audit
from auth_middleware import login_required, admin_required

custom_fields_bp = Blueprint('custom_fields', __name__)

@custom_fields_bp.route('/', methods=['GET'])
@login_required
def list_fields():
    rows = query("SELECT * FROM custom_fields ORDER BY id ASC")
    for r in rows:
        if r['options']:
            r['options'] = json.loads(r['options']) if isinstance(r['options'], str) else r['options']
    return jsonify({'data': rows})

@custom_fields_bp.route('/', methods=['POST'])
@admin_required
def create_field():
    d = request.json or {}
    name = d.get('name', '').strip()
    ftype = d.get('type', 'text')
    
    if not name:
        return jsonify({'error': 'Nome do campo é obrigatório'}), 400
        
    options = None
    if ftype == 'select' and d.get('options'):
        options = json.dumps(d['options'])
        
    fid = execute("INSERT INTO custom_fields (name, type, options, active) VALUES (%s, %s, %s, %s)",
                  (name, ftype, options, 1 if d.get('active', True) else 0))
    
    log_audit(g.user['id'], 'create_custom_field', target_id=fid, details=f"Name: {name}")
    return jsonify({'id': fid, 'message': 'Campo dinâmico criado com sucesso'}), 201

@custom_fields_bp.route('/<int:fid>', methods=['PUT'])
@admin_required
def update_field(fid):
    d = request.json or {}
    row = query("SELECT * FROM custom_fields WHERE id=%s", (fid,), fetchone=True)
    if not row:
        return jsonify({'error': 'Campo não encontrado'}), 404
        
    name = d.get('name', row['name']).strip()
    ftype = d.get('type', row['type'])
    active = d.get('active', row['active'])
    
    options = row['options']
    if ftype == 'select' and 'options' in d:
        options = json.dumps(d['options'])
    elif ftype != 'select':
        options = None
        
    execute("UPDATE custom_fields SET name=%s, type=%s, options=%s, active=%s WHERE id=%s",
            (name, ftype, options, active, fid))
            
    log_audit(g.user['id'], 'update_custom_field', target_id=fid)
    return jsonify({'message': 'Campo atualizado com sucesso'})

@custom_fields_bp.route('/<int:fid>', methods=['DELETE'])
@admin_required
def delete_field(fid):
    execute("DELETE FROM custom_fields WHERE id=%s", (fid,))
    log_audit(g.user['id'], 'delete_custom_field', target_id=fid)
    return jsonify({'message': 'Campo excluído com sucesso'})
