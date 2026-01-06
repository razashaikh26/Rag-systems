from langchain_chroma import Chroma
from embedding.embed import get_embeddings
import os

def store_chunks(chunks):
    # Ensure chroma_db directory exists
    os.makedirs("chroma_db", exist_ok=True)
    
    db = Chroma.from_documents(
        documents=chunks,
        embedding=get_embeddings(),
        persist_directory="./chroma_db"
    )
    # Note: Chroma automatically persists when using persist_directory
    return db