Smart Campus Assistant

A lightweight AI-powered academic assistant that helps students upload, organize, summarize, search, and learn from their study materials. The system uses Retrieval-Augmented Generation (RAG), intelligent document processing, quizzes, flashcards, and learning analytics to enhance study efficiency.

# Features

-> AI-based document processing (PDF, DOCX, PPTX, TXT)

-> AI-generated concise and detailed summaries

-> Folder-based document organization

-> JWT authentication with secure protected routes

-> In-app PDF/TXT document viewer

-> RAG-powered chat for contextual Q&A

-> Auto-generated quizzes and flashcards

-> Learning dashboard with progress analytics

# Technology Stack
Backend

->Python (Flask)

->Flask-JWT-Extended

->SQLite (user and metadata storage)

->ChromaDB (vector store for embeddings)

->Sentence-Transformers

->OpenAI API

->pdfplumber, python-docx, python-pptx

Frontend

->React 18 with Vite

->TailwindCSS

->React Router

->Axios

->Recharts

# Project Architecture
# Document Pipeline

->File upload to temporary storage

->Text extraction from PDF/DOCX/PPTX/TXT

->Semantic chunking

->Embedding generation using sentence-transformers

->Storage of embeddings in ChromaDB and metadata in SQLite

# RAG Chat Flow

->User query is converted into an embedding

->Vector similarity search retrieves top relevant chunks

->Retrieved context is assembled

->Context and query are sent to the OpenAI model

->A context-grounded response is returned

# Learning System

->Quiz generation based on document content

->Flashcard creation with spaced repetition scheduling

->User progress and analytics tracking

# Installation
Backend
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python init_db.py
python app.py

Frontend
cd frontend/learnsphere
npm install
npm run dev

# Core API Endpoints

Authentication: /api/auth/register, /api/auth/login

File Upload: /api/upload

Documents: /api/documents

Folders: /api/folders

Chat: /api/chat/ask

Summaries: /api/summaries

Quizzes: /api/quizzes/generate

Flashcards: /api/flashcards

Progress Analytics: /api/progress

# Folder Structure
backend/
  app.py
  routes/
  services/
  chromadb_data/
  documents/

frontend/
  learnsphere/

# Screenshots
1.Landing Page
<img width="1898" height="857" alt="image" src="https://github.com/user-attachments/assets/b2a755d1-5042-46a5-97e3-c6f5284bf866" />
2.Document Upload component
<img width="1887" height="860" alt="image" src="https://github.com/user-attachments/assets/c10c8cdd-e4c2-45e3-b7ca-e71d22f1715c" />
3.User Dashboard
<img width="1897" height="870" alt="image" src="https://github.com/user-attachments/assets/c07744a8-0c47-41a6-b0a3-7295bc66af7d" />
4.Uploaded Documents and their Summary
<img width="1903" height="861" alt="image" src="https://github.com/user-attachments/assets/05997ee9-cd62-4aef-82fe-d2f28a96de23" />
<img width="1905" height="867" alt="image" src="https://github.com/user-attachments/assets/418bcb0a-9774-477e-a68c-314a1eb80466" />
5.Quiz Component
<img width="1890" height="844" alt="image" src="https://github.com/user-attachments/assets/9f951da5-1ef0-4194-ad3f-7f39ea82237a" />
6.Chat Component
<img width="1896" height="854" alt="image" src="https://github.com/user-attachments/assets/e859b4ae-55b2-41bf-aadf-8c9091fad768" />

Happy Learning !❤️
