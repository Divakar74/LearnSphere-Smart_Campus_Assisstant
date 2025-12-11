import os
import json
import time
from services.qa_service import generate_single_summary
from services.document_processor import extract_text
from config import Config

# Load existing summaries
summaries_file = Config.SUMMARIES_FILE
if os.path.exists(summaries_file):
    with open(summaries_file, 'r') as f:
        summaries = json.load(f)
else:
    summaries = {}

# Get list of documents
documents_folder = Config.DOCUMENTS_FOLDER
documents = [f for f in os.listdir(documents_folder) if f.endswith(tuple(Config.ALLOWED_EXTENSIONS))]

print(f'Found {len(documents)} documents')
print(f'Existing summaries: {len(summaries)}')

for filename in documents:
    if filename not in summaries:
        print(f'Generating summary for {filename}')
        filepath = os.path.join(documents_folder, filename)
        try:
            text = extract_text(filepath)
            summary = generate_single_summary(text, filename)
            summaries[filename] = {
                'summary': summary,
                'timestamp': str(int(time.time())),
                'user_id': 'default_user'
            }
            print(f'Summary generated for {filename}')
        except Exception as e:
            print(f'Error generating summary for {filename}: {str(e)}')

# Save the updated summaries
with open(summaries_file, 'w') as f:
    json.dump(summaries, f, indent=2)

print('Summary generation complete')
