import os
import json
from datetime import datetime
from config import Config

def get_user_chats(user_id):
    """
    Get all chat conversations for a user.
    """
    try:
        if not os.path.exists(Config.CHATS_FILE):
            return []

        with open(Config.CHATS_FILE, 'r') as f:
            chats_data = json.load(f)

        return chats_data.get(user_id, [])
    except Exception as e:
        print(f"Error retrieving chats for user {user_id}: {str(e)}")
        return []

def save_chat(user_id, chat_id, title, messages, selected_documents):
    """
    Save a chat conversation.
    """
    try:
        chats_data = {}
        if os.path.exists(Config.CHATS_FILE):
            with open(Config.CHATS_FILE, 'r') as f:
                chats_data = json.load(f)

        if user_id not in chats_data:
            chats_data[user_id] = []

        # Find existing chat or create new one
        chat_index = None
        for i, chat in enumerate(chats_data[user_id]):
            if chat['id'] == chat_id:
                chat_index = i
                break

        chat_data = {
            'id': chat_id,
            'title': title,
            'messages': messages,
            'selected_documents': selected_documents,
            'updated_at': datetime.now().isoformat(),
            'message_count': len(messages)
        }

        if chat_index is not None:
            chats_data[user_id][chat_index] = chat_data
        else:
            chat_data['created_at'] = datetime.now().isoformat()
            chats_data[user_id].append(chat_data)

        # Keep only last 50 chats per user
        chats_data[user_id] = chats_data[user_id][-50:]

        with open(Config.CHATS_FILE, 'w') as f:
            json.dump(chats_data, f, indent=2)

        return {'success': True, 'chat': chat_data}
    except Exception as e:
        print(f"Error saving chat: {str(e)}")
        return {'error': f'Error saving chat: {str(e)}'}

def get_chat_by_id(user_id, chat_id):
    """
    Get a specific chat conversation.
    """
    try:
        chats = get_user_chats(user_id)
        for chat in chats:
            if chat['id'] == chat_id:
                return chat
        return None
    except Exception as e:
        print(f"Error retrieving chat {chat_id}: {str(e)}")
        return None

def delete_chat(user_id, chat_id):
    """
    Delete a chat conversation.
    """
    try:
        chats_data = {}
        if os.path.exists(Config.CHATS_FILE):
            with open(Config.CHATS_FILE, 'r') as f:
                chats_data = json.load(f)

        if user_id in chats_data:
            chats_data[user_id] = [chat for chat in chats_data[user_id] if chat['id'] != chat_id]

            with open(Config.CHATS_FILE, 'w') as f:
                json.dump(chats_data, f, indent=2)

        return {'success': True}
    except Exception as e:
        print(f"Error deleting chat: {str(e)}")
        return {'error': f'Error deleting chat: {str(e)}'}