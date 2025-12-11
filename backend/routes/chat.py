from flask import Blueprint, request, jsonify
from services.chat_service import get_user_chats, save_chat, get_chat_by_id, delete_chat
from services.qa_service import ask_question
from flask_jwt_extended import jwt_required, get_jwt_identity

chat_bp = Blueprint('chat', __name__)

@chat_bp.route('/api/chats', methods=['GET'])
@jwt_required()
def get_chats():
    try:
        user_id = get_jwt_identity()
        chats = get_user_chats(user_id)
        return jsonify(chats), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@chat_bp.route('/api/chats', methods=['POST'])
@jwt_required()
def create_chat():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        chat_id = data.get('chat_id')
        title = data.get('title')
        messages = data.get('messages', [])
        selected_documents = data.get('selected_documents', [])

        if not chat_id or not title:
            return jsonify({'error': 'chat_id and title are required'}), 400

        result = save_chat(user_id, chat_id, title, messages, selected_documents)
        if 'error' in result:
            return jsonify(result), 500

        return jsonify(result), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@chat_bp.route('/api/chats/<chat_id>', methods=['GET'])
@jwt_required()
def get_chat(chat_id):
    try:
        user_id = get_jwt_identity()
        chat = get_chat_by_id(user_id, chat_id)
        if not chat:
            return jsonify({'error': 'Chat not found'}), 404
        return jsonify(chat), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@chat_bp.route('/api/chats/<chat_id>', methods=['DELETE'])
@jwt_required()
def delete_chat_route(chat_id):
    try:
        user_id = get_jwt_identity()
        result = delete_chat(user_id, chat_id)
        if 'error' in result:
            return jsonify(result), 500
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@chat_bp.route('/api/ask', methods=['POST'])
def ask_question_route():
    try:
        data = request.get_json()
        query = data.get('query')
        user_id = data.get('user_id', 'default_user')
        selected_documents = data.get('selected_documents', [])
        chat_history = data.get('chat_history', [])

        if not query:
            return jsonify({'error': 'Query is required'}), 400

        result = ask_question(query, user_id, selected_documents, chat_history)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
