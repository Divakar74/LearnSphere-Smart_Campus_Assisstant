from flask import Blueprint, request, jsonify
from services.topic_service import get_user_topics
from services.qa_service import get_summaries
from models import db, Document, Folder, User
from flask_jwt_extended import jwt_required, get_jwt_identity

documents_bp = Blueprint('documents', __name__)

@documents_bp.route('/api/documents', methods=['OPTIONS'])
def options_documents():
    from flask import make_response
    response = make_response()
    response.headers['Access-Control-Allow-Origin'] = 'http://localhost:5173'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response

@documents_bp.route('/api/documents', methods=['GET'])
def documents():
    user_id_str = request.args.get('user_id', 'default_user')

    # Handle user_id conversion
    if user_id_str == 'default_user':
        user_id = None
    else:
        user_id = int(user_id_str)

    # Get all documents for the user from database
    if user_id is None:
        user_documents_query = Document.query.filter(Document.user_id.is_(None)).all()
    else:
        user_documents_query = Document.query.filter_by(user_id=user_id).all()
    user_documents = [{
        'filename': doc.filename,
        'size': doc.size,
        'uploaded_at': doc.uploaded_at.isoformat(),
        'processing_status': doc.processing_status
    } for doc in user_documents_query]

    # For logged-in users, also get documents from 'default_user' to handle migration
    # This ensures existing documents uploaded before user-specific storage are visible
    all_documents = user_documents.copy()
    if user_id is not None:
        default_documents_query = Document.query.filter(Document.user_id.is_(None)).all()
        default_documents = [{
            'filename': doc.filename,
            'size': doc.size,
            'uploaded_at': doc.uploaded_at.isoformat(),
            'processing_status': doc.processing_status
        } for doc in default_documents_query]
        # Merge documents, avoiding duplicates by filename
        existing_filenames = {doc['filename'] for doc in user_documents}
        for doc in default_documents:
            if doc['filename'] not in existing_filenames:
                all_documents.append(doc)

    # Additionally, scan the documents folder for any files that might not be in the database
    import os
    from config import Config
    documents_folder = Config.DOCUMENTS_FOLDER
    if os.path.exists(documents_folder):
        for filename in os.listdir(documents_folder):
            file_path = os.path.join(documents_folder, filename)
            if os.path.isfile(file_path) and filename not in {doc['filename'] for doc in all_documents}:
                stat = os.stat(file_path)
                all_documents.append({
                    'filename': filename,
                    'size': stat.st_size,
                    'uploaded_at': stat.st_mtime,
                    'processing_status': 'unknown'  # Not in database
                })

    # Get user topics
    topics = get_user_topics(user_id)

    # Organize documents by topics
    uncategorized = []
    topic_docs = {}

    # Create a set of documents that are in topics
    documents_in_topics = set()
    for topic in topics:
        for doc in topic['documents']:
            documents_in_topics.add(doc)

    # Separate uncategorized documents
    for doc in all_documents:
        if doc['filename'] not in documents_in_topics:
            uncategorized.append(doc)

    # Get summaries for the user
    user_summaries = get_summaries(user_id)

    # For logged-in users, also get summaries from 'default_user' to handle migration
    all_summaries = user_summaries.copy()
    if user_id != 'default_user':
        default_summaries = get_summaries('default_user')
        # Merge summaries, avoiding duplicates by filename
        existing_filenames = {summary['filename'] for summary in user_summaries}
        for summary in default_summaries:
            if summary['filename'] not in existing_filenames:
                all_summaries.append(summary)

    # Create a summary lookup map
    summary_map = {summary['filename']: summary['summary'] for summary in all_summaries}

    # Organize documents by topics
    for topic in topics:
        topic_docs[topic['name']] = {
            'description': topic.get('description', ''),
            'documents': []
        }
        for doc in all_documents:
            if doc['filename'] in topic['documents']:
                topic_docs[topic['name']]['documents'].append(doc)

    # Get user folders and organize documents by folders
    folders = Folder.query.filter_by(user_id=user_id).all()
    folder_docs = {}
    for folder in folders:
        folder_docs[folder.name] = {
            'description': folder.description,
            'documents': []
        }
        folder_documents = Document.query.filter_by(user_id=user_id, folder_id=folder.id).all()
        for doc in folder_documents:
            folder_docs[folder.name]['documents'].append({
                'filename': doc.filename,
                'size': doc.size,
                'uploaded_at': doc.uploaded_at.isoformat(),
                'summary': summary_map.get(doc.filename, 'Summary not available'),
                'processing_status': doc.processing_status
            })

    # Merge summaries into documents
    for doc in all_documents:
        doc['summary'] = summary_map.get(doc['filename'], 'Summary not available')

    # Similarity groups not implemented
    similarity_groups = []

    return jsonify({
        'uncategorized': uncategorized,
        'topics': topic_docs,
        'folders': folder_docs,
        'similarity_groups': similarity_groups
    }), 200
