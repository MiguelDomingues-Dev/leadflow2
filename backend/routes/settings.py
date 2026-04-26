from flask import Blueprint, jsonify, request, g
from database import query, execute, log_audit
from auth_middleware import admin_required

settings_bp = Blueprint('settings', __name__)

@settings_bp.route('/', methods=['GET'])
@admin_required
def get_settings():
    rows = query("SELECT * FROM settings")
    res = {r['key']: r['value'] for r in rows}
    return jsonify(res)

@settings_bp.route('/', methods=['POST'])
@admin_required
def update_settings():
    d = request.json or {}
    for k, v in d.items():
        execute("INSERT INTO settings (`key`, `value`) VALUES (%s, %s) ON DUPLICATE KEY UPDATE `value`=%s", (k, str(v), str(v)))
    
    log_audit(g.user['id'], 'update_settings', details=str(list(d.keys())))
    return jsonify({'message': 'Configurações atualizadas'})
