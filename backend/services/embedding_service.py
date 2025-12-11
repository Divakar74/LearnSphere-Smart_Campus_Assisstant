import chromadb
from sentence_transformers import SentenceTransformer
from config import Config
import os

model = SentenceTransformer('all-MiniLM-L6-v2')
client = chromadb.PersistentClient(path=Config.CHROMADB_PATH)

def store_embeddings(chunks, filename, user_id):
    collection_name = f"user_{user_id}"
    collection = client.get_or_create_collection(name=collection_name)

    embeddings = model.encode(chunks)
    # Generate truly unique IDs to avoid conflicts when re-uploading same file
    import uuid
    import time
    timestamp = str(int(time.time() * 1000000))  # Microsecond precision timestamp
    ids = [f"{filename}_{timestamp}_{uuid.uuid4().hex}_{i}" for i in range(len(chunks))]
    metadatas = [{'filename': filename, 'chunk_index': i} for i in range(len(chunks))]

    collection.add(
        embeddings=embeddings.tolist(),
        documents=chunks,
        metadatas=metadatas,
        ids=ids
    )

def search_similar_chunks(query, user_id, top_k=5, selected_documents=None):
    """
    Optimized similarity search using cosine similarity.
    Returns most relevant chunks for effective AI explanations.
    If selected_documents is provided, only search within those documents.
    For logged-in users, also searches in 'default_user' collection if no results found.
    """
    collection_name = f"user_{user_id}"
    query_embedding = model.encode([query])[0]

    def search_collection(collection_name, query_embedding, top_k, selected_documents):
        try:
            collection = client.get_collection(name=collection_name)
        except:
            return []

        # If selected_documents is specified, we need to filter results
        if selected_documents:
            # Get more results initially since we'll filter them
            initial_results = collection.query(
                query_embeddings=[query_embedding.tolist()],
                n_results=top_k * 3,  # Get more results to account for filtering
                include=['documents', 'metadatas', 'distances']
            )

            if not initial_results.get('documents') or not initial_results['documents'][0]:
                return []

            # Filter results to only include selected documents
            filtered_chunks = []
            for i, doc in enumerate(initial_results['documents'][0]):
                filename = initial_results['metadatas'][0][i]['filename']
                if filename in selected_documents:
                    similarity_score = 1 - (initial_results['distances'][0][i] ** 2) / 2
                    filtered_chunks.append({
                        'chunk': doc,
                        'filename': filename,
                        'chunk_index': initial_results['metadatas'][0][i]['chunk_index'],
                        'similarity_score': similarity_score
                    })

            # Sort by similarity score and take top_k
            filtered_chunks.sort(key=lambda x: x['similarity_score'], reverse=True)
            return filtered_chunks[:top_k]
        else:
            # Original behavior when no documents are selected (search all)
            results = collection.query(
                query_embeddings=[query_embedding.tolist()],
                n_results=top_k,
                include=['documents', 'metadatas', 'distances']
            )

            if not results.get('documents') or not results['documents'][0]:
                return []

            similar_chunks = []
            for i, doc in enumerate(results['documents'][0]):
                similarity_score = 1 - results['distances'][0][i]

                similar_chunks.append({
                    'chunk': doc,
                    'filename': results['metadatas'][0][i]['filename'],
                    'chunk_index': results['metadatas'][0][i]['chunk_index'],
                    'similarity_score': similarity_score
                })

            # Sort by similarity score (highest first) for better relevance
            similar_chunks.sort(key=lambda x: x['similarity_score'], reverse=True)
            return similar_chunks

    # First try searching in user's collection
    results = search_collection(collection_name, query_embedding, top_k, selected_documents)

    # If no results and user is not default_user, also search in default_user collection
    if not results and user_id != 'default_user' and not selected_documents:
        default_results = search_collection("user_default_user", query_embedding, top_k, selected_documents)
        results = default_results

    return results

