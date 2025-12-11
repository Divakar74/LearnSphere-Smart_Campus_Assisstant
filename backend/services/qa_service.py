import openai
import os
import json
from .embedding_service import search_similar_chunks, get_all_chunks, get_similarity_groups
from config import Config

# Initialize OpenAI client
client = openai.OpenAI(api_key=Config.OPENAI_API_KEY)

def ask_question(query, user_id, selected_documents=None, chat_history=None):
    if chat_history is None:
        chat_history = []

    # Increase top_k to ensure we get more relevant chunks, especially for specific queries
    similar_chunks = search_similar_chunks(query, user_id, top_k=10, selected_documents=selected_documents)

    # If no chunks found for user and user_id is not default_user, try searching in default_user collection
    if not similar_chunks and user_id != 'default_user' and not selected_documents:
        similar_chunks = search_similar_chunks(query, 'default_user', top_k=5, selected_documents=selected_documents)

    if not similar_chunks:
        return {'answer': 'No relevant information found in uploaded documents.', 'sources': []}

    context = '\n\n'.join([chunk['chunk'] for chunk in similar_chunks])

    # Build messages array with chat history for context
    messages = []

    # Add recent chat history (limit to last 5 messages to save tokens)
    recent_history = chat_history[-5:] if len(chat_history) > 5 else chat_history
    for msg in recent_history:
        # Map 'ai' role to 'assistant' for OpenAI API compatibility
        role = msg.get('role', 'user')
        if role == 'ai':
            role = 'assistant'
        messages.append({
            "role": role,
            "content": msg.get('content', '')
        })

    # Enhanced tutor-like prompt with diagram support
    current_prompt = f"""You are an expert tutor explaining concepts from the provided documents. Answer the student's question in a clear, educational manner.

MANDATORY DIAGRAM REQUIREMENT:
- You MUST generate exactly ONE Mermaid diagram for EVERY response
- The diagram should visually represent the main concept, process, or system being explained
- Use Mermaid syntax to create flowcharts, graphs, or diagrams that help students understand
- Place the diagram code immediately after your explanation introduction

REQUIRED FORMAT:
- Start with a brief explanation paragraph
- Then include the Mermaid diagram using this exact format (copy exactly):
```mermaid
graph TD
    A[First Component] --> B[Second Component]
    C[Third Component] --> B
```
- Do NOT use any other format or variations
- Continue with the rest of your explanation after the diagram
- Make sure the Mermaid code is complete and properly formatted

DIAGRAM TYPES TO USE:
- graph TD (top-down flowchart) for processes and workflows
- graph LR (left-right) for sequences and data flow
- flowchart for decision trees and logic
- stateDiagram for state machines
- classDiagram for object relationships

FORMATTING RULES:
- Write in plain text paragraphs only (no markdown headers, bold, italic, lists)
- Explain concepts step by step like a patient teacher
- Use simple language but be technically accurate
- Include practical examples
- Keep explanations focused and educational

Question: {query}

Context from documents:
{context}

Answer with explanation + Mermaid diagram + continued explanation:"""
    messages.append({"role": "user", "content": current_prompt})

    response = client.chat.completions.create(
        model="gpt-3.5-turbo",  # Use reliable model
        messages=messages,
        max_tokens=800,  # Increased for diagrams
        temperature=0.3  # More consistent responses
    )

    answer = response.choices[0].message.content.strip()

    # Ensure diagram is included - add fallback if missing or malformed
    if '```mermaid' not in answer or '```mermaid\n\n```' in answer or answer.count('```mermaid') < 2:
        # Create specific diagrams for DFS and DDBS
        dfs_diagram = f"""```mermaid
graph TD
    A[Distributed File System] --> B[Client-Server DFS]
    A --> C[Peer-to-Peer DFS]
    A --> D[Cluster-Based DFS]
    A --> E[Cloud-Based DFS]

    B --> F[Single Server]
    B --> G[Multiple Servers]
    C --> H[File Sharing]
    C --> I[Decentralized]

    D --> J[High Performance]
    D --> K[Parallel Access]
    E --> L[Scalable Storage]
    E --> M[Global Access]

    A --> N[Key Features]
    N --> O[Transparency]
    N --> P[Fault Tolerance]
    N --> Q[Scalability]
    N --> R[Security]
```"""

        ddbs_diagram = f"""```mermaid
graph TD
    A[Distributed Database System] --> B[Client-Server DDBS]
    A --> C[Peer-to-Peer DDBS]
    A --> D[Multi-Database DDBS]
    A --> E[Cloud-Based DDBS]

    B --> F[Central Coordination]
    B --> G[Query Processing]
    C --> H[Distributed Queries]
    C --> I[Load Balancing]

    D --> J[Heterogeneous DBs]
    D --> K[Federated Access]
    E --> L[Elastic Scaling]
    E --> M[Global Distribution]

    A --> N[Key Features]
    N --> O[Data Distribution]
    N --> P[Location Transparency]
    N --> Q[Concurrency Control]
    N --> R[Fault Tolerance]
```"""

        # Replace specific placeholder texts with actual diagrams
        answer = answer.replace(
            "Let's visualize the concept of a Distributed File System with a diagram:",
            f"Here's a visual representation of Distributed File System concepts:\n\n{dfs_diagram}\n\nAs you can see in the diagram above,"
        )
        answer = answer.replace(
            "Now, let's illustrate the architecture of a Distributed Database System:",
            f"Now, let's examine the Distributed Database System architecture:\n\n{ddbs_diagram}\n\nAs shown in the diagram above,"
        )
        answer = answer.replace(
            "The diagram below outlines the Client-Server, Peer-to-Peer, Multi-Database, and Cloud-Based architectures in distributed database systems:",
            f"Here are the key architectures in distributed database systems:\n\n{ddbs_diagram}\n\nAs illustrated in the diagram above,"
        )

        # More general replacements for diagram placeholders
        import re
        answer = re.sub(
            r'The diagram below outlines.*?distributed database systems:',
            f'Here are the key architectures in distributed database systems:\n\n{ddbs_diagram}\n\nAs illustrated in the diagram above,',
            answer
        )

        # If still no mermaid code, add diagrams at the end
        if '```mermaid' not in answer:
            answer = f"{answer}\n\nHere are visual representations of the key concepts:\n\n**Distributed File System:**\n{dfs_diagram}\n\n**Distributed Database System:**\n{ddbs_diagram}"

    sources = [{'filename': chunk['filename'], 'chunk_index': chunk['chunk_index']} for chunk in similar_chunks]

    return {'answer': answer, 'sources': sources}

