import os
import json
from datetime import datetime, timedelta
from config import Config

def get_user_progress(user_id):
    """
    Get all progress data for a user.
    """
    try:
        if not os.path.exists(Config.PROGRESS_FILE):
            return {
                'total_quizzes_taken': 0,
                'total_score': 0,
                'average_score': 0,
                'topics_progress': {},
                'quiz_history': [],
                'document_progress': {}
            }

        with open(Config.PROGRESS_FILE, 'r') as f:
            progress_data = json.load(f)

        user_progress = progress_data.get(user_id, {
            'total_quizzes_taken': 0,
            'total_score': 0,
            'average_score': 0,
            'topics_progress': {},
            'quiz_history': []
        })

        # Add document progress tracking
        user_progress['document_progress'] = get_document_progress(user_id)

        return user_progress
    except Exception as e:
        print(f"Error retrieving progress for user {user_id}: {str(e)}")
        return {
            'total_quizzes_taken': 0,
            'total_score': 0,
            'average_score': 0,
            'topics_progress': {},
            'quiz_history': [],
            'document_progress': {}
        }

def save_quiz_result(user_id, quiz_id, topic, score, total_questions, documents_used):
    """
    Save the result of a completed quiz.
    """
    try:
        progress_data = {}
        if os.path.exists(Config.PROGRESS_FILE):
            with open(Config.PROGRESS_FILE, 'r') as f:
                progress_data = json.load(f)

        if user_id not in progress_data:
            progress_data[user_id] = {
                'total_quizzes_taken': 0,
                'total_score': 0,
                'average_score': 0,
                'topics_progress': {},
                'quiz_history': []
            }

        user_progress = progress_data[user_id]

        # Update overall statistics
        user_progress['total_quizzes_taken'] += 1
        user_progress['total_score'] += score

        # Calculate new average
        total_possible = user_progress['total_quizzes_taken'] * total_questions
        user_progress['average_score'] = round((user_progress['total_score'] / total_possible) * 100, 2)

        # Update topic-specific progress
        if topic not in user_progress['topics_progress']:
            user_progress['topics_progress'][topic] = {
                'quizzes_taken': 0,
                'total_score': 0,
                'average_score': 0,
                'best_score': 0
            }

        topic_progress = user_progress['topics_progress'][topic]
        topic_progress['quizzes_taken'] += 1
        topic_progress['total_score'] += score
        topic_progress['average_score'] = round((topic_progress['total_score'] / (topic_progress['quizzes_taken'] * total_questions)) * 100, 2)
        topic_progress['best_score'] = max(topic_progress['best_score'], round((score / total_questions) * 100, 2))

        # Add to quiz history
        quiz_result = {
            'quiz_id': quiz_id,
            'topic': topic,
            'score': score,
            'total_questions': total_questions,
            'percentage': round((score / total_questions) * 100, 2),
            'documents_used': documents_used,
            'completed_at': datetime.now().isoformat()
        }

        user_progress['quiz_history'].append(quiz_result)

        # Keep only last 50 quiz results to prevent file from growing too large
        user_progress['quiz_history'] = user_progress['quiz_history'][-50:]

        with open(Config.PROGRESS_FILE, 'w') as f:
            json.dump(progress_data, f, indent=2)

        return {'success': True, 'progress': user_progress}
    except Exception as e:
        print(f"Error saving quiz result: {str(e)}")
        return {'error': f'Error saving quiz result: {str(e)}'}

def get_topic_progress(user_id, topic):
    """
    Get progress for a specific topic.
    """
    try:
        user_progress = get_user_progress(user_id)
        return user_progress['topics_progress'].get(topic, {
            'quizzes_taken': 0,
            'total_score': 0,
            'average_score': 0,
            'best_score': 0
        })
    except Exception as e:
        print(f"Error retrieving topic progress: {str(e)}")
        return {
            'quizzes_taken': 0,
            'total_score': 0,
            'average_score': 0,
            'best_score': 0
        }

def get_recent_quiz_history(user_id, limit=10):
    """
    Get recent quiz history for a user.
    """
    try:
        user_progress = get_user_progress(user_id)
        return user_progress['quiz_history'][-limit:]
    except Exception as e:
        print(f"Error retrieving quiz history: {str(e)}")
        return []

def get_user_quiz_attempts(user_id, limit=10):
    """
    Get quiz attempts history for a user from database
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT qr.quiz_id, qr.topic, qr.score, qr.total_questions,
                   (qr.score * 100.0 / qr.total_questions) as percentage,
                   qr.completed_at, qr.documents_used
            FROM quiz_results qr
            WHERE qr.user_id = %s
            ORDER BY qr.completed_at DESC
            LIMIT %s
        """, (user_id, limit))

        attempts = []
        for row in cursor.fetchall():
            attempts.append({
                'quiz_id': row['quiz_id'],
                'topic': row['topic'],
                'score': row['score'],
                'total_questions': row['total_questions'],
                'percentage': round(row['percentage'], 1),
                'completed_at': row['completed_at'].isoformat() if row['completed_at'] else None,
                'documents_used': row['documents_used'] or []
            })

        cursor.close()
        conn.close()
        return attempts

    except Exception as e:
        print(f"Error getting user quiz attempts: {e}")
        return []

