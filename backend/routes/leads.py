from flask import Blueprint, request, jsonify, g, make_response
from database import query, execute, log_audit
from auth_middleware import login_required, admin_required
import csv, io, os, uuid
from werkzeug.utils import secure_filename

leads_bp = Blueprint('leads', __name__)

def _build_filters(user):
    """Build WHERE clauses and params based on user role + request args."""
    where = []; params = []

    # Vendor vê apenas seus leads
    if user['role'] == 'vendor':
        vendor = query("SELECT id FROM vendors WHERE user_id=%s AND active=1", (user['id'],), fetchone=True)
        if vendor:
            where.append("AND l.vendor_id=%s"); params.append(vendor['id'])
        else:
            return None, None  # No vendor found, return empty

    if request.args.get('platform_id'):
        where.append("AND l.platform_id=%s"); params.append(request.args['platform_id'])
    if request.args.get('status_id'):
        where.append("AND l.status_id=%s"); params.append(request.args['status_id'])
    if request.args.get('search'):
        where.append("AND (l.name LIKE %s OR l.phone LIKE %s OR l.email LIKE %s)")
        s = f"%{request.args['search']}%"; params += [s, s, s]
    period = request.args.get('period', '')
    if period == 'today':   where.append("AND DATE(l.created_at)=CURDATE()")
    elif period == 'week':  where.append("AND l.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)")
    elif period == 'month': where.append("AND l.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)")

    return ' '.join(where), params

def _lead_select():
    return """
        SELECT l.*, p.name AS platform_name, p.color AS platform_color, p.icon AS platform_icon,
               v.name AS vendor_name, s.name AS status_name, s.color AS status_color,
               u.name AS vendor_user_name,
               DATE_FORMAT(l.next_contact, '%%Y-%%m-%%d') as next_contact
        FROM leads l
        LEFT JOIN platforms p ON l.platform_id = p.id
        LEFT JOIN vendors v ON l.vendor_id = v.id
        LEFT JOIN lead_statuses s ON l.status_id = s.id
        LEFT JOIN users u ON v.user_id = u.id
        WHERE 1=1 """

@leads_bp.route('/', methods=['GET'])
@login_required
def list_leads():
    user = g.user
    extra_where, params = _build_filters(user)
    if params is None:
        return jsonify({'data': [], 'total': 0, 'page': 1, 'per_page': 20})

    # Pagination
    per_page = min(int(request.args.get('per_page', 20)), 500)
    page     = max(1, int(request.args.get('page', 1)))
    offset   = (page - 1) * per_page

    # Count total
    count_sql = f"SELECT COUNT(*) AS n FROM leads l WHERE 1=1 {extra_where}"
    total = query(count_sql, params, fetchone=True)['n']

    # Fetch page
    sql = _lead_select() + extra_where + f" ORDER BY l.created_at DESC LIMIT {per_page} OFFSET {offset}"
    rows = query(sql, params)

    return jsonify({'data': rows, 'total': total, 'page': page, 'per_page': per_page})

@leads_bp.route('/export', methods=['GET'])
@login_required
def export_leads():
    user = g.user
    extra_where, params = _build_filters(user)
    if params is None:
        rows = []
    else:
        sql = _lead_select() + (extra_where or '') + " ORDER BY l.created_at DESC LIMIT 5000"
        rows = query(sql, params)

    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    writer.writerow(['ID','Nome','Telefone','Email','Plataforma','Vendedor','Status','Tempo Acompanha','Próx. Contato','Criado em'])
    follow_map = {'menos_1_mes':'< 1 mês','1_3_meses':'1-3 meses','3_6_meses':'3-6 meses','mais_6_meses':'> 6 meses','nao_acompanha':'Não acompanha'}
    for r in rows:
        writer.writerow([
            r['id'], r['name'], r['phone'], r.get('email',''),
            r.get('platform_name',''), r.get('vendor_name',''),
            r.get('status_name',''), follow_map.get(r.get('follow_time',''),''),
            r.get('next_contact','') or '',
            str(r['created_at'])[:10]
        ])

    response = make_response('\ufeff' + output.getvalue())
    response.headers['Content-Type'] = 'text/csv; charset=utf-8'
    response.headers['Content-Disposition'] = 'attachment; filename=leads.csv'
    return response