def generate_single_summary(chunks, filename):
    """
    Generate summary for a single document during upload.
    Optimized for minimal AI token usage and fast processing.
    """
    try:
        # Check if OpenAI API key is available
        from config import Config
        if not Config.OPENAI_API_KEY:
            print(f"DEBUG: OpenAI API key not found for summary generation of {filename}")
            return f"Document '{filename}' uploaded successfully. AI summary temporarily unavailable (API key missing)."

        # Smart sampling: Use first, middle, and last chunks for representative summary
        total_chunks = len(chunks)
        if total_chunks <= 3:
            selected_chunks = chunks
        else:
            selected_chunks = [
                chunks[0],  # Beginning
                chunks[total_chunks // 2],  # Middle
                chunks[-1]  # End
            ]

        combined_text = '\n\n'.join(selected_chunks)

        # Aggressive text limiting for upload-time summaries
        if len(combined_text) > 1500:  # Even more aggressive for upload speed
            # Truncate at the last space to avoid cutting words
            truncated = combined_text[:1500]
            last_space = truncated.rfind(' ')
            if last_space > 0:
                combined_text = truncated[:last_space] + "..."
            else:
                combined_text = truncated + "..."

        # Concise prompt for minimal token usage
        prompt = f"Summarize this document in 2-3 sentences:\n\n{combined_text}"

        print(f"DEBUG: Generating summary for {filename} with {len(prompt)} characters")

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150,  # Increased for better summaries
            temperature=0.3  # Consistent summaries
        )

        summary = response.choices[0].message.content.strip()
        print(f"DEBUG: Successfully generated summary for {filename}: {summary[:50]}...")
        return summary

    except Exception as e:
        print(f"DEBUG: Error generating summary for {filename}: {str(e)}")
        return f"Document '{filename}' uploaded successfully. AI summary temporarily unavailable."