def get_all_chunks(user_id):
    chunks = []

    # Get chunks from user's collection
    collection_name = f"user_{user_id}"
    try:
        collection = client.get_collection(name=collection_name)
        results = collection.get(include=['documents', 'metadatas'])
        for i, doc in enumerate(results['documents']):
            chunks.append({
                'chunk': doc,
                'filename': results['metadatas'][i]['filename'],
                'chunk_index': results['metadatas'][i]['chunk_index']
            })
    except:
        pass  # Collection doesn't exist, continue to default_user

    # For logged-in users, also get chunks from 'default_user' collection
    if user_id != 'default_user':
        try:
            default_collection = client.get_collection(name="user_default_user")
            default_results = default_collection.get(include=['documents', 'metadatas'])

            # Avoid duplicates by filename and chunk_index
            existing_chunks = {(chunk['filename'], chunk['chunk_index']) for chunk in chunks}

            for i, doc in enumerate(default_results['documents']):
                filename = default_results['metadatas'][i]['filename']
                chunk_index = default_results['metadatas'][i]['chunk_index']
                if (filename, chunk_index) not in existing_chunks:
                    chunks.append({
                        'chunk': doc,
                        'filename': filename,
                        'chunk_index': chunk_index
                    })
        except:
            pass  # Default collection doesn't exist either

    return chunks

def get_documents(user_id):
    """
    Get all unique documents for a user with metadata.
    For logged-in users, also includes documents from 'default_user' collection.
    """
    documents = []

    # Get documents from user's collection
    collection_name = f"user_{user_id}"
    try:
        collection = client.get_collection(name=collection_name)
        results = collection.get(include=['metadatas'])

        # Get unique filenames
        unique_files = set()
        for metadata in results['metadatas']:
            unique_files.add(metadata['filename'])

        for filename in unique_files:
            file_path = os.path.join(Config.DOCUMENTS_FOLDER, filename)
            if os.path.exists(file_path):
                stat = os.stat(file_path)
                documents.append({
                    'filename': filename,
                    'size': stat.st_size,
                    'uploaded_at': stat.st_mtime
                })
    except Exception as e:
        # Collection doesn't exist, continue to default_user
        pass

    # For logged-in users, also get documents from 'default_user' collection
    if user_id != 'default_user':
        try:
            default_collection = client.get_collection(name="user_default_user")
            default_results = default_collection.get(include=['metadatas'])

            # Get unique filenames from default collection
            default_files = set()
            for metadata in default_results['metadatas']:
                default_files.add(metadata['filename'])

            # Merge documents, avoiding duplicates by filename
            existing_filenames = {doc['filename'] for doc in documents}
            for filename in default_files:
                if filename not in existing_filenames:
                    file_path = os.path.join(Config.DOCUMENTS_FOLDER, filename)
                    if os.path.exists(file_path):
                        stat = os.stat(file_path)
                        documents.append({
                            'filename': filename,
                            'size': stat.st_size,
                            'uploaded_at': stat.st_mtime
                        })
        except Exception as e:
            # Default collection doesn't exist either
            pass

    return documents

