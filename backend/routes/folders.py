from flask import Blueprint, request, jsonify
from models import db, Folder, Document
from flask_jwt_extended import jwt_required, get_jwt_identity

folders_bp = Blueprint('folders', __name__)

@folders_bp.route('/api/folders', methods=['OPTIONS'])
def options_folders():
    from flask import make_response
    response = make_response()
    response.headers['Access-Control-Allow-Origin'] = 'http://localhost:5173'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response

@folders_bp.route('/api/folders', methods=['GET'])
@jwt_required()
def get_folders():
    print("DEBUG: get_folders called")
    print(f"DEBUG: Authorization header: {request.headers.get('Authorization')}")
    try:
        user_id = int(get_jwt_identity())
        print(f"DEBUG: user_id from JWT: {user_id}, type: {type(user_id)}")
        folders = Folder.query.filter_by(user_id=user_id).all()
        print(f"DEBUG: Found {len(folders)} folders for user {user_id}")
        return jsonify([{
            'id': f.id,
            'name': f.name,
            'description': f.description,
            'created_at': f.created_at.isoformat()
        } for f in folders]), 200
    except Exception as e:
        print(f"DEBUG: get_folders error: {str(e)}, type: {type(e)}")
        import traceback
        print(f"DEBUG: Full traceback: {traceback.format_exc()}")
        print(f"DEBUG: Returning 422 for get_folders")
        return jsonify({'error': 'Invalid token'}), 401

@folders_bp.route('/api/folders', methods=['POST'])
@jwt_required()
def create_folder():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    name = data.get('name')
    description = data.get('description', '')

    if not name:
        return jsonify({'error': 'Folder name is required'}), 400

    folder = Folder(user_id=user_id, name=name, description=description)
    db.session.add(folder)
    db.session.commit()

    return jsonify({
        'id': folder.id,
        'name': folder.name,
        'description': folder.description,
        'created_at': folder.created_at.isoformat()
    }), 201

@folders_bp.route('/api/folders/<int:folder_id>', methods=['PUT'])
@jwt_required()
def update_folder(folder_id):
    user_id = int(get_jwt_identity())
    folder = Folder.query.filter_by(id=folder_id, user_id=user_id).first()
    if not folder:
        return jsonify({'error': 'Folder not found'}), 404

    data = request.get_json()
    name = data.get('name')
    description = data.get('description')

    if name:
        folder.name = name
    if description is not None:
        folder.description = description

    db.session.commit()

    return jsonify({
        'id': folder.id,
        'name': folder.name,
        'description': folder.description,
        'created_at': folder.created_at.isoformat()
    }), 200

@folders_bp.route('/api/folders/<int:folder_id>', methods=['DELETE'])
@jwt_required()
def delete_folder(folder_id):
    user_id = int(get_jwt_identity())
    folder = Folder.query.filter_by(id=folder_id, user_id=user_id).first()
    if not folder:
        return jsonify({'error': 'Folder not found'}), 404

    # Check if folder has documents
    if folder.documents:
        return jsonify({'error': 'Cannot delete folder with documents'}), 400

    db.session.delete(folder)
    db.session.commit()

    return jsonify({'message': 'Folder deleted successfully'}), 200

@folders_bp.route('/api/folders/<int:folder_id>/documents', methods=['GET'])
@jwt_required()
def get_folder_documents(folder_id):
    user_id = int(get_jwt_identity())
    folder = Folder.query.filter_by(id=folder_id, user_id=user_id).first()
    if not folder:
        return jsonify({'error': 'Folder not found'}), 404

    documents = Document.query.filter_by(folder_id=folder_id, user_id=user_id).all()
    return jsonify([{
        'id': d.id,
        'filename': d.filename,
        'size': d.size,
        'uploaded_at': d.uploaded_at.isoformat(),
        'summary': d.summary,
        'detailed_summary': d.detailed_summary,
        'processing_status': d.processing_status
    } for d in documents]), 200