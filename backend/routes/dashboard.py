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

    total  = cnt()
    hoje   = cnt(" AND DATE(l.created_at)=CURDATE()")
    semana = cnt(" AND l.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)")
    mes    = cnt(" AND l.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)")
    mes_convertidos = cnt(" AND l.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND s.is_final=1 AND s.color='#22c55e'")

    funil = query(f"""
        SELECT s.id, s.name, s.color, s.is_final, COUNT(l.id) AS n
        FROM lead_statuses s
        LEFT JOIN leads l ON l.status_id=s.id{(' AND l.vendor_id='+str(query('SELECT id FROM vendors WHERE user_id=%s AND active=1',(user['id'],),fetchone=True)['id'])) if vendor_filter else ''}
        WHERE s.active=1 GROUP BY s.id,s.name,s.color,s.is_final ORDER BY s.sort_order
    """)

    por_plataforma = query(f"""
        SELECT p.name, p.color, p.icon, COUNT(l.id) AS total,
               SUM(CASE WHEN s.is_final=1 AND s.color='#22c55e' THEN 1 ELSE 0 END) AS convertidos
        FROM leads l JOIN platforms p ON l.platform_id=p.id
        LEFT JOIN lead_statuses s ON l.status_id=s.id
        WHERE 1=1{vendor_filter} GROUP BY p.id,p.name,p.color,p.icon ORDER BY total DESC
    """)

    por_vendedor = query(f"""
        SELECT COALESCE(v.name,'Sem vendedor') AS name, COUNT(l.id) AS total,
               SUM(CASE WHEN s.is_final=1 AND s.color='#22c55e' THEN 1 ELSE 0 END) AS convertidos
        FROM leads l
        LEFT JOIN vendors v ON l.vendor_id=v.id
        LEFT JOIN lead_statuses s ON l.status_id=s.id
        WHERE 1=1{vendor_filter} GROUP BY v.id,v.name ORDER BY total DESC
    """) if user['role'] == 'admin' else []

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

    # próximos contatos agendados
    proximos = query(f"""
        SELECT l.id, l.name, l.phone, DATE_FORMAT(l.next_contact, '%%Y-%%m-%%d') as next_contact, s.name AS status_name, s.color AS status_color
        FROM leads l LEFT JOIN lead_statuses s ON l.status_id=s.id
        WHERE l.next_contact IS NOT NULL AND l.next_contact >= CURDATE(){vendor_filter}
        ORDER BY l.next_contact ASC LIMIT 10
    """)

    conv_rate = []
    for p in por_plataforma:
        rate = round((p['convertidos'] or 0) / p['total'] * 100, 1) if p['total'] else 0
        conv_rate.append({**dict(p), 'taxa': rate, 'convertidos': p['convertidos'] or 0})

    goal_row = query("SELECT `value` FROM settings WHERE `key`='sales_goal'", fetchone=True)
    goal = int(goal_row['value']) if goal_row else 50

    return jsonify({
        'totais': {'total': total, 'hoje': hoje, 'semana': semana, 'mes': mes, 'esquecidos': esquecidos, 'goal': goal, 'mes_convertidos': mes_convertidos},
        'funil': [dict(f) for f in funil],
        'por_plataforma': conv_rate,
        'por_vendedor': [dict(r) for r in por_vendedor],
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
