import os
from flask import Blueprint, request, jsonify, g
from database import query, execute, log_audit
from auth_middleware import login_required

sales_bp = Blueprint('sales', __name__)
ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY', 'default-dev-key')

def has_billing_access(user):
    return user['role'] in ('admin', 'billing')

def get_user_vendor_id(user_id):
    vendor_row = query("SELECT id FROM vendors WHERE user_id=%s AND active=1", (user_id,), fetchone=True)
    return vendor_row['id'] if vendor_row else None

@sales_bp.route('/', methods=['POST'])
@login_required
def create_sale():
    d = request.json or {}
    lead_id = d.get('lead_id')
    items = d.get('items', [])
    billing_info = d.get('billing_info', {})
    
    payment_method = d.get('payment_method', 'pix')
    installments = int(d.get('installments', 1))
    overall_discount = float(d.get('discount', 0))
    observations = d.get('observations', '')
    
    amount_paid = float(d.get('amount_paid', 0))
    reminder_date = d.get('reminder_date')
    reminder_notes = d.get('reminder_notes', '')
    
    if not lead_id or not items:
        return jsonify({'error': 'Lead ID e itens são obrigatórios'}), 400
        
    # Calcular o valor total baseado nos itens
    total_amount = 0
    total_item_discounts = 0
    for item in items:
        qty = int(item.get('quantity', 1))
        uprice = float(item.get('unit_price', 0))
        item_disc = float(item.get('discount', 0))
        is_freebie = int(item.get('is_freebie', 0))
        
        if is_freebie:
            uprice = 0
            item_disc = 0
            
        total_amount += (uprice * qty)
        total_item_discounts += item_disc
        
    final_amount = total_amount - total_item_discounts - overall_discount
    if final_amount < 0: final_amount = 0
    
    remaining_balance = final_amount - amount_paid
    if remaining_balance < 0: remaining_balance = 0
        
    # Encontrar o vendor_id logado
    vendor_id = get_user_vendor_id(g.user['id'])
        
    # 1. Registrar a Venda
    sale_id = execute("""
        INSERT INTO sales (lead_id, vendor_id, total_amount, payment_method, installments, discount, final_amount, amount_paid, remaining_balance, observations, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'pendente_faturamento')
    """, (lead_id, vendor_id, total_amount, payment_method, installments, overall_discount, final_amount, amount_paid, remaining_balance, observations))
    
    # 2. Registrar os Itens da Venda
    for item in items:
        qty = int(item.get('quantity', 1))
        uprice = float(item.get('unit_price', 0))
        item_disc = float(item.get('discount', 0))
        is_freebie = int(item.get('is_freebie', 0))
        
        if is_freebie:
            uprice = 0
            item_disc = 0
            
        tprice = (uprice * qty) - item_disc
        if tprice < 0: tprice = 0
        
        execute("""
            INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, discount, is_freebie, total_price)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (sale_id, item.get('product_id'), item.get('product_name', 'Produto Genérico'), qty, uprice, item_disc, is_freebie, tprice))
        
    # 3. Registrar e Criptografar Dados Sensíveis (Faturamento)
    execute("DELETE FROM lead_billing_info WHERE lead_id=%s", (lead_id,))
    
    cpf = billing_info.get('cpf', '').strip()
    address = billing_info.get('address', '').strip()
    city = billing_info.get('city', '').strip()
    state = billing_info.get('state', '').strip()
    zipcode = billing_info.get('zipcode', '').strip()
    
    execute("""
        INSERT INTO lead_billing_info 
        (lead_id, cpf_encrypted, address_encrypted, city_encrypted, state_encrypted, zipcode_encrypted)
        VALUES (
            %s, 
            AES_ENCRYPT(%s, %s), 
            AES_ENCRYPT(%s, %s), 
            AES_ENCRYPT(%s, %s), 
            AES_ENCRYPT(%s, %s), 
            AES_ENCRYPT(%s, %s)
        )
    """, (lead_id, cpf, ENCRYPTION_KEY, address, ENCRYPTION_KEY, city, ENCRYPTION_KEY, state, ENCRYPTION_KEY, zipcode, ENCRYPTION_KEY))
    
    # 4. Registrar Lembrete (se houver saldo em haver)
    if remaining_balance > 0 and reminder_date:
        execute("""
            INSERT INTO sale_reminders (sale_id, user_id, due_date, amount_due, notes)
            VALUES (%s, %s, %s, %s, %s)
        """, (sale_id, g.user['id'], reminder_date, remaining_balance, reminder_notes))
    
    # Adicionar atividade no lead
    product_names = ", ".join([f"{int(i.get('quantity', 1))}x {i.get('product_name', 'Produto')}" for i in items])
    activity_msg = f"🛒 Venda concluída e enviada ao Faturamento! Valor: R$ {final_amount:.2f} | Pago: R$ {amount_paid:.2f} | Produtos: {product_names}"
    execute("INSERT INTO lead_activities (lead_id, user_id, type, content) VALUES (%s, %s, 'status_change', %s)", (lead_id, g.user['id'], activity_msg))
    
    log_audit(g.user['id'], 'create_sale', target_id=sale_id, details=f"Lead: {lead_id}, Total: {final_amount}")
    return jsonify({'id': sale_id, 'message': 'Venda registrada com sucesso e enviada ao Faturamento'}), 201


@sales_bp.route('/', methods=['GET'])
@login_required
def get_sales():
    status = request.args.get('status')
    
    where_clauses = ["1=1"]
    params = []
    
    if not has_billing_access(g.user):
        vendor_id = get_user_vendor_id(g.user['id'])
        if not vendor_id:
            return jsonify([])
        where_clauses.append("s.vendor_id = %s")
        params.append(vendor_id)
        
    if status:
        where_clauses.append("s.status = %s")
        params.append(status)
        
    query_str = f"""
        SELECT 
            s.*,
            l.name as lead_name, l.phone as lead_phone,
            v.name as vendor_name
        FROM sales s
        JOIN leads l ON s.lead_id = l.id
        LEFT JOIN vendors v ON s.vendor_id = v.id
        WHERE {' AND '.join(where_clauses)}
        ORDER BY s.created_at DESC
    """
    
    sales = query(query_str, tuple(params))
    
    # Busca itens para cada venda
    sale_ids = [s['id'] for s in sales]
    if sale_ids:
        format_strings = ','.join(['%s'] * len(sale_ids))
        items = query(f"SELECT * FROM sale_items WHERE sale_id IN ({format_strings})", tuple(sale_ids))
        items_by_sale = {}
        for item in items:
            items_by_sale.setdefault(item['sale_id'], []).append(item)
            
        for s in sales:
            s['items'] = items_by_sale.get(s['id'], [])
    else:
        for s in sales:
            s['items'] = []

    return jsonify(sales)


@sales_bp.route('/<int:sale_id>', methods=['GET'])
@login_required
def get_sale_details(sale_id):
    # 1. Busca a venda e dados básicos
    sale = query("""
        SELECT 
            s.*,
            l.name as lead_name, l.phone as lead_phone, l.email as lead_email,
            v.name as vendor_name
        FROM sales s
        JOIN leads l ON s.lead_id = l.id
        LEFT JOIN vendors v ON s.vendor_id = v.id
        WHERE s.id = %s
    """, (sale_id,), fetchone=True)
    
    if not sale:
        return jsonify({'error': 'Venda não encontrada'}), 404
        
    if not has_billing_access(g.user):
        vendor_id = get_user_vendor_id(g.user['id'])
        if sale['vendor_id'] != vendor_id:
            return jsonify({'error': 'Acesso negado'}), 403
        
    # 2. Busca os itens
    sale['items'] = query("SELECT * FROM sale_items WHERE sale_id = %s", (sale_id,))
    
    # 3. Busca e DESCRIPTOGRAFA os dados sensíveis do cliente (AES_DECRYPT)
    # Apenas admin/faturamento pode ver dados sensíveis? Vamos liberar para o dono da venda tbm se necessário, 
    # mas o faturamento é quem emite a nota.
    billing_info = query("""
        SELECT 
            CAST(AES_DECRYPT(cpf_encrypted, %s) AS CHAR) as cpf,
            CAST(AES_DECRYPT(address_encrypted, %s) AS CHAR) as address,
            CAST(AES_DECRYPT(city_encrypted, %s) AS CHAR) as city,
            CAST(AES_DECRYPT(state_encrypted, %s) AS CHAR) as state,
            CAST(AES_DECRYPT(zipcode_encrypted, %s) AS CHAR) as zipcode
        FROM lead_billing_info
        WHERE lead_id = %s
    """, (ENCRYPTION_KEY, ENCRYPTION_KEY, ENCRYPTION_KEY, ENCRYPTION_KEY, ENCRYPTION_KEY, sale['lead_id']), fetchone=True)
    sale['billing_info'] = billing_info
    
    # 4. Busca anexos
    sale['attachments'] = query("SELECT * FROM attachments WHERE sale_id=%s ORDER BY created_at DESC", (sale_id,))
    
    # 5. Busca lembretes
    sale['reminders'] = query("SELECT * FROM sale_reminders WHERE sale_id=%s ORDER BY due_date ASC", (sale_id,))
    
    return jsonify(sale)


@sales_bp.route('/<int:sale_id>/status', methods=['PUT'])
@login_required
def update_sale_status(sale_id):
    if not has_billing_access(g.user):
        return jsonify({'error': 'Acesso negado'}), 403
        
    d = request.json or {}
    new_status = d.get('status')
    
    if new_status not in ('pendente_faturamento', 'faturado', 'enviado'):
        return jsonify({'error': 'Status inválido'}), 400
        
    execute("UPDATE sales SET status=%s WHERE id=%s", (new_status, sale_id))
    
    # Registrar evento no lead atrelado
    sale = query("SELECT lead_id FROM sales WHERE id=%s", (sale_id,), fetchone=True)
    if sale:
        status_msg = 'Faturado (Nota Emitida)' if new_status == 'faturado' else 'Enviado (Produto Despachado)' if new_status == 'enviado' else 'Pendente Faturamento'
        execute("INSERT INTO lead_activities (lead_id, user_id, type, content) VALUES (%s, %s, 'status_change', %s)", (sale['lead_id'], g.user['id'], f"Status da Venda alterado para: {status_msg}"))
    
    log_audit(g.user['id'], 'update_sale_status', target_id=sale_id, details=new_status)
    return jsonify({'message': 'Status da venda atualizado'})

import uuid
from werkzeug.utils import secure_filename

@sales_bp.route('/<int:sale_id>/attachments', methods=['POST'])
@login_required
def add_attachment(sale_id):
    if not has_billing_access(g.user):
        vendor_id = get_user_vendor_id(g.user['id'])
        sale = query("SELECT vendor_id FROM sales WHERE id=%s", (sale_id,), fetchone=True)
        if not sale or sale['vendor_id'] != vendor_id:
            return jsonify({'error': 'Acesso negado'}), 403
        
    if 'file' not in request.files:
        return jsonify({'error': 'Nenhum arquivo enviado'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'Nenhum arquivo selecionado'}), 400
        
    original_name = file.filename
    ext = original_name.rsplit('.', 1)[1].lower() if '.' in original_name else ''
    
    if ext not in ['pdf', 'png', 'jpg', 'jpeg']:
        return jsonify({'error': 'Apenas PDF e Imagens são permitidos'}), 400
        
    filename = secure_filename(f"sale_{sale_id}_att_{uuid.uuid4().hex[:8]}.{ext}")
    
    upload_dir = os.path.join(os.getcwd(), 'uploads')
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)
        
    file_path = os.path.join(upload_dir, filename)
    file.save(file_path)
    file_size = os.path.getsize(file_path)
    
    if file_size > 10 * 1024 * 1024:
        os.remove(file_path)
        return jsonify({'error': 'O arquivo excede o limite de 10MB'}), 400
    
    att_id = execute("INSERT INTO attachments (sale_id, file_name, original_name, file_size, file_type) VALUES (%s, %s, %s, %s, %s)",
            (sale_id, filename, original_name, file_size, ext))
            
    sale = query("SELECT lead_id FROM sales WHERE id=%s", (sale_id,), fetchone=True)
    if sale:
        execute("INSERT INTO lead_activities (lead_id,user_id,type,content) VALUES (%s,%s,'note',%s)",
                (sale['lead_id'], g.user['id'], f"Anexou comprovante na Venda: {original_name}"))
            
    return jsonify({'message': 'Arquivo anexado com sucesso', 'id': att_id, 'file_name': filename, 'original_name': original_name}), 201

@sales_bp.route('/<int:sale_id>/attachments/<int:att_id>', methods=['DELETE'])
@login_required
def delete_attachment(sale_id, att_id):
    if not has_billing_access(g.user):
        vendor_id = get_user_vendor_id(g.user['id'])
        sale = query("SELECT vendor_id FROM sales WHERE id=%s", (sale_id,), fetchone=True)
        if not sale or sale['vendor_id'] != vendor_id:
            return jsonify({'error': 'Acesso negado'}), 403
        
    row = query("SELECT file_name FROM attachments WHERE id=%s AND sale_id=%s", (att_id, sale_id), fetchone=True)
    if not row:
        return jsonify({'error': 'Anexo não encontrado'}), 404
        
    file_path = os.path.join(os.getcwd(), 'uploads', row['file_name'])
    if os.path.exists(file_path):
        os.remove(file_path)
        
    execute("DELETE FROM attachments WHERE id=%s", (att_id,))
    
    return jsonify({'message': 'Anexo removido'})

