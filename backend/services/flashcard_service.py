from models import db, Flashcard
from datetime import datetime, timedelta
import openai
import os

def generate_flashcards_from_summary(user_id, summary_text, topic=None, document_filename=None, num_cards=5):
    """Generate flashcards from document summary using LLM"""
    try:
        client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

        prompt = f"""
        Create {num_cards} flashcards from the following document summary. Each flashcard should have a question and answer pair suitable for spaced repetition learning.

        Summary: {summary_text}

        Format your response as a JSON array of objects, where each object has "question" and "answer" fields.
        Make sure the questions test key concepts and the answers are concise but complete.
        """

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000,
            temperature=0.7
        )

        import json
        flashcards_data = json.loads(response.choices[0].message.content.strip())

        flashcards = []
        for card_data in flashcards_data[:num_cards]:
            flashcard = Flashcard(
                user_id=user_id,
                question=card_data['question'],
                answer=card_data['answer'],
                topic=topic,
                document_filename=document_filename,
                due_date=datetime.utcnow()
            )
            db.session.add(flashcard)
            flashcards.append({
                'id': flashcard.id,
                'question': flashcard.question,
                'answer': flashcard.answer,
                'topic': flashcard.topic,
                'document_filename': flashcard.document_filename
            })

        db.session.commit()
        return {'message': f'Generated {len(flashcards)} flashcards', 'flashcards': flashcards}

    except Exception as e:
        db.session.rollback()
        return {'error': str(e)}

def get_due_flashcards(user_id, limit=20):
    """Get flashcards that are due for review"""
    now = datetime.utcnow()
    flashcards = Flashcard.query.filter_by(user_id=user_id).filter(
        Flashcard.due_date <= now
    ).order_by(Flashcard.due_date).limit(limit).all()

    return [{
        'id': card.id,
        'question': card.question,
        'answer': card.answer,
        'topic': card.topic,
        'document_filename': card.document_filename,
        'ease_factor': card.ease_factor,
        'interval': card.interval,
        'repetitions': card.repetitions,
        'due_date': card.due_date.isoformat() if card.due_date else None
    } for card in flashcards]

def review_flashcard(flashcard_id, quality):
    """
    Review a flashcard using SM-2 algorithm
    Quality: 0=complete blackout, 1=incorrect, 2=difficult, 3=correct with effort, 4=easy
    """
    try:
        flashcard = Flashcard.query.get(flashcard_id)
        if not flashcard:
            return {'error': 'Flashcard not found'}

        # SM-2 Algorithm
        if quality >= 3:  # Correct response
            if flashcard.repetitions == 0:
                interval = 1
            elif flashcard.repetitions == 1:
                interval = 6
            else:
                interval = round(flashcard.interval * flashcard.ease_factor)

            flashcard.repetitions += 1
        else:  # Incorrect response
            flashcard.repetitions = 0
            interval = 1

        # Update ease factor
        flashcard.ease_factor = max(1.3, flashcard.ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))

        # Set new interval and due date
        flashcard.interval = interval
        flashcard.due_date = datetime.utcnow() + timedelta(days=interval)
        flashcard.last_reviewed = datetime.utcnow()
        flashcard.quality_of_last_answer = quality

        db.session.commit()

        return {
            'message': 'Flashcard reviewed successfully',
            'next_due_date': flashcard.due_date.isoformat(),
            'interval': flashcard.interval,
            'ease_factor': flashcard.ease_factor
        }

    except Exception as e:
        db.session.rollback()
        return {'error': str(e)}

def get_flashcard_stats(user_id):
    """Get flashcard statistics for a user"""
    total_cards = Flashcard.query.filter_by(user_id=user_id).count()
    due_cards = len(get_due_flashcards(user_id, 1000))  # Get all due cards
    reviewed_today = Flashcard.query.filter_by(user_id=user_id).filter(
        Flashcard.last_reviewed >= datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    ).count()

    return {
        'total_flashcards': total_cards,
        'due_flashcards': due_cards,
        'reviewed_today': reviewed_today
    }
