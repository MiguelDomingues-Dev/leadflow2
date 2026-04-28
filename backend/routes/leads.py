from flask import Blueprint, request, jsonify, g, make_response
from database import query, execute, log_audit
from auth_middleware import login_required, admin_required
import csv, io, os, uuid
from werkzeug.utils import secure_filename

leads_bp = Blueprint('leads', __name__)

def _build_filters(user):
    """Build WHERE clauses and params based on user role + request args."""
    where = []; params = []

    # Vendor ou SDR vê apenas seus leads
    if user['role'] in ('vendor', 'sdr'):
        v_row = query("SELECT id FROM vendors WHERE user_id=%s AND active=1", (user['id'],), fetchone=True)
        if not v_row:
            return None, None
        
        if user['role'] == 'vendor':
            where.append("AND l.vendor_id=%s"); params.append(v_row['id'])
        else: # sdr
            where.append("AND l.sdr_id=%s"); params.append(v_row['id'])

    if request.args.get('pipeline_id'):
        where.append("AND l.pipeline_id=%s"); params.append(request.args['pipeline_id'])
    if request.args.get('platform_id'):
        where.append("AND l.platform_id=%s"); params.append(request.args['platform_id'])
    if request.args.get('status_id'):
        where.append("AND l.status_id=%s"); params.append(request.args['status_id'])
    if request.args.get('sdr_id'):
        where.append("AND l.sdr_id=%s"); params.append(request.args['sdr_id'])
    if request.args.get('vendor_id'):
        where.append("AND l.vendor_id=%s"); params.append(request.args['vendor_id'])
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
        SELECT l.id, l.name, l.phone, l.email, l.platform_id, l.vendor_id, l.sdr_id,
               l.status_id, l.pipeline_id, l.specific_video, l.follow_time, l.interest, l.notes,
               l.created_at, l.updated_at,
               DATE_FORMAT(l.next_contact, '%%Y-%%m-%%dT%%H:%%i') AS next_contact,
               p.name AS platform_name, p.color AS platform_color, p.icon AS platform_icon,
               v.name AS vendor_name, s.name AS status_name, s.color AS status_color,
               sv.name AS sdr_name,
               u.name AS vendor_user_name
        FROM leads l
        LEFT JOIN platforms p ON l.platform_id = p.id
        LEFT JOIN vendors v ON l.vendor_id = v.id
        LEFT JOIN vendors sv ON l.sdr_id = sv.id
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
        SELECT l.id, l.name, l.phone, l.email, l.platform_id, l.vendor_id, l.sdr_id,
               l.status_id, l.pipeline_id, l.specific_video, l.follow_time, l.interest, l.notes,
               l.created_at, l.updated_at,
               DATE_FORMAT(l.next_contact, '%%Y-%%m-%%dT%%H:%%i') AS next_contact,
               p.name AS platform_name, p.color AS platform_color, p.icon AS platform_icon,
               v.name AS vendor_name, s.name AS status_name, s.color AS status_color,
               sv.name AS sdr_name
        FROM leads l
        LEFT JOIN platforms p ON l.platform_id=p.id
        LEFT JOIN vendors v ON l.vendor_id=v.id
        LEFT JOIN vendors sv ON l.sdr_id=sv.id
        LEFT JOIN lead_statuses s ON l.status_id=s.id
        WHERE l.id=%s
    """, (lid,), fetchone=True)
    if not row: return jsonify({'error': 'Lead nao encontrado'}), 404

    # Vendedor/SDR pode ver apenas seu próprio lead
    if g.user['role'] in ('vendor', 'sdr'):
        v_row = query("SELECT id FROM vendors WHERE user_id=%s", (g.user['id'],), fetchone=True)
        if not v_row:
            return jsonify({'error': 'Acesso negado'}), 403
        
        if g.user['role'] == 'vendor' and row['vendor_id'] != v_row['id']:
            return jsonify({'error': 'Acesso negado'}), 403
        if g.user['role'] == 'sdr' and row['sdr_id'] != v_row['id']:
            return jsonify({'error': 'Acesso negado'}), 403

    # Histórico de atividades
    activities = query("""
        SELECT a.*, u.name AS user_name FROM lead_activities a
        LEFT JOIN users u ON a.user_id=u.id
        WHERE a.lead_id=%s ORDER BY a.created_at DESC
    """, (lid,))
    
    # Custom fields
    cfields = query("""
        SELECT c.id, c.name, c.type, lcf.value 
        FROM custom_fields c
        LEFT JOIN lead_custom_fields lcf ON c.id = lcf.field_id AND lcf.lead_id=%s
        WHERE c.active=1
    """, (lid,))
    
    # Attachments
    attachments = query("SELECT * FROM attachments WHERE lead_id=%s ORDER BY created_at DESC", (lid,))
    
    return jsonify({**row, 'activities': activities, 'custom_fields': cfields, 'attachments': attachments})

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
    pipeline_id = d.get('pipeline_id')
    
    if pipeline_id:
        default_status = query("SELECT id FROM lead_statuses WHERE is_default=1 AND active=1 AND pipeline_id=%s ORDER BY sort_order LIMIT 1", (pipeline_id,), fetchone=True)
    else:
        # Se não enviou pipeline, pega o pipeline padrão
        default_pipe = query("SELECT id FROM pipelines WHERE is_default=1 LIMIT 1", fetchone=True)
        pipeline_id = default_pipe['id'] if default_pipe else None
        default_status = query("SELECT id FROM lead_statuses WHERE is_default=1 AND active=1 AND pipeline_id=%s ORDER BY sort_order LIMIT 1", (pipeline_id,), fetchone=True)
        
    status_id = d.get('status_id') or (default_status['id'] if default_status else None)

    # Atribuição automática se for SDR ou Vendor
    sdr_id = d.get('sdr_id')
    vendor_id = d.get('vendor_id')
    
    if g.user['role'] == 'sdr':
        v_row = query("SELECT id FROM vendors WHERE user_id=%s AND active=1", (g.user['id'],), fetchone=True)
        sdr_id = v_row['id'] if v_row else None
    elif g.user['role'] == 'vendor':
        v_row = query("SELECT id FROM vendors WHERE user_id=%s AND active=1", (g.user['id'],), fetchone=True)
        vendor_id = v_row['id'] if v_row else None

    lid = execute("""
        INSERT INTO leads (name,phone,email,platform_id,sdr_id,vendor_id,status_id, pipeline_id,
            specific_video,follow_time,interest,notes,next_contact)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
    """, (d['name'].strip(), d['phone'].strip(), (d.get('email','').strip() or None),
          d['platform_id'], sdr_id, vendor_id, status_id, pipeline_id,
          d.get('specific_video','').strip() or None,
          d.get('follow_time','nao_acompanha'),
          d.get('interest','').strip() or None,
          d.get('notes','').strip() or None,
          d.get('next_contact') or None))
          
    # Salvar custom fields
    if 'custom_fields' in d and isinstance(d['custom_fields'], dict):
        for field_id, value in d['custom_fields'].items():
            if value is not None and value != '':
                execute("INSERT INTO lead_custom_fields (lead_id, field_id, value) VALUES (%s, %s, %s)", 
                        (lid, field_id, str(value)))

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
    old_vendor = row['vendor_id']
    new_vendor = d.get('vendor_id', old_vendor)

    execute("""
        UPDATE leads SET name=%s,phone=%s,email=%s,platform_id=%s,sdr_id=%s,vendor_id=%s,
            status_id=%s,pipeline_id=%s,specific_video=%s,follow_time=%s,interest=%s,notes=%s,
            next_contact=%s,updated_at=NOW()
        WHERE id=%s
    """, (d.get('name', row['name']), d.get('phone', row['phone']),
          (d.get('email','') or '').strip() or None,
          d.get('platform_id', row['platform_id']),
          d.get('sdr_id', row['sdr_id']),
          new_vendor,
          new_status,
          d.get('pipeline_id', row.get('pipeline_id')),
          d.get('specific_video', row.get('specific_video','')),
          d.get('follow_time', row['follow_time']),
          d.get('interest', row.get('interest','')),
          d.get('notes', row.get('notes','')),
          d.get('next_contact') or None, lid))
          
    # Atualizar custom fields
    if 'custom_fields' in d and isinstance(d['custom_fields'], dict):
        for field_id, value in d['custom_fields'].items():
            if value is not None and value != '':
                execute("""
                    INSERT INTO lead_custom_fields (lead_id, field_id, value) VALUES (%s, %s, %s)
                    ON DUPLICATE KEY UPDATE value=%s
                """, (lid, field_id, str(value), str(value)))
            else:
                execute("DELETE FROM lead_custom_fields WHERE lead_id=%s AND field_id=%s", (lid, field_id))

    if str(old_vendor) != str(new_vendor) and new_vendor:
        v_name = query("SELECT name FROM vendors WHERE id=%s", (new_vendor,), fetchone=True)
        content = f"Lead enviado para o vendedor: {v_name['name'] if v_name else '?'}"
        execute("INSERT INTO lead_activities (lead_id,user_id,type,content) VALUES (%s,%s,'transfer',%s)",
                (lid, g.user['id'], content))

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

@leads_bp.route('/<int:lid>/qualify', methods=['POST'])
@login_required
def qualify_lead(lid):
    """SDR: marca lead como Qualificado e opcionalmente atribui a um Closer."""
    d = request.json or {}
    row = query("SELECT * FROM leads WHERE id=%s", (lid,), fetchone=True)
    if not row: return jsonify({'error': 'Lead não encontrado'}), 404

    qual_status = query(
        "SELECT id FROM lead_statuses WHERE name='Qualificado' AND active=1 LIMIT 1",
        fetchone=True
    )
    if not qual_status:
        qual_status = {'id': 3}

    new_vendor_id = d.get('vendor_id') or row['vendor_id']
    note = (d.get('note') or '').strip()

    execute("""
        UPDATE leads SET status_id=%s, vendor_id=%s, updated_at=NOW()
        WHERE id=%s
    """, (qual_status['id'], new_vendor_id, lid))

    if new_vendor_id and str(new_vendor_id) != str(row['vendor_id'] or ''):
        v_name = query("SELECT name FROM vendors WHERE id=%s", (new_vendor_id,), fetchone=True)
        execute(
            "INSERT INTO lead_activities (lead_id,user_id,type,content) VALUES (%s,%s,'transfer',%s)",
            (lid, g.user['id'], f"Lead qualificado e enviado ao Closer: {v_name['name'] if v_name else '?'}")
        )
    else:
        execute(
            "INSERT INTO lead_activities (lead_id,user_id,type,content) VALUES (%s,%s,'status_change',%s)",
            (lid, g.user['id'], "Lead marcado como Qualificado pelo SDR")
        )

    if note:
        execute(
            "INSERT INTO lead_activities (lead_id,user_id,type,content) VALUES (%s,%s,'note',%s)",
            (lid, g.user['id'], note)
        )

    log_audit(g.user['id'], 'qualify_lead', target_id=lid)
    return jsonify({'message': 'Lead qualificado com sucesso'})

@leads_bp.route('/<int:lid>/attachments', methods=['POST'])
@login_required
def add_attachment(lid):
    if 'file' not in request.files:
        return jsonify({'error': 'Nenhum arquivo enviado'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'Nenhum arquivo selecionado'}), 400
        
    original_name = file.filename
    ext = original_name.rsplit('.', 1)[1].lower() if '.' in original_name else ''
    
    # Validação simples
    if ext not in ['pdf', 'png', 'jpg', 'jpeg']:
        return jsonify({'error': 'Apenas PDF e Imagens são permitidos'}), 400
        
    filename = secure_filename(f"lead_{lid}_att_{uuid.uuid4().hex[:8]}.{ext}")
    
    upload_dir = os.path.join(os.getcwd(), 'uploads')
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)
        
    file_path = os.path.join(upload_dir, filename)
    file.save(file_path)
    file_size = os.path.getsize(file_path)
    
    # 10MB limit
    if file_size > 10 * 1024 * 1024:
        os.remove(file_path)
        return jsonify({'error': 'O arquivo excede o limite de 10MB'}), 400
    
    att_id = execute("INSERT INTO attachments (lead_id, file_name, original_name, file_size, file_type) VALUES (%s, %s, %s, %s, %s)",
            (lid, filename, original_name, file_size, ext))
            
    execute("INSERT INTO lead_activities (lead_id,user_id,type,content) VALUES (%s,%s,'note',%s)",
            (lid, g.user['id'], f"Anexou o arquivo: {original_name}"))
            
    return jsonify({'message': 'Arquivo anexado com sucesso', 'id': att_id, 'file_name': filename, 'original_name': original_name}), 201

@leads_bp.route('/<int:lid>/attachments/<int:att_id>', methods=['DELETE'])
@login_required
def delete_attachment(lid, att_id):
    row = query("SELECT file_name FROM attachments WHERE id=%s AND lead_id=%s", (att_id, lid), fetchone=True)
    if not row:
        return jsonify({'error': 'Anexo não encontrado'}), 404
        
    file_path = os.path.join(os.getcwd(), 'uploads', row['file_name'])
    if os.path.exists(file_path):
        os.remove(file_path)
        
    execute("DELETE FROM attachments WHERE id=%s", (att_id,))
    
    return jsonify({'message': 'Anexo removido'})
