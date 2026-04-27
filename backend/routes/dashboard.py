from flask import Blueprint, jsonify, request, g
from database import query
from datetime import datetime, timedelta
from auth_middleware import admin_required, login_required

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/', methods=['GET'])
@login_required
def get_dashboard():
    user = g.user
    vendor_filter = ""
    params_base = []
    if user['role'] == 'vendor':
        vendor = query("SELECT id FROM vendors WHERE user_id=%s AND active=1", (user['id'],), fetchone=True)
        if vendor:
            vendor_filter = f" AND l.vendor_id={vendor['id']}"

    def cnt(where=""):
        return query(f"SELECT COUNT(*) AS n FROM leads l LEFT JOIN lead_statuses s ON l.status_id=s.id WHERE 1=1{vendor_filter}{where}", fetchone=True)['n']

    # Métricas Gerais
    total  = cnt()
    hoje   = cnt(" AND DATE(l.created_at)=CURDATE()")
    semana = cnt(" AND l.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)")
    mes    = cnt(" AND l.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)")
    
    # Métricas de SDR (Qualificação)
    # Consideramos qualificado se status_id >= 3 (Qualificado)
    mes_qualificados = cnt(" AND l.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND l.status_id >= 3")
    
    # Métricas de Closer (Venda)
    mes_convertidos = cnt(" AND l.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND s.is_final=1 AND s.color='#22c55e'")

    funil = query(f"""
        SELECT s.id, s.name, s.color, s.is_final, COUNT(l.id) AS n
        FROM lead_statuses s
        LEFT JOIN leads l ON l.status_id=s.id{(' AND l.vendor_id='+str(query('SELECT id FROM vendors WHERE user_id=%s AND active=1',(user['id'],),fetchone=True)['id'])) if user['role'] == 'vendor' else ((' AND l.sdr_id='+str(query('SELECT id FROM vendors WHERE user_id=%s AND active=1',(user['id'],),fetchone=True)['id'])) if user['role'] == 'sdr' else '')}
        WHERE s.active=1 GROUP BY s.id,s.name,s.color,s.is_final ORDER BY s.sort_order
    """)

    por_plataforma = query(f"""
        SELECT p.name, p.color, p.icon, COUNT(l.id) AS total,
               SUM(CASE WHEN s.id >= 3 THEN 1 ELSE 0 END) AS qualificados,
               SUM(CASE WHEN s.is_final=1 AND s.color='#22c55e' THEN 1 ELSE 0 END) AS convertidos
        FROM leads l JOIN platforms p ON l.platform_id=p.id
        LEFT JOIN lead_statuses s ON l.status_id=s.id
        WHERE 1=1{vendor_filter} GROUP BY p.id,p.name,p.color,p.icon ORDER BY total DESC
    """)

    # Para Admin, mostramos ranking de SDR e Closer separado
    ranking_sdr = []
    ranking_closer = []
    if user['role'] == 'admin':
        # Auto-migrate sales columns if they don't exist yet
        try:
            query("SELECT final_amount FROM sales LIMIT 1")
        except Exception:
            try:
                query("""
                    ALTER TABLE sales 
                    ADD COLUMN payment_method ENUM('pix', 'credit_card', 'boleto', 'transfer') DEFAULT 'pix',
                    ADD COLUMN installments INT DEFAULT 1,
                    ADD COLUMN discount DECIMAL(10,2) DEFAULT 0.00,
                    ADD COLUMN final_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER total_amount,
                    ADD COLUMN observations TEXT NULL
                """)
                query("UPDATE sales SET final_amount = total_amount")
            except Exception:
                pass

        ranking_sdr = query("""
            SELECT v.name, COUNT(l.id) AS total,
                   SUM(CASE WHEN s.id >= 3 THEN 1 ELSE 0 END) AS qualificados
            FROM vendors v
            JOIN users u ON v.user_id = u.id AND u.role = 'sdr'
            LEFT JOIN leads l ON l.sdr_id = v.id
            LEFT JOIN lead_statuses s ON l.status_id = s.id
            WHERE v.active=1 GROUP BY v.id, v.name ORDER BY qualificados DESC
        """)
        try:
            ranking_closer = query("""
                SELECT v.name, COUNT(DISTINCT l.id) AS total,
                       SUM(CASE WHEN s.is_final=1 AND s.color='#22c55e' THEN 1 ELSE 0 END) AS convertidos,
                       COALESCE(SUM(s2.final_amount), 0) as receita
                FROM vendors v
                JOIN users u ON v.user_id = u.id AND u.role = 'vendor'
                LEFT JOIN leads l ON l.vendor_id = v.id
                LEFT JOIN lead_statuses s ON l.status_id = s.id
                LEFT JOIN sales s2 ON s2.vendor_id = v.id AND s2.lead_id = l.id
                WHERE v.active=1 GROUP BY v.id, v.name ORDER BY receita DESC, convertidos DESC
            """)
        except Exception:
            ranking_closer = query("""
                SELECT v.name, COUNT(DISTINCT l.id) AS total,
                       SUM(CASE WHEN s.is_final=1 AND s.color='#22c55e' THEN 1 ELSE 0 END) AS convertidos,
                       0 as receita
                FROM vendors v
                JOIN users u ON v.user_id = u.id AND u.role = 'vendor'
                LEFT JOIN leads l ON l.vendor_id = v.id
                LEFT JOIN lead_statuses s ON l.status_id = s.id
                WHERE v.active=1 GROUP BY v.id, v.name ORDER BY convertidos DESC
            """)

        # Receita total
        try:
            receita_total = query("SELECT COALESCE(SUM(final_amount), 0) as r FROM sales", fetchone=True)['r']
            receita_mes = query("SELECT COALESCE(SUM(final_amount), 0) as r FROM sales WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)", fetchone=True)['r']
        except Exception:
            receita_total = 0
            receita_mes = 0
    else:
        receita_total = 0
        receita_mes = 0

    serie = []
    for i in range(13,-1,-1):
        d = (datetime.now().date() - timedelta(days=i))
        n = query(f"SELECT COUNT(*) AS n FROM leads l WHERE DATE(l.created_at)=%s{vendor_filter}", (d,), fetchone=True)['n']
        serie.append({'date': d.strftime('%d/%m'), 'total': n})

    follow = query(f"SELECT follow_time, COUNT(*) AS n FROM leads l WHERE 1=1{vendor_filter} GROUP BY follow_time")

    esquecidos = 0
    if user['role'] == 'admin':
        status_novo = query("SELECT id FROM lead_statuses WHERE name='Novo' LIMIT 1", fetchone=True)
        if status_novo:
            esquecidos = cnt(f" AND l.status_id={status_novo['id']} AND l.created_at < DATE_SUB(NOW(), INTERVAL 48 HOUR)")

    proximos = query(f"""
        SELECT l.id, l.name, l.phone, DATE_FORMAT(l.next_contact, '%%Y-%%m-%%d') as next_contact, s.name AS status_name, s.color AS status_color
        FROM leads l LEFT JOIN lead_statuses s ON l.status_id=s.id
        WHERE l.next_contact IS NOT NULL AND l.next_contact >= CURDATE(){vendor_filter}
        ORDER BY l.next_contact ASC LIMIT 10
    """)

    conv_rate = []
    for p in por_plataforma:
        rate = round((p['convertidos'] or 0) / p['total'] * 100, 1) if p['total'] else 0
        conv_rate.append({**dict(p), 'taxa': rate, 'convertidos': p['convertidos'] or 0, 'qualificados': p['qualificados'] or 0})

    _sdr_row = query("SELECT `value` FROM settings WHERE `key`='sdr_goal'", fetchone=True)
    _closer_row = query("SELECT `value` FROM settings WHERE `key`='closer_goal'", fetchone=True)
    sdr_goal = int(_sdr_row['value']) if _sdr_row and _sdr_row.get('value') else 100
    closer_goal = int(_closer_row['value']) if _closer_row and _closer_row.get('value') else 30

    return jsonify({
        'totais': {
            'total': total, 'hoje': hoje, 'semana': semana, 'mes': mes, 
            'esquecidos': esquecidos, 
            'sdr_goal': sdr_goal, 'mes_qualificados': mes_qualificados,
            'closer_goal': closer_goal, 'mes_convertidos': mes_convertidos,
            'receita_total': receita_total, 'receita_mes': receita_mes
        },
        'funil': [dict(f) for f in funil],
        'por_plataforma': conv_rate,
        'ranking_sdr': [dict(r) for r in ranking_sdr],
        'ranking_closer': [dict(r) for r in ranking_closer],
        'serie_14d': serie,
        'follow_time': [dict(r) for r in follow],
        'proximos_contatos': [dict(r) for r in proximos],
    })

@dashboard_bp.route('/top-videos', methods=['GET'])
@login_required
def top_videos():
    rows = query("""
        SELECT specific_video, COUNT(*) AS n, p.name AS platform_name, p.color
        FROM leads l JOIN platforms p ON l.platform_id=p.id
        WHERE specific_video IS NOT NULL AND specific_video!=''
        GROUP BY specific_video, p.name, p.color ORDER BY n DESC LIMIT 15
    """)
    return jsonify(rows)
