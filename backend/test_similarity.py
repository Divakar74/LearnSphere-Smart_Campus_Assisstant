#!/usr/bin/env python3

from services.embedding_service import get_similarity_groups

def test_similarity_grouping():
    print("Testing similarity grouping for default user...")

    # Test with default threshold
    groups = get_similarity_groups('default_user', threshold=0.65)

    print(f"\nFound {len(groups)} similarity groups:")

    for i, group in enumerate(groups, 1):
        print(f"\nGroup {i}: {group['name']}")
        print(f"Type: {group.get('group_type', 'similarity')}")
        print(f"Documents ({group['document_count']}):")
        for doc in group['documents']:
            print(f"  - {doc}")
        print(f"Average similarity: {group['similarity_percentage']}%")

    # Check if distributed documents are grouped
    distributed_docs = ['2.1_Distributed_File_System.pdf', '2.7_Distributed_Database_Systems.pdf']
    found_group = None

    for group in groups:
        if all(doc in group['documents'] for doc in distributed_docs):
            found_group = group
            break

    if found_group:
        print(f"\n✓ SUCCESS: Distributed documents are grouped together in '{found_group['name']}'")
        print(f"Group type: {found_group.get('group_type', 'similarity')}")
        print(f"Similarity: {found_group['similarity_percentage']}%")
    else:
        print("\n✗ ISSUE: Distributed documents are NOT grouped together")

        # Show which groups contain which documents
        print("\nDocument distribution across groups:")
        for group in groups:
            for doc in distributed_docs:
                if doc in group['documents']:
                    print(f"- {doc} is in group '{group['name']}'")

if __name__ == "__main__":
    test_similarity_grouping()
