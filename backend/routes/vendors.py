from flask import Blueprint, request, jsonify
from database import query, execute
from auth_middleware import login_required, admin_required

vendors_bp = Blueprint('vendors', __name__)

@vendors_bp.route('/', methods=['GET'])
@login_required
def list_vendors():
    sql = """
        SELECT v.*, u.role 
        FROM vendors v
        LEFT JOIN users u ON v.user_id = u.id
        WHERE v.active=1 
        ORDER BY v.name ASC
    """
    return jsonify(query(sql))

@vendors_bp.route('/', methods=['POST'])
@admin_required
def create_vendor():
    d = request.json or {}
    if not d.get('name','').strip(): return jsonify({'error': 'Nome obrigatorio'}), 400
    vid = execute("INSERT INTO vendors (name,user_id) VALUES (%s,%s)",
                  (d['name'].strip(), d.get('user_id') or None))
    return jsonify({'id': vid, 'name': d['name']}), 201

@vendors_bp.route('/<int:vid>', methods=['PUT'])
@admin_required
def update_vendor(vid):
    d = request.json or {}
    execute("UPDATE vendors SET name=%s,active=%s WHERE id=%s",
            (d.get('name',''), d.get('active',1), vid))
    return jsonify({'message': 'Atualizado'})

@vendors_bp.route('/<int:vid>', methods=['DELETE'])
@admin_required
def delete_vendor(vid):
    execute("UPDATE vendors SET active=0 WHERE id=%s", (vid,))
    return jsonify({'message': 'Desativado'})

@vendors_bp.route('/<int:vid>/history', methods=['GET'])
@admin_required
def vendor_history(vid):
    # Get vendor info
    vendor = query("SELECT * FROM vendors WHERE id=%s", (vid,), fetchone=True)
    if not vendor: return jsonify({'error': 'Vendedor não encontrado'}), 404
    
    # Get leads handled by this vendor
    leads_sdr = query("SELECT COUNT(*) as c FROM leads WHERE sdr_id=%s", (vid,), fetchone=True)['c']
    leads_closer = query("SELECT COUNT(*) as c FROM leads WHERE vendor_id=%s", (vid,), fetchone=True)['c']
    
    # Get sales closed by this vendor
    sales = query("""
        SELECT 
            s.id, s.created_at, s.total_amount, s.final_amount, s.amount_paid, s.remaining_balance, s.status,
            l.name as lead_name
        FROM sales s
        LEFT JOIN leads l ON s.lead_id = l.id
        WHERE s.vendor_id = %s
        ORDER BY s.created_at DESC
    """, (vid,))
    
    total_sales = len(sales)
    total_revenue = sum(float(s['final_amount']) for s in sales)
    total_received = sum(float(s['amount_paid']) for s in sales)
    total_pending = sum(float(s['remaining_balance']) for s in sales)
    
    return jsonify({
        'vendor': vendor,
        'metrics': {
            'leads_as_sdr': leads_sdr,
            'leads_as_closer': leads_closer,
            'total_sales_count': total_sales,
            'total_revenue': total_revenue,
            'total_received': total_received,
            'total_pending': total_pending
        },
        'sales': sales
    })