@leads_bp.route('/<int:lid>', methods=['GET'])
@login_required
def get_lead(lid):
    row = query("""
        SELECT l.*, p.name AS platform_name, p.color AS platform_color, p.icon AS platform_icon,
               v.name AS vendor_name, s.name AS status_name, s.color AS status_color,
               DATE_FORMAT(l.next_contact, '%%Y-%%m-%%d') as next_contact
        FROM leads l
        LEFT JOIN platforms p ON l.platform_id=p.id
        LEFT JOIN vendors v ON l.vendor_id=v.id
        LEFT JOIN lead_statuses s ON l.status_id=s.id
        WHERE l.id=%s
    """, (lid,), fetchone=True)
    if not row: return jsonify({'error': 'Lead nao encontrado'}), 404

    # Vendor pode ver apenas seu próprio lead
    if g.user['role'] == 'vendor':
        vendor = query("SELECT id FROM vendors WHERE user_id=%s", (g.user['id'],), fetchone=True)
        if not vendor or row['vendor_id'] != vendor['id']:
            return jsonify({'error': 'Acesso negado'}), 403

    # Histórico de atividades
    activities = query("""
        SELECT a.*, u.name AS user_name FROM lead_activities a
        LEFT JOIN users u ON a.user_id=u.id
        WHERE a.lead_id=%s ORDER BY a.created_at DESC
    """, (lid,))
    return jsonify({**row, 'activities': activities})

@leads_bp.route('/webhook', methods=['POST'])
def webhook_lead():
    token = request.args.get('token')
    if token != 'MEUTOKENSECRETO123':
        return jsonify({'error': 'Acesso negado'}), 401

    d = request.json or {}
    if not d.get('name') or not d.get('phone'):
        return jsonify({'error': 'Nome e telefone são obrigatórios'}), 400

    default_status = query("SELECT id FROM lead_statuses WHERE is_default=1 AND active=1 ORDER BY sort_order LIMIT 1", fetchone=True)
    status_id = default_status['id'] if default_status else None
    
    # Distribuição Round-Robin: pega o vendedor ativo com menos leads no status 'Novo'
    vendor_row = query("""
        SELECT v.id, COUNT(l.id) as lead_count
        FROM vendors v
        LEFT JOIN leads l ON l.vendor_id = v.id AND l.status_id = %s
        WHERE v.active=1
        GROUP BY v.id
        ORDER BY lead_count ASC, v.id ASC
        LIMIT 1
    """, (status_id,), fetchone=True)
    vendor_id = vendor_row['id'] if vendor_row else None

    platform_id = d.get('platform_id')
    if not platform_id:
        p = query("SELECT id FROM platforms WHERE active=1 LIMIT 1", fetchone=True)
        platform_id = p['id'] if p else None

    lid = execute("""
        INSERT INTO leads (name,phone,email,platform_id,vendor_id,status_id,
            specific_video,follow_time,interest,notes)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """, (d.get('name','').strip(), d.get('phone','').strip(), (d.get('email','').strip() or None),
          platform_id, vendor_id, status_id,
          d.get('specific_video','').strip() or None,
          d.get('follow_time','nao_acompanha'),
          d.get('interest','').strip() or None,
          d.get('notes','').strip() or None))

    execute("INSERT INTO lead_activities (lead_id,user_id,type,content) VALUES (%s,NULL,'created','Lead recebido via Webhook')", (lid,))
    log_audit(None, 'webhook_lead_received', target_id=lid, details=f"Name: {d.get('name')}")
    return jsonify({'id': lid, 'vendor_id': vendor_id, 'message': 'Lead recebido com sucesso'}), 201

@leads_bp.route('/', methods=['POST'])
@login_required
def create_lead():
    d = request.json or {}
    if not d.get('name','').strip(): return jsonify({'error': 'Nome e obrigatorio'}), 400
    if not d.get('phone','').strip(): return jsonify({'error': 'Telefone e obrigatorio'}), 400
    if not d.get('platform_id'): return jsonify({'error': 'Plataforma e obrigatoria'}), 400

    # Pega status padrão
    default_status = query("SELECT id FROM lead_statuses WHERE is_default=1 AND active=1 ORDER BY sort_order LIMIT 1", fetchone=True)
    status_id = d.get('status_id') or (default_status['id'] if default_status else None)

    # Vendor só pode criar lead para si mesmo
    vendor_id = d.get('vendor_id')
    if g.user['role'] == 'vendor':
        vendor = query("SELECT id FROM vendors WHERE user_id=%s AND active=1", (g.user['id'],), fetchone=True)
        vendor_id = vendor['id'] if vendor else None

    lid = execute("""
        INSERT INTO leads (name,phone,email,platform_id,vendor_id,status_id,
            specific_video,follow_time,interest,notes,next_contact)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """, (d['name'].strip(), d['phone'].strip(), (d.get('email','').strip() or None),
          d['platform_id'], vendor_id, status_id,
          d.get('specific_video','').strip() or None,
          d.get('follow_time','nao_acompanha'),
          d.get('interest','').strip() or None,
          d.get('notes','').strip() or None,
          d.get('next_contact') or None))

    execute("INSERT INTO lead_activities (lead_id,user_id,type,content) VALUES (%s,%s,'created','Lead registrado')",
            (lid, g.user['id']))
    log_audit(g.user['id'], 'create_lead', target_id=lid, details=f"Name: {d.get('name')}")
    return jsonify({'id': lid, 'message': 'Lead registrado'}), 201

