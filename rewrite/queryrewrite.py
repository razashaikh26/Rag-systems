from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
import torch

model_id = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"

tokenizer = AutoTokenizer.from_pretrained(model_id)

model = AutoModelForCausalLM.from_pretrained(
    model_id,
    device_map="cpu",
    cache_dir="./models",      
    dtype=torch.float32
)

pipe = pipeline(
    "text-generation",
    model=model,
    tokenizer=tokenizer,
    max_new_tokens=42,
    do_sample=False
)


from langchain_huggingface import HuggingFacePipeline
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate


parser = StrOutputParser()
llm = HuggingFacePipeline(pipeline=pipe)

prompt = PromptTemplate(
    template="""
Rewrite the following user query into a clear, complete question optimized for document retrieval.
If the query is incomplete, infer the most likely intent and rewrite it as a full question.
Do NOT answer the question.

User query: {query}
""",
   input_variables=["query"]
)

model = prompt | llm | parser

def rewrite(query):
    op = model.invoke({"query": query}).strip()

    if "User query:" in op:
        op = op.split("User query:")[-1].strip()

    lines = [l.strip() for l in op.split("\n") if l.strip()]

    print(lines)
    print(query)
    q_norm = query.lower()

    for line in lines:
        line = line.lstrip("0123456789. ").strip()

        # Skip if it's the same as original
        if line.lower() == q_norm:
            continue

        # Skip header lines
        if line.lower().startswith(("question:", "intent:", "incomplete", "rewritten")):
            # Extract the actual question after the colon
            if ":" in line:
                extracted = line.split(":", 1)[1].strip()
                if len(extracted.split()) >= 3 and extracted.endswith("?"):
                    return extracted
            continue

        # Look for a good complete question
        if len(line.split()) >= 3 and line.endswith("?"):
            return line


    # If no good rewrite found, return original
    return query