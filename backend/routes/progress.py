from flask import Blueprint, request, jsonify
from services.progress_service import get_user_progress, save_quiz_result

progress_bp = Blueprint('progress', __name__)

@progress_bp.route('/api/progress', methods=['GET'])
def get_progress():
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'error': 'user_id is required'}), 400

        progress = get_user_progress(user_id)
        return jsonify(progress)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@progress_bp.route('/api/progress/quiz-result', methods=['POST'])
def save_quiz_result_route():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        quiz_id = data.get('quiz_id')
        topic = data.get('topic')
        score = data.get('score')
        total_questions = data.get('total_questions')
        documents_used = data.get('documents_used', [])

        if not all([user_id, quiz_id, topic is not None, score is not None, total_questions is not None]):
            return jsonify({'error': 'Missing required fields'}), 400

        result = save_quiz_result(user_id, quiz_id, topic, score, total_questions, documents_used)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@progress_bp.route('/api/progress/analytics', methods=['GET'])
def get_learning_analytics_route():
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'error': 'user_id is required'}), 400

        analytics = get_learning_analytics(user_id)
        return jsonify(analytics)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
