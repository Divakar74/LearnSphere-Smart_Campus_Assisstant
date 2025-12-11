import os
import warnings

# Set environment variables before any other imports to suppress TensorFlow warnings
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'  # More aggressive logging suppression
os.environ['OPENAI_DO_NOT_TRACK'] = 'true'

# Suppress all warnings
warnings.filterwarnings('ignore')

# Additional TensorFlow logging suppression
import logging
logging.getLogger('tensorflow').setLevel(logging.ERROR)
logging.getLogger('tf_keras').setLevel(logging.ERROR)

from flask import Flask, request, make_response, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import Config
from models import db, User, Flashcard, Quiz, QuizAttempt, LearningProgress, TopicMastery, Folder, Document
from routes.upload import upload_bp
from routes.chat import chat_bp
from routes.summaries import summaries_bp
from routes.quiz import quiz_bp
from routes.documents import documents_bp
from routes.topics import topics_bp
from routes.progress import progress_bp
from routes.search import search_bp
from routes.flashcards import flashcards_bp
from routes.auth import auth_bp
from routes.folders import folders_bp

app = Flask(__name__)
app.config.from_object(Config)
CORS(app, origins=["http://localhost:5173"], supports_credentials=True, allow_headers=["Content-Type", "Authorization"], methods=["GET", "POST", "OPTIONS"])

@app.before_request
def handle_options():
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:5173'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response

# Initialize extensions
db.init_app(app)
print(f"DEBUG: JWT_SECRET_KEY: {app.config.get('JWT_SECRET_KEY')}")
print(f"DEBUG: SECRET_KEY: {app.config.get('SECRET_KEY')}")
jwt = JWTManager(app)

@jwt.invalid_token_loader
def invalid_token_callback(error):
    print(f"DEBUG: Invalid token error: {repr(error)}")
    return jsonify({'error': 'Invalid token'}), 422

@jwt.expired_token_loader
def expired_token_callback(error):
    print(f"DEBUG: Expired token error: {repr(error)}")
    return jsonify({'error': 'Token expired'}), 401

@jwt.unauthorized_loader
def unauthorized_callback(error):
    print(f"DEBUG: Unauthorized error: {repr(error)}")
    return jsonify({'error': 'Missing token'}), 401

# Create database tables
with app.app_context():
    db.create_all()

app.register_blueprint(upload_bp)
app.register_blueprint(chat_bp)
app.register_blueprint(summaries_bp)
app.register_blueprint(quiz_bp)
app.register_blueprint(documents_bp)
app.register_blueprint(topics_bp)
app.register_blueprint(progress_bp)
app.register_blueprint(search_bp)
app.register_blueprint(flashcards_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(folders_bp)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
