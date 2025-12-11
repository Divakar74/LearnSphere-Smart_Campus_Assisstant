from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<User {self.username}>'

class Flashcard(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    question = db.Column(db.Text, nullable=False)
    answer = db.Column(db.Text, nullable=False)
    topic = db.Column(db.String(100))
    document_filename = db.Column(db.String(255))
    ease_factor = db.Column(db.Float, default=2.5)
    interval = db.Column(db.Integer, default=1)
    repetitions = db.Column(db.Integer, default=0)
    due_date = db.Column(db.DateTime, default=datetime.utcnow)
    last_reviewed = db.Column(db.DateTime)
    quality_of_last_answer = db.Column(db.Integer)

    user = db.relationship('User', backref=db.backref('flashcards', lazy=True))

    def __repr__(self):
        return f'<Flashcard {self.question[:20]}...>'

class Quiz(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    topic = db.Column(db.String(100), nullable=False)
    documents_used = db.Column(db.Text, nullable=False)  # JSON string of document filenames
    quiz_data = db.Column(db.Text, nullable=False)  # JSON string of quiz questions
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('quizzes', lazy=True))

    def __repr__(self):
        return f'<Quiz {self.topic} by user {self.user_id}>'

class QuizAttempt(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    quiz_id = db.Column(db.Integer, db.ForeignKey('quiz.id'), nullable=False)
    answers = db.Column(db.Text, nullable=False)  # JSON string of user answers
    score = db.Column(db.Float, nullable=False)
    total_questions = db.Column(db.Integer, nullable=False)
    completed_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('quiz_attempts', lazy=True))
    quiz = db.relationship('Quiz', backref=db.backref('attempts', lazy=True))

    def __repr__(self):
        return f'<QuizAttempt user {self.user_id} quiz {self.quiz_id} score {self.score}>'

class LearningProgress(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    documents_read = db.Column(db.Integer, default=0)
    flashcards_reviewed = db.Column(db.Integer, default=0)
    quizzes_attempted = db.Column(db.Integer, default=0)
    time_spent_minutes = db.Column(db.Integer, default=0)
    topics_studied = db.Column(db.Text)  # JSON string of topics

    user = db.relationship('User', backref=db.backref('learning_progress', lazy=True))

    def __repr__(self):
        return f'<LearningProgress user {self.user_id} date {self.date}>'

class TopicMastery(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    topic = db.Column(db.String(100), nullable=False)
    mastery_level = db.Column(db.Float, default=0.0)  # 0-1 scale
    total_attempts = db.Column(db.Integer, default=0)
    correct_answers = db.Column(db.Integer, default=0)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('topic_mastery', lazy=True))

    def __repr__(self):
        return f'<TopicMastery user {self.user_id} topic {self.topic} level {self.mastery_level}>'

class Folder(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('folders', lazy=True))

    def __repr__(self):
        return f'<Folder {self.name} by user {self.user_id}>'

class Document(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    folder_id = db.Column(db.Integer, db.ForeignKey('folder.id'), nullable=True)
    size = db.Column(db.Integer, nullable=False)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    summary = db.Column(db.Text, nullable=True)
    detailed_summary = db.Column(db.Text, nullable=True)
    processing_status = db.Column(db.String(20), default='completed')  # 'processing', 'completed', 'failed'

    user = db.relationship('User', backref=db.backref('documents', lazy=True))
    folder = db.relationship('Folder', backref=db.backref('documents', lazy=True))

    def __repr__(self):
        return f'<Document {self.filename} by user {self.user_id}>'
