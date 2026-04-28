from flask import Blueprint, request, jsonify, g
from database import query, execute, log_audit
from auth_middleware import login_required

reminders_bp = Blueprint('reminders', __name__)

@reminders_bp.route('/', methods=['GET'])
@login_required
def get_reminders():
    # Vendor/SDR sees their own reminders, Admin sees all or can filter
    user = g.user
    where_clauses = ["1=1"]
    params = []
    
    if user['role'] in ('vendor', 'sdr'):
        where_clauses.append("r.user_id = %s")
        params.append(user['id'])
        
    status = request.args.get('status')
    if status:
        where_clauses.append("r.status = %s")
        params.append(status)
        
    query_str = f"""
        SELECT r.*, s.lead_id, l.name as lead_name, l.phone as lead_phone 
        FROM sale_reminders r
        JOIN sales s ON r.sale_id = s.id
        JOIN leads l ON s.lead_id = l.id
        WHERE {' AND '.join(where_clauses)}
        ORDER BY r.due_date ASC
    """
    
    reminders = query(query_str, tuple(params))
    return jsonify(reminders)


@reminders_bp.route('/<int:rem_id>/status', methods=['PUT'])
@login_required
def update_reminder_status(rem_id):
    d = request.json or {}
    new_status = d.get('status', 'pago')
    
    row = query("SELECT user_id, sale_id FROM sale_reminders WHERE id=%s", (rem_id,), fetchone=True)
    if not row:
        return jsonify({'error': 'Lembrete não encontrado'}), 404
        
    if g.user['role'] in ('vendor', 'sdr') and row['user_id'] != g.user['id']:
        return jsonify({'error': 'Acesso negado'}), 403
        
    execute("UPDATE sale_reminders SET status=%s WHERE id=%s", (new_status, rem_id))
    
    if new_status == 'pago':
        # Add activity to lead
        sale = query("SELECT lead_id FROM sales WHERE id=%s", (row['sale_id'],), fetchone=True)
        if sale:
            execute("INSERT INTO lead_activities (lead_id, user_id, type, content) VALUES (%s, %s, 'note', 'Pagamento pendente recebido/baixado com sucesso!')", (sale['lead_id'], g.user['id']))
            
    log_audit(g.user['id'], 'update_reminder_status', target_id=rem_id, details=new_status)
    return jsonify({'message': 'Status do lembrete atualizado'})

@reminders_bp.route('/<int:rem_id>', methods=['DELETE'])
@login_required
def delete_reminder(rem_id):
    row = query("SELECT user_id FROM sale_reminders WHERE id=%s", (rem_id,), fetchone=True)
    if not row:
        return jsonify({'error': 'Lembrete não encontrado'}), 404
        
    if g.user['role'] in ('vendor', 'sdr') and row['user_id'] != g.user['id']:
        return jsonify({'error': 'Acesso negado'}), 403
        
    execute("DELETE FROM sale_reminders WHERE id=%s", (rem_id,))
    return jsonify({'message': 'Lembrete removido'})
