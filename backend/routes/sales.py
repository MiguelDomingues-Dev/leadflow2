import os
from flask import Blueprint, request, jsonify, g
from database import query, execute, log_audit
from auth_middleware import login_required

sales_bp = Blueprint('sales', __name__)
ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY', 'default-dev-key')

def has_billing_access(user):
    return user['role'] in ('admin', 'billing')

@sales_bp.route('/', methods=['POST'])
@login_required
def create_sale():
    d = request.json or {}
    lead_id = d.get('lead_id')
    items = d.get('items', [])
    billing_info = d.get('billing_info', {})
    
    payment_method = d.get('payment_method', 'pix')
    installments = int(d.get('installments', 1))
    discount = float(d.get('discount', 0))
    observations = d.get('observations', '')
    
    if not lead_id or not items:
        return jsonify({'error': 'Lead ID e itens são obrigatórios'}), 400
        
    # Calcular o valor total baseado nos itens
    total_amount = 0
    for item in items:
        total_amount += float(item.get('unit_price', 0)) * int(item.get('quantity', 1))
        
    final_amount = total_amount - discount
        
    # Encontrar o vendor_id logado
    vendor_row = query("SELECT id FROM vendors WHERE user_id=%s AND active=1", (g.user['id'],), fetchone=True)
    vendor_id = vendor_row['id'] if vendor_row else None
        
    # Auto-migrate if columns don't exist
    try:
        query("SELECT payment_method FROM sales LIMIT 1")
    except Exception:
        execute("""
            ALTER TABLE sales 
            ADD COLUMN payment_method ENUM('pix', 'credit_card', 'boleto', 'transfer') DEFAULT 'pix',
            ADD COLUMN installments INT DEFAULT 1,
            ADD COLUMN discount DECIMAL(10,2) DEFAULT 0.00,
            ADD COLUMN final_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER total_amount,
            ADD COLUMN observations TEXT NULL
        """)
        execute("UPDATE sales SET final_amount = total_amount")

    # 1. Registrar a Venda
    sale_id = execute("""
        INSERT INTO sales (lead_id, vendor_id, total_amount, payment_method, installments, discount, final_amount, observations, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'pendente_faturamento')
    """, (lead_id, vendor_id, total_amount, payment_method, installments, discount, final_amount, observations))
    
    # 2. Registrar os Itens da Venda
    for item in items:
        qty = int(item.get('quantity', 1))
        uprice = float(item.get('unit_price', 0))
        tprice = uprice * qty
        execute("""
            INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (sale_id, item.get('product_id'), item.get('product_name', 'Produto Genérico'), qty, uprice, tprice))
        
    # 3. Registrar e Criptografar Dados Sensíveis (Faturamento)
    # Delete previous billing info if exists for this lead to avoid UNIQUE constraint violation on re-entry
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
    
    # Adicionar atividade no lead
    product_names = ", ".join([f"{int(i.get('quantity', 1))}x {i.get('product_name', 'Produto')}" for i in items])
    activity_msg = f"🛒 Venda concluída e enviada ao Faturamento! Valor: R$ {total_amount:.2f} | Produtos: {product_names}"
    execute("INSERT INTO lead_activities (lead_id, user_id, type, content) VALUES (%s, %s, 'status_change', %s)", (lead_id, g.user['id'], activity_msg))
    
    log_audit(g.user['id'], 'create_sale', target_id=sale_id, details=f"Lead: {lead_id}, Total: {total_amount}")
    return jsonify({'id': sale_id, 'message': 'Venda registrada com sucesso e enviada ao Faturamento'}), 201


@sales_bp.route('/', methods=['GET'])
@login_required
def get_sales():
    if not has_billing_access(g.user):
        return jsonify({'error': 'Acesso negado'}), 403
        
    status = request.args.get('status')
    
    query_str = """
        SELECT 
            s.*,
            l.name as lead_name, l.phone as lead_phone,
            v.name as vendor_name
        FROM sales s
        JOIN leads l ON s.lead_id = l.id
        LEFT JOIN vendors v ON s.vendor_id = v.id
    """
    params = ()
    if status:
        query_str += " WHERE s.status = %s"
        params = (status,)
        
    query_str += " ORDER BY s.created_at DESC"
    
    sales = query(query_str, params)
    
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
    if not has_billing_access(g.user):
        return jsonify({'error': 'Acesso negado'}), 403
        
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
        
    # 2. Busca os itens
    sale['items'] = query("SELECT * FROM sale_items WHERE sale_id = %s", (sale_id,))
    
    # 3. Busca e DESCRIPTOGRAFA os dados sensíveis do cliente (AES_DECRYPT)
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
    
    sale['billing_info'] = billing_info or {}
    
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
