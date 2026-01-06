from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_groq import ChatGroq
import os

rag_prompt = PromptTemplate(
    template="""
You are a helpful question-answering assistant.

Answer the question ONLY using the context below.
If the answer is not present in the context, say:
"I don't know."

Context:
{context}

Question:
{question}

Answer:
""",
    input_variables=["context", "question"]
)
model = ChatGroq(
    model="llama-3.1-8b-instant",
    api_key=os.getenv("grok")
)

parser = StrOutputParser()

rag_chain = rag_prompt | model | parser