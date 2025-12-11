import os
from datetime import timedelta
from dotenv import load_dotenv

# Disable ChromaDB telemetry to clean up logs
os.environ['CHROMA_TELEMETRY_ENABLED'] = 'false'
os.environ['CHROMA_SERVER_NOFILE'] = 'false'

load_dotenv()

# Suppress TensorFlow warnings and set logging level
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

# Disable OpenAI telemetry
os.environ['OPENAI_DO_NOT_TRACK'] = 'true'

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'default_secret_key')
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///' + os.path.join(os.path.dirname(__file__), 'instance', 'learnsphere.db'))
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = 'dev-secret-key-learnsphere'
    JWT_ACCESS_TOKEN_EXPIRES = 86400  # 24 hours
    JWT_COOKIE_CSRF_PROTECT = False
    CHROMADB_PATH = os.path.join(os.path.dirname(__file__), 'chromadb_data')
    DOCUMENTS_FOLDER = os.path.join(os.path.dirname(__file__), 'documents')
    PROCESSED_FOLDER = os.path.join(os.path.dirname(__file__), 'processed')
    SUMMARIES_FILE = os.path.join(os.path.dirname(__file__), 'summaries.json')
    QUIZZES_FILE = os.path.join(os.path.dirname(__file__), 'quizzes.json')
    TOPICS_FILE = os.path.join(os.path.dirname(__file__), 'topics.json')
    PROGRESS_FILE = os.path.join(os.path.dirname(__file__), 'progress.json')
    DETAILED_SUMMARIES_FILE = os.path.join(os.path.dirname(__file__), 'detailed_summaries.json')
    CHATS_FILE = os.path.join(os.path.dirname(__file__), 'chats.json')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    ALLOWED_EXTENSIONS = {'pdf', 'docx', 'pptx', 'txt'}
