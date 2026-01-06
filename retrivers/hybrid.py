def hybrid_retrieve_top1(query, bm25_retriever, vector_retriever, scope_id=None):
    bm25_docs = bm25_retriever.invoke(query)  # Fixed method name
    vector_docs = vector_retriever.invoke(query)  # Fixed method name
    
    # Filter by scope_id if provided
    if scope_id:
        bm25_docs = [d for d in bm25_docs if d.metadata.get("scope_id") == scope_id]
    
    combined = {}
    for doc in bm25_docs + vector_docs:
        combined[doc.page_content] = doc  # removing duplicates

    if not combined:
        return None
    return list(combined.values())[0]

