from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from services.flashcard_service import (
    generate_flashcards_from_summary,
    get_due_flashcards,
    review_flashcard,
    get_flashcard_stats
)
from models import db

flashcards_bp = Blueprint('flashcards', __name__)

@flashcards_bp.route('/api/flashcards/generate', methods=['POST'])
@jwt_required()
def generate_flashcards():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()

        summary_text = data.get('summary_text')
        topic = data.get('topic')
        document_filename = data.get('document_filename')
        num_cards = data.get('num_cards', 5)

        if not summary_text:
            return jsonify({'error': 'summary_text is required'}), 400

        result = generate_flashcards_from_summary(user_id, summary_text, topic, document_filename, num_cards)
        return jsonify(result), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@flashcards_bp.route('/api/flashcards/due', methods=['GET'])
@jwt_required()
def get_due():
    try:
        user_id = get_jwt_identity()
        limit = int(request.args.get('limit', 20))

        flashcards = get_due_flashcards(user_id, limit)
        return jsonify({'flashcards': flashcards}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@flashcards_bp.route('/api/flashcards/<int:flashcard_id>/review', methods=['POST'])
@jwt_required()
def review(flashcard_id):
    try:
        data = request.get_json()
        quality = data.get('quality')

        if quality not in [0, 1, 2, 3]:
            return jsonify({'error': 'Quality must be 0, 1, 2, or 3'}), 400

        result = review_flashcard(flashcard_id, quality)
        return jsonify(result), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@flashcards_bp.route('/api/flashcards/stats', methods=['GET'])
@jwt_required()
def stats():
    try:
        user_id = get_jwt_identity()
        stats_data = get_flashcard_stats(user_id)
        return jsonify(stats_data), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
