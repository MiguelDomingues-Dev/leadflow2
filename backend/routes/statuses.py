from flask import Blueprint, request, jsonify
from database import query, execute
from auth_middleware import login_required, admin_required

statuses_bp = Blueprint('statuses', __name__)

@statuses_bp.route('/', methods=['GET'])
@login_required
def list_statuses():
    rows = query("SELECT * FROM lead_statuses WHERE active=1 ORDER BY sort_order, name")
    return jsonify(rows)

@statuses_bp.route('/', methods=['POST'])
@admin_required
def create_status():
    d = request.json or {}
    if not d.get('name','').strip():
        return jsonify({'error': 'Nome e obrigatorio'}), 400
    sid = execute("INSERT INTO lead_statuses (name,color,sort_order,is_default,is_final) VALUES (%s,%s,%s,%s,%s)",
        (d['name'].strip(), d.get('color','#64748b'), d.get('sort_order',99),
         1 if d.get('is_default') else 0, 1 if d.get('is_final') else 0))
    return jsonify({'id': sid, 'name': d['name']}), 201

@statuses_bp.route('/<int:sid>', methods=['PUT'])
@admin_required
def update_status(sid):
    d = request.json or {}
    execute("UPDATE lead_statuses SET name=%s,color=%s,sort_order=%s,is_default=%s,is_final=%s WHERE id=%s",
        (d.get('name',''), d.get('color','#64748b'), d.get('sort_order',99),
         1 if d.get('is_default') else 0, 1 if d.get('is_final') else 0, sid))
    return jsonify({'message': 'Atualizado'})

@statuses_bp.route('/<int:sid>', methods=['DELETE'])
@admin_required
def delete_status(sid):
    count = query("SELECT COUNT(*) AS n FROM leads WHERE status_id=%s", (sid,), fetchone=True)['n']
    if count > 0:
        return jsonify({'error': f'Status possui {count} lead(s). Mude-os primeiro.'}), 409
    execute("UPDATE lead_statuses SET active=0 WHERE id=%s", (sid,))
    return jsonify({'message': 'Desativado'})