def get_detailed_summaries(user_id, filename):
    """
    Generate a detailed summary for a specific document when requested.
    Retrieves chunks internally and provides comprehensive overview.
    """
    try:
        from config import Config
        if not Config.OPENAI_API_KEY:
            return "Detailed summary unavailable - API key missing."

        # Get all chunks for the user
        all_chunks = get_all_chunks(user_id)

        # Filter chunks for the specific filename
        chunks = [chunk for chunk in all_chunks if chunk['filename'] == filename]

        if not chunks:
            return f"No chunks found for document '{filename}'."

        # Use more chunks for detailed summary
        total_chunks = len(chunks)
        if total_chunks <= 5:
            selected_chunks = chunks
        elif total_chunks <= 10:
            selected_chunks = chunks[::2]  # Every other chunk
        else:
            # Sample more chunks for detailed summary
            step = max(1, total_chunks // 15)
            selected_chunks = chunks[::step][:15]

        combined_text = '\n\n'.join([chunk['chunk'] for chunk in selected_chunks])

        # Allow more text for detailed summary
        if len(combined_text) > 4000:
            combined_text = combined_text[:4000] + "..."

        prompt = f"""Provide a comprehensive and detailed summary of this document. Include:
1. Main topic and purpose
2. Key concepts and ideas
3. Important details and examples
4. Structure and organization
5. Any conclusions or recommendations

Document content:
{combined_text}

Provide a detailed summary in 4-6 paragraphs:"""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=800,
            temperature=0.3
        )

        detailed_summary = response.choices[0].message.content.strip()
        return detailed_summary

    except Exception as e:
        print(f"Error generating detailed summary for {filename}: {str(e)}")
        return "Detailed summary temporarily unavailable."

def get_detailed_summaries_cached(user_id, filename):
    """
    Get detailed summary with caching to reduce loading time.
    """
    try:
        import os
        from config import Config

        # Check if detailed summaries file exists
        if not os.path.exists(Config.DETAILED_SUMMARIES_FILE):
            os.makedirs(os.path.dirname(Config.DETAILED_SUMMARIES_FILE), exist_ok=True)
            with open(Config.DETAILED_SUMMARIES_FILE, 'w') as f:
                json.dump({}, f)

        with open(Config.DETAILED_SUMMARIES_FILE, 'r') as f:
            detailed_summaries = json.load(f)

        key = f"{user_id}_{filename}"
        if key in detailed_summaries:
            return detailed_summaries[key]

        # Generate and cache
        detailed_summary = get_detailed_summaries(user_id, filename)
        detailed_summaries[key] = detailed_summary

        with open(Config.DETAILED_SUMMARIES_FILE, 'w') as f:
            json.dump(detailed_summaries, f, indent=2)

        return detailed_summary

    except Exception as e:
        print(f"Error in cached detailed summary for {filename}: {str(e)}")
        return get_detailed_summaries(user_id, filename)

def get_summaries(user_id):
    """
    Optimized summarization with minimal AI token usage.
    Retrieves cached summaries from local storage.
    """
    try:
        if not os.path.exists(Config.SUMMARIES_FILE):
            return []

        with open(Config.SUMMARIES_FILE, 'r') as f:
            summaries = json.load(f)

        result = []
        for filename, data in summaries.items():
            if data.get('user_id') == user_id:
                result.append({
                    'filename': filename,
                    'summary': data['summary']
                })

        return result
    except Exception as e:
        return [{'filename': 'error', 'summary': f'Error fetching summaries: {str(e)}'}]

def get_stored_quizzes(user_id, topic=None):
    """
    Retrieve stored quizzes for a user, optionally filtered by topic.
    For logged-in users, also includes quizzes from 'default_user' to handle migration.
    """
    try:
        if not os.path.exists(Config.QUIZZES_FILE):
            return []

        with open(Config.QUIZZES_FILE, 'r') as f:
            quizzes = json.load(f)

        result = []
        # Get quizzes for the user
        for quiz_id, quiz_data in quizzes.items():
            if quiz_data.get('user_id') == user_id:
                if topic is None or quiz_data.get('topic') == topic:
                    result.append({
                        'id': quiz_id,
                        'topic': quiz_data.get('topic', 'General'),
                        'documents': quiz_data.get('documents', []),
                        'num_questions': len(quiz_data.get('questions', [])),
                        'created_at': quiz_data.get('created_at', 'Unknown')
                    })

        # For logged-in users, also get quizzes from 'default_user' to handle migration
        if user_id != 'default_user':
            for quiz_id, quiz_data in quizzes.items():
                if quiz_data.get('user_id') == 'default_user':
                    if topic is None or quiz_data.get('topic') == topic:
                        # Avoid duplicates by checking if quiz already exists
                        existing_ids = {q['id'] for q in result}
                        if quiz_id not in existing_ids:
                            result.append({
                                'id': quiz_id,
                                'topic': quiz_data.get('topic', 'General'),
                                'documents': quiz_data.get('documents', []),
                                'num_questions': len(quiz_data.get('questions', [])),
                                'created_at': quiz_data.get('created_at', 'Unknown')
                            })

        return result
    except Exception as e:
        print(f"Error retrieving stored quizzes: {str(e)}")
        return []

