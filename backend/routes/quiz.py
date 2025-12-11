from flask import Blueprint, request, jsonify
from services.qa_service import generate_quiz, get_stored_quizzes, get_quiz_by_id
from services.progress_service import save_quiz_result, get_recent_quiz_history

quiz_bp = Blueprint('quiz', __name__)

@quiz_bp.route('/api/generate-quiz', methods=['POST'])
def generate_quiz_route():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        selected_documents = data.get('selected_documents', [])
        num_questions = data.get('num_questions', 5)

        if not user_id:
            return jsonify({'error': 'user_id is required'}), 400

        result = generate_quiz(user_id, selected_documents, num_questions)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@quiz_bp.route('/api/stored-quizzes', methods=['GET'])
def get_stored_quizzes_route():
    try:
        user_id = request.args.get('user_id')
        topic = request.args.get('topic')

        if not user_id:
            return jsonify({'error': 'user_id is required'}), 400

        result = get_stored_quizzes(user_id, topic)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@quiz_bp.route('/api/quiz/<quiz_id>', methods=['GET'])
def get_quiz_by_id_route(quiz_id):
    try:
        result = get_quiz_by_id(quiz_id)
        if result:
            return jsonify(result)
        else:
            return jsonify({'error': 'Quiz not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@quiz_bp.route('/api/quiz-attempts', methods=['GET'])
def get_quiz_attempts_route():
    try:
        user_id = request.args.get('user_id')
        limit = int(request.args.get('limit', 10))

        if not user_id:
            return jsonify({'error': 'user_id is required'}), 400

        attempts = get_recent_quiz_history(user_id, limit)
        return jsonify(attempts)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@quiz_bp.route('/api/retake-quiz/<quiz_id>', methods=['POST'])
def retake_quiz_route(quiz_id):
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        num_questions = data.get('num_questions', 5)

        if not user_id:
            return jsonify({'error': 'user_id is required'}), 400

        # Get the original quiz data
        original_quiz = get_quiz_by_id(quiz_id)
        if not original_quiz:
            return jsonify({'error': 'Quiz not found'}), 404

        # Generate a new quiz with the same topic and documents
        from services.qa_service import generate_quiz
        result = generate_quiz(
            user_id,
            original_quiz.get('documents', []),
            num_questions,
            original_quiz.get('topic', 'General')
        )

        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


