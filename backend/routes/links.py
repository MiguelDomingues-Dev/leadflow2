from flask import Blueprint, request, jsonify, redirect
from database import query, execute, log_audit
from auth_middleware import login_required
import string
import random

links_bp = Blueprint('links', __name__)

def generate_slug(length=6):
    chars = string.ascii_letters + string.digits
    while True:
        slug = ''.join(random.choice(chars) for _ in range(length))
        # Check if slug exists
        if not query("SELECT id FROM tracked_links WHERE slug=%s", (slug,), fetchone=True):
            return slug

@links_bp.route('/generate', methods=['POST'])
@login_required
def generate_link():
    d = request.json or {}
    lead_id = d.get('lead_id')
    url = d.get('url')

    if not lead_id or not url:
        return jsonify({'error': 'lead_id and url are required'}), 400

    # Check if lead exists
    lead = query("SELECT name FROM leads WHERE id=%s", (lead_id,), fetchone=True)
    if not lead:
        return jsonify({'error': 'Lead not found'}), 404

    slug = generate_slug()
    execute("INSERT INTO tracked_links (lead_id, slug, original_url) VALUES (%s, %s, %s)",
            (lead_id, slug, url))
    
    return jsonify({
        'slug': slug,
        'tracked_url': f"/t/{slug}" # We will handle the full domain in the frontend
    }), 201

# This route should be registered in app.py to be at /t/<slug>
@links_bp.route('/t/<slug>')
def redirect_link(slug):
    link = query("SELECT * FROM tracked_links WHERE slug=%s", (slug,), fetchone=True)
    if not link:
        return "Link not found", 404

    # Update click count
    execute("UPDATE tracked_links SET clicks = clicks + 1 WHERE id=%s", (link['id'],))

    # Log activity
    content = f"Link visualizado: {link['original_url'][:50]}..."
    execute("INSERT INTO lead_activities (lead_id, type, content) VALUES (%s, 'link_click', %s)",
            (link['lead_id'], content))

    return redirect(link['original_url'])
