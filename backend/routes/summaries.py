from flask import Blueprint, request, jsonify
from services.qa_service import get_summaries, get_detailed_summaries, generate_knowledge_graph, get_detailed_summaries_cached
import json

summaries_bp = Blueprint('summaries', __name__)

@summaries_bp.route('/api/summaries', methods=['GET'])
def summaries():
    user_id = request.args.get('user_id', 'default_user')

    # Get summaries for the user
    user_summaries = get_summaries(user_id)

    # For logged-in users, also get summaries from 'default_user' to handle migration
    # This ensures existing summaries uploaded before user-specific storage are visible
    all_summaries = user_summaries.copy()
    if user_id != 'default_user':
        default_summaries = get_summaries('default_user')
        # Merge summaries, avoiding duplicates by filename
        existing_filenames = {summary['filename'] for summary in user_summaries}
        for summary in default_summaries:
            if summary['filename'] not in existing_filenames:
                all_summaries.append(summary)

    return jsonify(all_summaries), 200

@summaries_bp.route('/api/generate-summary', methods=['POST'])
def generate_summary():
    data = request.get_json()
    user_id = data.get('user_id', 'default_user')
    filename = data.get('filename')

    if not filename:
        return jsonify({'error': 'Filename is required'}), 400

    detailed_summary = get_detailed_summaries_cached(user_id, filename)
    return jsonify({'filename': filename, 'detailed_summary': detailed_summary}), 200

@summaries_bp.route('/api/document-categories', methods=['GET'])
def document_categories():
    user_id = request.args.get('user_id', 'default_user')
    categories = categorize_documents_by_similarity(user_id)
    return jsonify(categories), 200

@summaries_bp.route('/api/knowledge-graph', methods=['GET'])
def knowledge_graph():
    user_id = request.args.get('user_id', 'default_user')
    topic = request.args.get('topic')

    graph_data = generate_knowledge_graph(user_id, topic)
    return jsonify(graph_data), 200
