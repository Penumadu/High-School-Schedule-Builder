from app.core.firebase import get_firestore_client

class FirestoreRepo:
    """
    Generic repository to handle repetitive Firestore CRUD.
    Reduces boilerplate in the API controllers.
    """
    def __init__(self, school_id: str, collection_name: str):
        self.db = get_firestore_client()
        self.ref = self.db.collection("schools").document(school_id).collection(collection_name)

    def list_all(self):
        """Streams all docs and returns list of dicts with IDs."""
        return [{**d.to_dict(), "id": d.id} for d in self.ref.stream()]

    def get_one(self, doc_id: str):
        """Fetches one document or returns None."""
        doc = self.ref.document(doc_id).get()
        return {**doc.to_dict(), "id": doc.id} if doc.exists else None

    def upsert(self, doc_id: str, data: dict):
        """Creates or merges document data."""
        self.ref.document(doc_id).set(data, merge=True)
        return {**data, "id": doc_id}

    def remove(self, doc_id: str):
        """Deletes a document."""
        self.ref.document(doc_id).delete()