def get_similarity_groups(user_id, threshold=0.65):
    """
    Group documents by similarity based on their embeddings using cosine similarity.
    Returns groups of documents that are similar above the threshold.
    For logged-in users, also includes documents from 'default_user' collection.
    Uses improved clustering with meaningful group names and concept-based grouping.
    """
    try:
        all_embeddings = []
        all_metadatas = []

        # Get data from user's collection
        collection_name = f"user_{user_id}"
        try:
            collection = client.get_collection(name=collection_name)
            results = collection.get(include=['embeddings', 'metadatas'])
            if results['embeddings'] and results['metadatas']:
                all_embeddings.extend(results['embeddings'])
                all_metadatas.extend(results['metadatas'])
        except:
            pass  # Collection doesn't exist

        # For logged-in users, also get data from 'default_user' collection
        if user_id != 'default_user':
            try:
                default_collection = client.get_collection(name="user_default_user")
                default_results = default_collection.get(include=['embeddings', 'metadatas'])
                if default_results['embeddings'] and default_results['metadatas']:
                    all_embeddings.extend(default_results['embeddings'])
                    all_metadatas.extend(default_results['metadatas'])
            except:
                pass  # Default collection doesn't exist

        if not all_embeddings or not all_metadatas:
            return []

        # Group chunks by filename
        doc_embeddings = {}
        for i, metadata in enumerate(all_metadatas):
            if not metadata or 'filename' not in metadata:
                continue
            filename = metadata['filename']
            if filename not in doc_embeddings:
                doc_embeddings[filename] = []
            if i < len(all_embeddings):
                doc_embeddings[filename].append(all_embeddings[i])

        # Check if we have enough documents to compare
        if len(doc_embeddings) < 2:
            return []

        # Calculate average embedding for each document
        doc_avg_embeddings = {}
        for filename, embeddings in doc_embeddings.items():
            if not embeddings:
                continue
            import numpy as np
            try:
                avg_embedding = np.mean(embeddings, axis=0)
                doc_avg_embeddings[filename] = avg_embedding
            except Exception as e:
                print(f"Error calculating average embedding for {filename}: {str(e)}")
                continue

        # Check if we have valid embeddings
        if len(doc_avg_embeddings) < 2:
            return []

        # Calculate pairwise similarities
        filenames = list(doc_avg_embeddings.keys())
        similarity_matrix = {}

        for i, filename1 in enumerate(filenames):
            for j, filename2 in enumerate(filenames):
                if i != j:
                    try:
                        emb1 = doc_avg_embeddings[filename1]
                        emb2 = doc_avg_embeddings[filename2]
                        # Cosine similarity with safety checks
                        norm1 = np.linalg.norm(emb1)
                        norm2 = np.linalg.norm(emb2)
                        if norm1 == 0 or norm2 == 0:
                            similarity = 0.0
                        else:
                            similarity = np.dot(emb1, emb2) / (norm1 * norm2)
                        # Ensure similarity is within valid range
                        similarity = max(-1.0, min(1.0, similarity))
                        key = tuple(sorted([filename1, filename2]))
                        similarity_matrix[key] = similarity
                    except Exception as e:
                        print(f"Error calculating similarity between {filename1} and {filename2}: {str(e)}")
                        continue

        # Enhanced clustering algorithm with concept-based grouping
        groups = []
        processed = set()

        # First pass: Look for conceptual similarities (distributed systems, databases, etc.)
        concept_keywords = {
            'distributed': ['distributed', 'distributed systems', 'scalability', 'fault tolerance', 'replication'],
            'database': ['database', 'dbms', 'sql', 'nosql', 'relational', 'data management'],
            'file_system': ['file system', 'filesystem', 'storage', 'hdfs', 'nfs', 'gfs'],
            'data_processing': ['data processing', 'etl', 'preprocessing', 'cleaning', 'transformation'],
            'project': ['project', 'guidelines', 'development', 'implementation']
        }

        # Check filename-based conceptual grouping
        conceptual_groups = {}
        for filename in filenames:
            filename_lower = filename.lower()
            for concept, keywords in concept_keywords.items():
                if any(keyword in filename_lower for keyword in keywords):
                    if concept not in conceptual_groups:
                        conceptual_groups[concept] = []
                    conceptual_groups[concept].append(filename)

        # Create groups for strong conceptual matches
        for concept, docs in conceptual_groups.items():
            if len(docs) > 1:
                # Calculate average similarity within the conceptual group
                similarities = []
                for i in range(len(docs)):
                    for j in range(i+1, len(docs)):
                        key = tuple(sorted([docs[i], docs[j]]))
                        if key in similarity_matrix:
                            similarities.append(similarity_matrix[key])

                if similarities:
                    avg_similarity = sum(similarities) / len(similarities)
                    # If conceptual group has reasonable similarity, create the group
                    if avg_similarity > 0.4:  # Lower threshold for conceptual groups
                        group_name = generate_concept_name(concept, docs)
                        groups.append({
                            'name': group_name,
                            'documents': docs,
                            'average_similarity': avg_similarity,
                            'similarity_percentage': round(avg_similarity * 100, 2),
                            'document_count': len(docs),
                            'group_type': 'conceptual'
                        })
                        # Mark these documents as processed
                        for doc in docs:
                            processed.add(doc)

        # Second pass: Similarity-based clustering for remaining documents
        remaining_filenames = [f for f in filenames if f not in processed]

        if len(remaining_filenames) >= 2:
            # Sort filenames by their connectivity (number of similar documents)
            filename_connectivity = {}
            for filename in remaining_filenames:
                connectivity = 0
                for other_filename in remaining_filenames:
                    if other_filename != filename:
                        key = tuple(sorted([filename, other_filename]))
                        if key in similarity_matrix and similarity_matrix[key] > threshold:
                            connectivity += 1
                filename_connectivity[filename] = connectivity

            # Sort by connectivity (highest first) to prioritize well-connected documents
            sorted_filenames = sorted(filename_connectivity.keys(), key=lambda x: filename_connectivity[x], reverse=True)

            for filename in sorted_filenames:
                if filename in processed:
                    continue

                group = [filename]
                processed.add(filename)

                # Find similar documents with adaptive threshold
                for other_filename in sorted_filenames:
                    if other_filename not in processed:
                        key = tuple(sorted([filename, other_filename]))
                        similarity = similarity_matrix.get(key, 0)

                        # Adaptive threshold: lower for well-connected documents, higher for isolated ones
                        adaptive_threshold = max(threshold - 0.1, 0.5) if filename_connectivity[filename] > 2 else threshold

                        if similarity > adaptive_threshold:
                            group.append(other_filename)
                            processed.add(other_filename)

                if len(group) > 1:  # Only include groups with more than one document
                    # Calculate average similarity for the group
                    similarities = []
                    for i in range(len(group)):
                        for j in range(i+1, len(group)):
                            key = tuple(sorted([group[i], group[j]]))
                            if key in similarity_matrix:
                                similarities.append(similarity_matrix[key])

                    avg_similarity = sum(similarities) / len(similarities) if similarities else 0

                    # Generate meaningful group name based on common themes
                    group_name = generate_group_name(group, avg_similarity)

                    groups.append({
                        'name': group_name,
                        'documents': group,
                        'average_similarity': avg_similarity,
                        'similarity_percentage': round(avg_similarity * 100, 2),
                        'document_count': len(group),
                        'group_type': 'similarity'
                    })

        # Sort groups by average similarity (highest first)
        groups.sort(key=lambda x: x['average_similarity'], reverse=True)

        return groups

    except Exception as e:
        print(f"Error getting similarity groups: {str(e)}")
        return []


