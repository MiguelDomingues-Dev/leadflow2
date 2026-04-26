from flask import Blueprint, jsonify, g
from database import query
from auth_middleware import admin_required

audit_bp = Blueprint('audit', __name__)

@audit_bp.route('/', methods=['GET'])
@admin_required
def get_audit_logs():
    rows = query("""
        SELECT a.*, u.name as user_name 
        FROM audit_logs a 
        LEFT JOIN users u ON a.user_id = u.id 
        ORDER BY a.created_at DESC LIMIT 100
    """)
    return jsonify(rows)
