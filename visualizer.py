import os
import google.generativeai as genai
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS

import os
from dotenv import load_dotenv # Add this
import google.generativeai as genai
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

# Load the variables from the .env file
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure the Gemini API using the environment variable
api_key = os.getenv('VISUALIZER')

if not api_key:
    raise ValueError("GEMINI_API_KEY not found. Ensure it is set in your .env file.")

genai.configure(api_key=api_key)

# ... rest of your code ...

@app.route('/')
def serve_visualizer_page():
    return send_from_directory('.', 'visualizer.html')

@app.route('/generate_map', methods=['POST'])
def generate_map():
    try:
        data = request.get_json()
        topic = data.get('topic')
        subject = data.get('subject')

        if not topic or not subject:
            return jsonify({'error': 'Missing topic or subject'}), 400

        # Prompt the Gemini API to generate Mermaid syntax for a flowchart
        prompt = (
    f"You are an expert tutor in {subject}. Your task is to generate a simple, high-level flowchart or mind map for the topic '{topic}' in the context of {subject}. "
    f"The diagram must be easy for small children to understand; avoid complex structures, jargon, or deep subtopics. "
    f"Provide only the Mermaid.js code, with no additional text or explanations. "
    f"Start with a valid Mermaid diagram type like 'graph TD' or 'mindmap'. "
    f"If the subject is 'Telugu', the entire output (labels, nodes, and text) must be strictly in the Telugu language only. "
    f"If the topic is not relevant to the subject, respond with 'This topic is not relevant to the selected subject.' and nothing else."
)

        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        mermaid_code = response.text

        return jsonify({'mermaid_code': mermaid_code})

    except Exception as e:
        print(f"An error occurred: {e}")
        return jsonify({'error': 'An unexpected error occurred. Please try again.'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5002)