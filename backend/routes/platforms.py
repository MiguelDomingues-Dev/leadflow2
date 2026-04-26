from flask import Blueprint, request, jsonify
from database import query, execute
from auth_middleware import login_required, admin_required

platforms_bp = Blueprint('platforms', __name__)

@platforms_bp.route('/', methods=['GET'])
@login_required
def list_platforms():
    return jsonify(query("SELECT * FROM platforms WHERE active=1 ORDER BY name ASC"))

@platforms_bp.route('/', methods=['POST'])
@admin_required
def create_platform():
    d = request.json or {}
    if not d.get('name','').strip(): return jsonify({'error': 'Nome e obrigatorio'}), 400
    pid = execute("INSERT INTO platforms (name,color,icon) VALUES (%s,%s,%s)",
                  (d['name'].strip(), d.get('color','#3b82f6'), d.get('icon','📱')))
    return jsonify({'id': pid, 'name': d['name'], 'color': d.get('color','#3b82f6'), 'icon': d.get('icon','📱')}), 201

@platforms_bp.route('/<int:pid>', methods=['PUT'])
@admin_required
def update_platform(pid):
    d = request.json or {}
    execute("UPDATE platforms SET name=%s,color=%s,icon=%s,active=%s WHERE id=%s",
            (d.get('name',''), d.get('color','#3b82f6'), d.get('icon','📱'), d.get('active',1), pid))
    return jsonify({'message': 'Atualizado'})

@platforms_bp.route('/<int:pid>', methods=['DELETE'])
@admin_required
def delete_platform(pid):
    count = query("SELECT COUNT(*) AS n FROM leads WHERE platform_id=%s", (pid,), fetchone=True)['n']
    if count > 0: return jsonify({'error': f'Plataforma possui {count} lead(s).'}), 409
    execute("DELETE FROM platforms WHERE id=%s", (pid,))
    return jsonify({'message': 'Excluido'})
