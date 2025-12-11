import os
import json
import openai
from config import Config
from .embedding_service import get_all_chunks

# Initialize OpenAI client
client = openai.OpenAI(api_key=Config.OPENAI_API_KEY)

def get_user_topics(user_id):
    """
    Get all topics for a user.
    """
    try:
        if not os.path.exists(Config.TOPICS_FILE):
            return []

        with open(Config.TOPICS_FILE, 'r') as f:
            topics = json.load(f)

        return topics.get(user_id, [])
    except Exception as e:
        print(f"Error retrieving topics for user {user_id}: {str(e)}")
        return []

def create_topic(user_id, topic_name, description=""):
    """
    Create a new topic for a user.
    """
    try:
        topics = {}
        if os.path.exists(Config.TOPICS_FILE):
            with open(Config.TOPICS_FILE, 'r') as f:
                topics = json.load(f)

        if user_id not in topics:
            topics[user_id] = []

        # Check if topic already exists
        if any(topic['name'] == topic_name for topic in topics[user_id]):
            return {'error': 'Topic already exists'}

        topic = {
            'name': topic_name,
            'description': description,
            'documents': [],
            'created_at': str(os.times())
        }

        topics[user_id].append(topic)

        with open(Config.TOPICS_FILE, 'w') as f:
            json.dump(topics, f, indent=2)

        return {'success': True, 'topic': topic}
    except Exception as e:
        print(f"Error creating topic: {str(e)}")
        return {'error': f'Error creating topic: {str(e)}'}

def add_document_to_topic(user_id, topic_name, filename):
    """
    Add a document to an existing topic.
    """
    try:
        topics = {}
        if os.path.exists(Config.TOPICS_FILE):
            with open(Config.TOPICS_FILE, 'r') as f:
                topics = json.load(f)

        if user_id not in topics:
            return {'error': 'User has no topics'}

        for topic in topics[user_id]:
            if topic['name'] == topic_name:
                if filename not in topic['documents']:
                    topic['documents'].append(filename)
                    with open(Config.TOPICS_FILE, 'w') as f:
                        json.dump(topics, f, indent=2)
                    return {'success': True}
                else:
                    return {'error': 'Document already in topic'}

        return {'error': 'Topic not found'}
    except Exception as e:
        print(f"Error adding document to topic: {str(e)}")
        return {'error': f'Error adding document to topic: {str(e)}'}

def get_topic_documents(user_id, topic_name):
    """
    Get all documents in a specific topic.
    """
    try:
        topics = get_user_topics(user_id)
        for topic in topics:
            if topic['name'] == topic_name:
                return topic['documents']
        return []
    except Exception as e:
        print(f"Error retrieving topic documents: {str(e)}")
        return []

def delete_topic(user_id, topic_name):
    """
    Delete a topic for a user.
    """
    try:
        topics = {}
        if os.path.exists(Config.TOPICS_FILE):
            with open(Config.TOPICS_FILE, 'r') as f:
                topics = json.load(f)

        if user_id not in topics:
            return {'error': 'User has no topics'}

        topics[user_id] = [topic for topic in topics[user_id] if topic['name'] != topic_name]

        with open(Config.TOPICS_FILE, 'w') as f:
            json.dump(topics, f, indent=2)

        return {'success': True}
    except Exception as e:
        print(f"Error deleting topic: {str(e)}")
        return {'error': f'Error deleting topic: {str(e)}'}

def categorize_document(user_id, filename):
    """
    Automatically categorize a document into the most appropriate topic.
    """
    try:
        # Get document content
        processed_dir = Config.PROCESSED_DIR
        processed_file = os.path.join(processed_dir, f"{filename}.txt")

        if not os.path.exists(processed_file):
            return {'error': 'Document not found or not processed'}

        with open(processed_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # Get existing topics
        topics = get_user_topics(user_id)
        if not topics:
            return {'error': 'No topics available for categorization'}

        # Use AI to determine the best topic
        topic_names = [topic['name'] for topic in topics]
        topic_descriptions = [topic.get('description', '') for topic in topics]

        prompt = f"""
        Given the following document content and available topics, determine which topic this document belongs to.

        Document content (first 1000 characters):
        {content[:1000]}

        Available topics:
        {', '.join(topic_names)}

        Topic descriptions:
        {chr(10).join([f"- {name}: {desc}" for name, desc in zip(topic_names, topic_descriptions)])}

        Return only the topic name that best fits this document. If none fit well, return "General".
        """

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=50,
            temperature=0.3
        )

        best_topic = response.choices[0].message.content.strip()

        # Validate the topic exists
        if best_topic not in topic_names and best_topic != "General":
            best_topic = "General"

        # Add document to the topic
        if best_topic != "General":
            result = add_document_to_topic(user_id, best_topic, filename)
            if result.get('error'):
                return result

        return {'success': True, 'topic': best_topic, 'filename': filename}
    except Exception as e:
        print(f"Error categorizing document: {str(e)}")
        return {'error': f'Error categorizing document: {str(e)}'}

def auto_categorize_all_documents(user_id):
    """
    Automatically categorize all uncategorized documents.
    """
    try:
        # Get all documents
        documents_dir = Config.DOCUMENTS_DIR
        if not os.path.exists(documents_dir):
            return {'error': 'Documents directory not found'}

        all_files = os.listdir(documents_dir)
        processed_files = [f for f in all_files if f.endswith(('.pdf', '.docx', '.pptx', '.txt'))]

        # Get existing topics and their documents
        topics = get_user_topics(user_id)
        categorized_docs = set()
        for topic in topics:
            categorized_docs.update(topic['documents'])

        # Find uncategorized documents
        uncategorized = []
        for filename in processed_files:
            if filename not in categorized_docs:
                uncategorized.append(filename)

        if not uncategorized:
            return {'success': True, 'message': 'All documents are already categorized', 'categorized_count': 0}

        # Categorize each document
        results = []
        for filename in uncategorized:
            result = categorize_document(user_id, filename)
            results.append(result)

        success_count = sum(1 for r in results if r.get('success'))

        return {
            'success': True,
            'message': f'Categorized {success_count} out of {len(uncategorized)} documents',
            'categorized_count': success_count,
            'results': results
        }
    except Exception as e:
        print(f"Error auto-categorizing documents: {str(e)}")
        return {'error': f'Error auto-categorizing documents: {str(e)}'}
