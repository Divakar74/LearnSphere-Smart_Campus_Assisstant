from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User
import re

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')

        if not all([username, email, password]):
            return jsonify({'error': 'Username, email, and password are required'}), 400

        if len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters long'}), 400

        if not re.match(r'^[^@]+@[^@]+\.[^@]+$', email):
            return jsonify({'error': 'Invalid email format'}), 400

        if User.query.filter_by(username=username).first():
            return jsonify({'error': 'Username already exists'}), 400

        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already exists'}), 400

        password_hash = generate_password_hash(password)
        new_user = User(username=username, email=email, password_hash=password_hash)

        db.session.add(new_user)
        db.session.commit()

        access_token = create_access_token(identity=str(new_user.id))
        return jsonify({
            'message': 'User registered successfully',
            'access_token': access_token,
            'user': {'id': new_user.id, 'username': new_user.username, 'email': new_user.email}
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')

        print(f"DEBUG: Login attempt for username: {username}")

        if not all([username, password]):
            return jsonify({'error': 'Username and password are required'}), 400

        user = User.query.filter((User.username == username) | (User.email == username)).first()
        print(f"DEBUG: User found: {user.username if user else 'None'}")
        if user:
            password_valid = check_password_hash(user.password_hash, password)
            print(f"DEBUG: Password check result: {password_valid}")
        if not user or not check_password_hash(user.password_hash, password):
            print("DEBUG: Invalid credentials")
            return jsonify({'error': 'Invalid username or password'}), 401

        access_token = create_access_token(identity=str(user.id))
        print(f"DEBUG: Login successful, token created for user_id: {user.id}")
        return jsonify({
            'message': 'Login successful',
            'access_token': access_token,
            'user': {'id': user.id, 'username': user.username, 'email': user.email}
        }), 200

    except Exception as e:
        print(f"DEBUG: Login error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/api/profile', methods=['GET'])
@jwt_required()
def get_profile():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user:
            return jsonify({'error': 'User not found'}), 404

        return jsonify({
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'created_at': user.created_at.isoformat()
            }
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
