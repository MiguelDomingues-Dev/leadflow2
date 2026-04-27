from flask import Flask, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
import os
from datetime import datetime

load_dotenv()

from routes.auth      import auth_bp
from routes.users     import users_bp
from routes.leads     import leads_bp
from routes.platforms import platforms_bp
from routes.vendors   import vendors_bp
from routes.statuses  import statuses_bp
from routes.dashboard import dashboard_bp
from routes.settings  import settings_bp
from routes.audit     import audit_bp
from routes.links     import links_bp
from routes.products  import products_bp
from routes.sales     import sales_bp
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}}, supports_credentials=True)

app.register_blueprint(auth_bp,      url_prefix='/api/auth')
app.register_blueprint(users_bp,     url_prefix='/api/users')
app.register_blueprint(leads_bp,     url_prefix='/api/leads')
app.register_blueprint(platforms_bp, url_prefix='/api/platforms')
app.register_blueprint(vendors_bp,   url_prefix='/api/vendors')
app.register_blueprint(statuses_bp,  url_prefix='/api/statuses')
app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
app.register_blueprint(settings_bp,  url_prefix='/api/settings')
app.register_blueprint(audit_bp,     url_prefix='/api/audit')
app.register_blueprint(links_bp,     url_prefix='/api/links')
app.register_blueprint(products_bp,  url_prefix='/api/products')
app.register_blueprint(sales_bp,     url_prefix='/api/sales')

# Clean redirect route for tracked links
from routes.links import redirect_link
app.add_url_rule('/t/<slug>', view_func=redirect_link)

@app.route('/api/health')
def health():
    return {'status': 'ok', 'app': 'LeadFlow', 'version': '2.0.0'}

@app.route('/api/uploads/<path:filename>')
def serve_uploads(filename):
    return send_from_directory('uploads', filename)

@app.errorhandler(Exception)
def handle_exception(e):
    # Log error to file
    with open('error.log', 'a') as f:
        import traceback
        f.write(f"\n--- {datetime.now()} ---\n")
        f.write(traceback.format_exc())
    
    # Return JSON with CORS headers manually to be safe
    from flask import jsonify
    response = jsonify({'error': 'Internal Server Error', 'details': str(e)})
    response.status_code = 500
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

if __name__ == '__main__':
    port  = int(os.getenv('FLASK_PORT', 4031))
    debug = os.getenv('FLASK_ENV') == 'development'
    print(f"LeadFlow API v2 → http://0.0.0.0:{port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