def save_quiz(user_id, topic, documents, questions):
    """
    Save a generated quiz to avoid regenerating it.
    """
    try:
        quizzes = {}
        if os.path.exists(Config.QUIZZES_FILE):
            with open(Config.QUIZZES_FILE, 'r') as f:
                quizzes = json.load(f)

        # Create a unique quiz ID based on topic and documents
        quiz_id = f"{user_id}_{topic}_{'_'.join(sorted(documents))}"

        quizzes[quiz_id] = {
            'user_id': user_id,
            'topic': topic,
            'documents': documents,
            'questions': questions,
            'created_at': str(os.times())
        }

        with open(Config.QUIZZES_FILE, 'w') as f:
            json.dump(quizzes, f, indent=2)

        return quiz_id
    except Exception as e:
        print(f"Error saving quiz: {str(e)}")
        return None

def get_quiz_by_id(quiz_id):
    """
    Retrieve a specific quiz by its ID.
    """
    try:
        if not os.path.exists(Config.QUIZZES_FILE):
            return None

        with open(Config.QUIZZES_FILE, 'r') as f:
            quizzes = json.load(f)

        return quizzes.get(quiz_id)
    except Exception as e:
        print(f"Error retrieving quiz {quiz_id}: {str(e)}")
        return None

def generate_quiz(user_id, selected_documents=None, num_questions=5, topic="General"):
    """
    Generate a practice quiz with multiple choice questions from uploaded documents.
    Enhanced for topic-based generation with more elaborate questions.
    Checks for existing quizzes first to avoid wasting tokens.
    """
    try:
        # Check if a quiz already exists for this topic and documents
        if selected_documents:
            quiz_id = f"{user_id}_{topic}_{'_'.join(sorted(selected_documents))}"
            existing_quiz = get_quiz_by_id(quiz_id)
            if existing_quiz and len(existing_quiz.get('questions', [])) >= num_questions:
                return {
                    'quiz': existing_quiz['questions'][:num_questions],
                    'total_questions': num_questions,
                    'documents_used': selected_documents,
                    'cached': True,
                    'topic': topic
                }

        # Get relevant chunks from selected documents or all documents
        all_chunks = get_all_chunks(user_id)
        if selected_documents:
            # Filter chunks to only include selected documents
            all_chunks = [chunk for chunk in all_chunks if chunk['filename'] in selected_documents]

        if not all_chunks:
            return {'error': 'No documents found. Please upload documents first.'}

        # Use more chunks for topic-based quizzes to generate better questions
        total_chunks = len(all_chunks)
        if total_chunks <= 15:
            selected_chunks = all_chunks
        else:
            # Sample chunks more comprehensively for topic-based generation
            step = max(1, total_chunks // 15)
            selected_chunks = all_chunks[::step][:15]

        combined_text = '\n\n'.join([chunk['chunk'] for chunk in selected_chunks])

        # Allow more text for elaborate topic-based quizzes
        if len(combined_text) > 4000:
            combined_text = combined_text[:4000] + "..."

        # Enhanced prompt for topic-based elaborate quizzes
        prompt = f"""Based on the following content from the topic "{topic}", generate {num_questions} high-quality multiple choice questions for an advanced practice quiz. Each question should:

1. Test deep understanding of key concepts
2. Include scenario-based or application questions where appropriate
3. Have 4 options (A, B, C, D) with one clearly correct answer
4. Provide detailed explanations that teach the concept

Content:
{combined_text}

Format your response as a JSON array of objects with this structure:
[
  {{
    "question": "Detailed question that tests understanding of {topic} concepts?",
    "options": ["A) Option 1 with explanation", "B) Option 2 with explanation", "C) Option 3 with explanation", "D) Option 4 with explanation"],
    "correct_answer": "A",
    "explanation": "Detailed explanation of why this is correct and why other options are wrong, including relevant concepts from {topic}",
    "difficulty": "easy|medium|hard",
    "topic_area": "specific subtopic within {topic}"
  }}
]

Ensure questions are challenging and educational, focusing on {topic} concepts."""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2000,  # Increased for more detailed questions
            temperature=0.7
        )

        quiz_content = response.choices[0].message.content.strip()

        # Try to parse the JSON response
        try:
            # Clean up the response if it has markdown formatting
            if quiz_content.startswith('```json'):
                quiz_content = quiz_content[7:]
            if quiz_content.endswith('```'):
                quiz_content = quiz_content[:-3]

            quiz_data = json.loads(quiz_content.strip())

            # Validate and enhance quiz data
            for question in quiz_data:
                # Ensure all required fields are present
                if 'difficulty' not in question:
                    question['difficulty'] = 'medium'
                if 'topic_area' not in question:
                    question['topic_area'] = topic

            # Save the quiz for future use
            saved_quiz_id = save_quiz(user_id, topic, selected_documents or ['all'], quiz_data)

            return {
                'quiz': quiz_data,
                'total_questions': len(quiz_data),
                'documents_used': selected_documents or ['all'],
                'cached': False,
                'quiz_id': saved_quiz_id,
                'topic': topic
            }

        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {e}")
            print(f"Raw response: {quiz_content}")
            return {'error': 'Failed to generate quiz. Please try again.'}

    except Exception as e:
        print(f"Error generating quiz: {str(e)}")
        return {'error': f'Error generating quiz: {str(e)}'}