def generate_concept_name(concept, documents):
    """
    Generate a meaningful name for concept-based groups.
    """
    concept_names = {
        'distributed': 'Distributed Systems',
        'database': 'Database Systems',
        'file_system': 'File Systems',
        'data_processing': 'Data Processing',
        'project': 'Project Documentation'
    }

    base_name = concept_names.get(concept, concept.title())

    # If multiple documents, make it plural or add count
    if len(documents) > 1:
        return f"{base_name} Collection"

    return base_name


def generate_group_name(documents, similarity_score):
    """
    Generate a meaningful name for a document group based on filename patterns and similarity.
    """
    if not documents:
        return "Similar Documents"

    # Extract common prefixes or themes from filenames
    names = [doc.split('.')[0] for doc in documents]  # Remove extensions

    # Look for common prefixes
    if len(names) > 1:
        prefix = ""
        for i, char in enumerate(names[0]):
            if all(name.startswith(names[0][:i+1]) for name in names[1:]):
                prefix = names[0][:i+1]
            else:
                break

        if len(prefix) > 3:  # Meaningful prefix
            return f"{prefix.title()} Collection"

    # Look for common keywords
    common_words = []
    for name in names:
        words = name.lower().replace('_', ' ').replace('-', ' ').split()
        common_words.extend(words)

    from collections import Counter
    word_counts = Counter(common_words)
    frequent_words = [word for word, count in word_counts.most_common(2) if count > 1]

    if frequent_words:
        return f"{' & '.join(frequent_words).title()} Documents"

    # Fallback to similarity-based naming
    if similarity_score > 0.8:
        return "Highly Similar Documents"
    elif similarity_score > 0.7:
        return "Similar Documents"
    else:
        return "Related Documents"
