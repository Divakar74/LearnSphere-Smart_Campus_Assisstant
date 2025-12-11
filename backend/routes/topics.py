from flask import Blueprint, request, jsonify
from services.topic_service import (
    get_user_topics, create_topic, add_document_to_topic,
    get_topic_documents, delete_topic, categorize_document,
    auto_categorize_all_documents
)

topics_bp = Blueprint('topics', __name__)

@topics_bp.route('/api/topics', methods=['GET'])
def get_topics():
    """
    Get all topics for a user.
    """
    user_id = request.args.get('user_id', 'default_user')
    topics = get_user_topics(user_id)
    return jsonify(topics), 200

@topics_bp.route('/api/topics', methods=['POST'])
def create_topic_endpoint():
    """
    Create a new topic.
    """
    data = request.get_json()
    user_id = data.get('user_id', 'default_user')
    topic_name = data.get('name')
    description = data.get('description', '')

    if not topic_name:
        return jsonify({'error': 'Topic name is required'}), 400

    result = create_topic(user_id, topic_name, description)
    if result.get('error'):
        return jsonify(result), 400

    return jsonify(result), 201

@topics_bp.route('/api/topics/<topic_name>/documents', methods=['POST'])
def add_document_to_topic_endpoint(topic_name):
    """
    Add a document to a topic.
    """
    data = request.get_json()
    user_id = data.get('user_id', 'default_user')
    filename = data.get('filename')

    if not filename:
        return jsonify({'error': 'Filename is required'}), 400

    result = add_document_to_topic(user_id, topic_name, filename)
    if result.get('error'):
        return jsonify(result), 400

    return jsonify(result), 200

@topics_bp.route('/api/topics/<topic_name>/documents', methods=['GET'])
def get_topic_documents_endpoint(topic_name):
    """
    Get all documents in a topic.
    """
    user_id = request.args.get('user_id', 'default_user')
    documents = get_topic_documents(user_id, topic_name)
    return jsonify({'documents': documents}), 200

@topics_bp.route('/api/topics/<topic_name>', methods=['DELETE'])
def delete_topic_endpoint(topic_name):
    """
    Delete a topic.
    """
    user_id = request.args.get('user_id', 'default_user')
    result = delete_topic(user_id, topic_name)
    if result.get('error'):
        return jsonify(result), 400

    return jsonify(result), 200

@topics_bp.route('/api/categorize-document', methods=['POST'])
def categorize_document_endpoint():
    """
    Automatically categorize a single document.
    """
    data = request.get_json()
    user_id = data.get('user_id', 'default_user')
    filename = data.get('filename')

    if not filename:
        return jsonify({'error': 'Filename is required'}), 400

    result = categorize_document(user_id, filename)
    if result.get('error'):
        return jsonify(result), 500

    return jsonify(result), 200

@topics_bp.route('/api/auto-categorize', methods=['POST'])
def auto_categorize_endpoint():
    """
    Automatically categorize all uncategorized documents.
    """
    data = request.get_json()
    user_id = data.get('user_id', 'default_user')

    result = auto_categorize_all_documents(user_id)
    return jsonify(result), 200