def categorize_documents_by_similarity(user_id):
    """
    Categorize documents by similarity using embedding-based clustering.
    Returns groups of similar documents.
    """
    try:
        # Use the existing get_similarity_groups function from embedding_service
        groups = get_similarity_groups(user_id)

        # Format the response for the API
        categories = []
        for group in groups:
            categories.append({
                'name': group['name'],
                'documents': group['documents'],
                'similarity_percentage': group['similarity_percentage'],
                'document_count': group['document_count'],
                'group_type': group.get('group_type', 'similarity')
            })

        return categories

    except Exception as e:
        print(f"Error categorizing documents by similarity: {str(e)}")
        return []

def generate_knowledge_graph(user_id, topic=None):
    """
    Generate a knowledge graph for documents, optionally filtered by topic.
    Returns nodes and edges representing relationships between concepts.
    """
    try:
        from config import Config
        if not Config.OPENAI_API_KEY:
            return {'nodes': [], 'edges': [], 'error': 'API key missing'}

        # Get all chunks for the user
        all_chunks = get_all_chunks(user_id)

        if not all_chunks:
            return {'nodes': [], 'edges': [], 'error': 'No documents found'}

        # Filter by topic if specified
        if topic:
            # Get topic documents from topic_service
            from .topic_service import get_topic_documents
            topic_documents = get_topic_documents(user_id, topic)
            if topic_documents:
                all_chunks = [chunk for chunk in all_chunks if chunk['filename'] in topic_documents]

        # Sample chunks for knowledge graph generation (limit to avoid token limits)
        total_chunks = len(all_chunks)
        if total_chunks > 20:
            # Sample chunks more comprehensively
            step = max(1, total_chunks // 20)
            selected_chunks = all_chunks[::step][:20]
        else:
            selected_chunks = all_chunks

        combined_text = '\n\n'.join([chunk['chunk'] for chunk in selected_chunks])

        # Limit text length
        if len(combined_text) > 6000:
            combined_text = combined_text[:6000] + "..."

        prompt = f"""Analyze the following document content and generate a knowledge graph structure. Extract key concepts, entities, and their relationships.

Content:
{combined_text}

Return a JSON object with the following structure:
{{
  "nodes": [
    {{
      "id": "concept1",
      "label": "Concept Name",
      "type": "concept|entity|topic",
      "importance": 1-10
    }}
  ],
  "edges": [
    {{
      "source": "concept1",
      "target": "concept2",
      "relationship": "related_to|part_of|depends_on|example_of",
      "weight": 1-10
    }}
  ]
}}

Focus on the most important concepts and relationships. Limit to 10-15 nodes maximum."""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1500,
            temperature=0.3
        )

        graph_content = response.choices[0].message.content.strip()

        # Try to parse the JSON response
        try:
            # Clean up the response if it has markdown formatting
            if graph_content.startswith('```json'):
                graph_content = graph_content[7:]
            if graph_content.endswith('```'):
                graph_content = graph_content[:-3]

            graph_data = json.loads(graph_content.strip())

            # Validate structure
            if 'nodes' not in graph_data:
                graph_data['nodes'] = []
            if 'edges' not in graph_data:
                graph_data['edges'] = []

            return graph_data

        except json.JSONDecodeError as e:
            print(f"JSON parsing error in knowledge graph: {e}")
            print(f"Raw response: {graph_content}")
            return {'nodes': [], 'edges': [], 'error': 'Failed to parse knowledge graph'}

    except Exception as e:
        print(f"Error generating knowledge graph: {str(e)}")
        return {'nodes': [], 'edges': [], 'error': str(e)}
