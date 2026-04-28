from flask import Blueprint, request, jsonify, g
from database import query, execute, log_audit
from auth_middleware import login_required, admin_required

pipelines_bp = Blueprint('pipelines', __name__)

@pipelines_bp.route('/', methods=['GET'])
@login_required
def list_pipelines():
    rows = query("SELECT * FROM pipelines ORDER BY id ASC")
    return jsonify({'data': rows})

@pipelines_bp.route('/', methods=['POST'])
@admin_required
def create_pipeline():
    d = request.json or {}
    name = d.get('name', '').strip()
    if not name:
        return jsonify({'error': 'Nome do funil é obrigatório'}), 400
    
    is_default = 1 if d.get('is_default') else 0
    if is_default:
        execute("UPDATE pipelines SET is_default=0")
        
    pid = execute("INSERT INTO pipelines (name, is_default, active) VALUES (%s, %s, %s)",
                  (name, is_default, 1 if d.get('active', True) else 0))
    
    log_audit(g.user['id'], 'create_pipeline', target_id=pid, details=f"Name: {name}")
    return jsonify({'id': pid, 'message': 'Funil criado com sucesso'}), 201

@pipelines_bp.route('/<int:pid>', methods=['PUT'])
@admin_required
def update_pipeline(pid):
    d = request.json or {}
    row = query("SELECT * FROM pipelines WHERE id=%s", (pid,), fetchone=True)
    if not row:
        return jsonify({'error': 'Funil não encontrado'}), 404
        
    name = d.get('name', row['name']).strip()
    is_default = d.get('is_default', row['is_default'])
    active = d.get('active', row['active'])
    
    if is_default and not row['is_default']:
        execute("UPDATE pipelines SET is_default=0")
        
    execute("UPDATE pipelines SET name=%s, is_default=%s, active=%s WHERE id=%s",
            (name, is_default, active, pid))
            
    log_audit(g.user['id'], 'update_pipeline', target_id=pid)
    return jsonify({'message': 'Funil atualizado com sucesso'})

@pipelines_bp.route('/<int:pid>', methods=['DELETE'])
@admin_required
def delete_pipeline(pid):
    # Verifica se é o único funil padrão
    row = query("SELECT is_default FROM pipelines WHERE id=%s", (pid,), fetchone=True)
    if row and row['is_default']:
        return jsonify({'error': 'Não é possível excluir o funil padrão. Defina outro como padrão primeiro.'}), 400
        
    # Exclui o funil (status e leads serão afetados por FK CASCADE/SET NULL)
    execute("DELETE FROM pipelines WHERE id=%s", (pid,))
    log_audit(g.user['id'], 'delete_pipeline', target_id=pid)
    return jsonify({'message': 'Funil excluído com sucesso'})