def get_learning_analytics(user_id):
    """
    Get comprehensive learning analytics for a user
    """
    try:
        # For now, return mock analytics since we're using JSON file storage
        # In a real implementation, this would use database queries
        user_progress = get_user_progress(user_id)

        # Calculate topic mastery levels
        topic_mastery = {}
        weak_topics = []
        strong_topics = []

        if user_progress.get('topics_progress'):
            for topic, data in user_progress['topics_progress'].items():
                mastery = data['average_score']
                topic_mastery[topic] = mastery
                if mastery < 60:
                    weak_topics.append(topic)
                elif mastery >= 80:
                    strong_topics.append(topic)

        # Get performance trends from quiz history
        performance_trends = []
        if user_progress.get('quiz_history'):
            for quiz in user_progress['quiz_history'][:10]:
                performance_trends.append({
                    'score': quiz['score'],
                    'total_questions': quiz['total_questions'],
                    'percentage': quiz['percentage'],
                    'completed_at': quiz['completed_at']
                })

        # Calculate study streak (simplified - based on quiz history)
        study_streak = 0
        if user_progress.get('quiz_history'):
            # Simple streak calculation based on recent quiz dates
            recent_quizzes = sorted(user_progress['quiz_history'], key=lambda x: x['completed_at'], reverse=True)
            if recent_quizzes:
                current_date = datetime.now().date()
                quiz_dates = [datetime.fromisoformat(q['completed_at']).date() for q in recent_quizzes[:10]]
                unique_dates = sorted(list(set(quiz_dates)), reverse=True)

                for i, quiz_date in enumerate(unique_dates):
                    if quiz_date == current_date - timedelta(days=i):
                        study_streak += 1
                    else:
                        break

        # Consistency score (based on quiz frequency)
        consistency_score = min(1.0, len(user_progress.get('quiz_history', [])) / 30)

        # Improvement rate (trend in scores)
        improvement_rate = 0
        if len(performance_trends) >= 2:
            recent_scores = [p['percentage'] for p in performance_trends[:5]]
            older_scores = [p['percentage'] for p in performance_trends[-5:]]
            if recent_scores and older_scores:
                recent_avg = sum(recent_scores) / len(recent_scores)
                older_avg = sum(older_scores) / len(older_scores)
                improvement_rate = (recent_avg - older_avg) / 100 if older_avg > 0 else 0

        # Generate recommendations
        recommendations = []
        if weak_topics:
            recommendations.append(f"Focus on improving weak topics: {', '.join(weak_topics[:3])}")
        if study_streak < 3:
            recommendations.append("Try to maintain a daily study streak for better retention")
        if consistency_score < 0.5:
            recommendations.append("Increase study frequency for better learning outcomes")

        analytics = {
            'topic_mastery_levels': topic_mastery,
            'weak_topics': weak_topics,
            'strong_topics': strong_topics,
            'performance_trends': performance_trends,
            'study_streak': study_streak,
            'consistency_score': consistency_score,
            'improvement_rate': improvement_rate,
            'recommendations': recommendations
        }

        return analytics

    except Exception as e:
        print(f"Error getting learning analytics: {e}")
        return {}

def get_document_progress(user_id):
    """
    Get document-wise progress tracking for a user
    """
    try:
        user_progress = get_user_progress(user_id)
        document_progress = {}

        # Aggregate progress by document from quiz history
        if user_progress.get('quiz_history'):
            for quiz in user_progress['quiz_history']:
                documents = quiz.get('documents_used', [])
                for doc in documents:
                    if doc not in document_progress:
                        document_progress[doc] = {
                            'quizzes_taken': 0,
                            'total_score': 0,
                            'average_score': 0,
                            'last_studied': quiz['completed_at'],
                            'mastery_level': 'Beginner'
                        }

                    doc_data = document_progress[doc]
                    doc_data['quizzes_taken'] += 1
                    doc_data['total_score'] += quiz['percentage']

                    # Update average score
                    doc_data['average_score'] = doc_data['total_score'] / doc_data['quizzes_taken']

                    # Update last studied date if more recent
                    if quiz['completed_at'] > doc_data['last_studied']:
                        doc_data['last_studied'] = quiz['completed_at']

                    # Determine mastery level
                    avg_score = doc_data['average_score']
                    if avg_score >= 90:
                        doc_data['mastery_level'] = 'Expert'
                    elif avg_score >= 80:
                        doc_data['mastery_level'] = 'Good'
                    elif avg_score >= 70:
                        doc_data['mastery_level'] = 'Fair'
                    else:
                        doc_data['mastery_level'] = 'Beginner'

        # Add recommendations for each document
        for doc, data in document_progress.items():
            recommendations = []
            if data['mastery_level'] == 'Beginner':
                recommendations.append("Review basic concepts and take more quizzes")
            elif data['mastery_level'] == 'Fair':
                recommendations.append("Focus on understanding key concepts better")
            elif data['mastery_level'] == 'Good':
                recommendations.append("Practice advanced questions to reach expert level")

            if data['quizzes_taken'] < 3:
                recommendations.append("Take more quizzes to improve mastery")

            data['recommendations'] = recommendations

        return document_progress

    except Exception as e:
        print(f"Error getting document progress: {e}")
        return {}
