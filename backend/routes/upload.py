from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import os
from services.document_processor import process_document
from services.topic_service import add_document_to_topic
from config import Config
from models import db, Document

upload_bp = Blueprint('upload', __name__)

@upload_bp.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    # Optional topic name, user_id, and folder_id
    topic_name = request.form.get('topic_name')
    user_id_str = request.form.get('user_id', '1')  # Default to user id 1 for now
    folder_id_str = request.form.get('folder_id')

    try:
        user_id = int(user_id_str)
    except ValueError:
        return jsonify({'error': 'Invalid user_id'}), 400

    folder_id = None
    if folder_id_str:
        try:
            folder_id = int(folder_id_str)
        except ValueError:
            return jsonify({'error': 'Invalid folder_id'}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(Config.DOCUMENTS_FOLDER, filename)

        # Ensure folder exists
        os.makedirs(Config.DOCUMENTS_FOLDER, exist_ok=True)

        # Get file size
        file.seek(0, os.SEEK_END)
        size = file.tell()
        file.seek(0)

        # Save file
        file.save(filepath)

        # Process the document
        result = process_document(filepath, filename, user_id)

        if 'error' in result:
            return jsonify(result), 500

        # Save document to database
        document = Document(
            user_id=user_id,
            filename=filename,
            folder_id=folder_id,
            size=size
        )
        db.session.add(document)
        db.session.commit()

        result['document_id'] = document.id

        # Add to topic if requested
        if topic_name:
            topic_result = add_document_to_topic(user_id, topic_name, filename)

            if 'error' in topic_result:
                result['topic_added'] = False
                result['topic_error'] = topic_result['error']
            else:
                result['topic_added'] = True
                result['topic_name'] = topic_name

        return jsonify(result), 200

    return jsonify({'error': 'File type not allowed'}), 400


def allowed_file(filename):
    return (
        '.' in filename 
        and filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS
    )
