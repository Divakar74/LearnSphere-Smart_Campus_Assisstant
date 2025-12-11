from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from services.embedding_service import search_similar_chunks
from services.topic_service import get_user_topics
import os
import json

search_bp = Blueprint('search', __name__)

@search_bp.route('/api/search', methods=['GET'])
@jwt_required()
def search():
    try:
        user_id = get_jwt_identity()
        query = request.args.get('q', '')
        topic_filter = request.args.get('topic')
        file_type_filter = request.args.get('file_type')
        limit = int(request.args.get('limit', 10))

        if not query:
            return jsonify({'error': 'Query parameter "q" is required'}), 400

        # Get semantic search results
        semantic_results = search_similar_chunks(query, user_id, top_k=limit)

        # Apply filters
        filtered_results = []
        for result in semantic_results:
            # Topic filter
            if topic_filter:
                user_topics = get_user_topics(user_id)
                topic_docs = set()
                for topic in user_topics:
                    if topic['name'] == topic_filter:
                        topic_docs.update(topic['documents'])
                if result['filename'] not in topic_docs:
                    continue

            # File type filter
            if file_type_filter:
                if not result['filename'].lower().endswith(f'.{file_type_filter.lower()}'):
                    continue

            filtered_results.append(result)

        # Keyword search fallback (simple text search in processed files)
        keyword_results = []
        if len(filtered_results) < limit:
            processed_dir = os.path.join(os.path.dirname(__file__), '..', 'processed')
            if os.path.exists(processed_dir):
                for filename in os.listdir(processed_dir):
                    if filename.endswith('.txt'):
                        file_path = os.path.join(processed_dir, filename)
                        try:
                            with open(file_path, 'r', encoding='utf-8') as f:
                                content = f.read().lower()
                                if query.lower() in content:
                                    # Check if already in semantic results
                                    if not any(r['filename'] == filename for r in filtered_results):
                                        keyword_results.append({
                                            'filename': filename,
                                            'chunk': f"Contains keyword: {query}",
                                            'similarity_score': 0.5  # Lower score for keyword matches
                                        })
                        except Exception as e:
                            continue

        # Combine and sort results
        all_results = filtered_results + keyword_results[:limit - len(filtered_results)]
        all_results.sort(key=lambda x: x.get('similarity_score', 0), reverse=True)

        return jsonify({
            'query': query,
            'results': all_results[:limit],
            'total_results': len(all_results)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@search_bp.route('/api/search/filters', methods=['GET'])
@jwt_required()
def get_search_filters():
    try:
        user_id = get_jwt_identity()

        # Get available topics
        topics = get_user_topics(user_id)
        topic_names = [topic['name'] for topic in topics]

        # Get available file types from documents
        documents_dir = os.path.join(os.path.dirname(__file__), '..', 'documents')
        file_types = set()
        if os.path.exists(documents_dir):
            for filename in os.listdir(documents_dir):
                if '.' in filename:
                    ext = filename.split('.')[-1].lower()
                    file_types.add(ext)

        return jsonify({
            'topics': topic_names,
            'file_types': list(file_types)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