@leads_bp.route('/<int:lid>', methods=['PUT'])
@login_required
def update_lead(lid):
    d = request.json or {}
    row = query("SELECT * FROM leads WHERE id=%s", (lid,), fetchone=True)
    if not row: return jsonify({'error': 'Nao encontrado'}), 404

    old_status = row['status_id']
    new_status = d.get('status_id', old_status)

    execute("""
        UPDATE leads SET name=%s,phone=%s,email=%s,platform_id=%s,vendor_id=%s,
            status_id=%s,specific_video=%s,follow_time=%s,interest=%s,notes=%s,
            next_contact=%s,updated_at=NOW()
        WHERE id=%s
    """, (d.get('name', row['name']), d.get('phone', row['phone']),
          (d.get('email','') or '').strip() or None,
          d.get('platform_id', row['platform_id']),
          d.get('vendor_id', row['vendor_id']),
          new_status,
          d.get('specific_video', row.get('specific_video','')),
          d.get('follow_time', row['follow_time']),
          d.get('interest', row.get('interest','')),
          d.get('notes', row.get('notes','')),
          d.get('next_contact') or None, lid))

    if str(old_status) != str(new_status):
        old_s = query("SELECT name FROM lead_statuses WHERE id=%s", (old_status,), fetchone=True)
        new_s = query("SELECT name FROM lead_statuses WHERE id=%s", (new_status,), fetchone=True)
        content = f"Status alterado: {old_s['name'] if old_s else '?'} → {new_s['name'] if new_s else '?'}"
        execute("INSERT INTO lead_activities (lead_id,user_id,type,content) VALUES (%s,%s,'status_change',%s)",
                (lid, g.user['id'], content))

    log_audit(g.user['id'], 'update_lead', target_id=lid)
    return jsonify({'message': 'Atualizado'})

@leads_bp.route('/<int:lid>/activity', methods=['POST'])
@login_required
def add_activity(lid):
    d = request.json or {}
    content = d.get('content','').strip()
    atype   = d.get('type','note')
    if not content: return jsonify({'error': 'Conteudo e obrigatorio'}), 400
    execute("INSERT INTO lead_activities (lead_id,user_id,type,content) VALUES (%s,%s,%s,%s)",
            (lid, g.user['id'], atype, content))
    return jsonify({'message': 'Atividade registrada'}), 201

@leads_bp.route('/<int:lid>/activities/audio', methods=['POST'])
@login_required
def add_audio_activity(lid):
    if 'audio' not in request.files:
        return jsonify({'error': 'Nenhum arquivo de áudio enviado'}), 400
    
    file = request.files['audio']
    if file.filename == '':
        return jsonify({'error': 'Nenhum arquivo selecionado'}), 400
        
    ext = 'webm'
    filename = secure_filename(f"lead_{lid}_{uuid.uuid4().hex}.{ext}")
    
    upload_dir = os.path.join(os.getcwd(), 'uploads')
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)
        
    file_path = os.path.join(upload_dir, filename)
    file.save(file_path)
    
    execute("INSERT INTO lead_activities (lead_id,user_id,type,content) VALUES (%s,%s,'audio',%s)",
            (lid, g.user['id'], filename))
            
    return jsonify({'message': 'Áudio gravado com sucesso', 'filename': filename}), 201

@leads_bp.route('/<int:lid>', methods=['DELETE'])
@admin_required
def delete_lead(lid):
    execute("DELETE FROM leads WHERE id=%s", (lid,))
    log_audit(g.user['id'], 'delete_lead', target_id=lid)
    return jsonify({'message': 'Lead removido'})

@leads_bp.route('/bulk-action', methods=['POST'])
@admin_required
def bulk_action():
    d = request.json or {}
    ids = d.get('ids', [])
    action = d.get('action')
    if not ids: return jsonify({'error': 'Nenhum lead selecionado'}), 400
    
    if action == 'transfer':
        vendor_id = d.get('vendor_id')
        if not vendor_id: return jsonify({'error': 'Vendedor não selecionado'}), 400
        placeholders = ', '.join(['%s'] * len(ids))
        execute(f"UPDATE leads SET vendor_id=%s WHERE id IN ({placeholders})", [vendor_id] + ids)
        log_audit(g.user['id'], 'bulk_transfer', details=f"Leads: {ids} to Vendor: {vendor_id}")
    elif action == 'delete':
        placeholders = ', '.join(['%s'] * len(ids))
        execute(f"DELETE FROM leads WHERE id IN ({placeholders})", ids)
        log_audit(g.user['id'], 'bulk_delete', details=f"Leads: {ids}")
    else:
        return jsonify({'error': 'Ação inválida'}), 400
        
    return jsonify({'message': f'Ação {action} realizada com sucesso em {len(ids)} leads'})
