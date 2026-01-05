import os
import google.generativeai as genai
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json

app = Flask(__name__)
CORS(app) # This enables CORS for all routes

# Configure the Gemini API with your key.
import os
from dotenv import load_dotenv
import google.generativeai as genai

# Load the environment variables from the .env file
load_dotenv()

# Get the key without providing a hardcoded fallback
api_key = os.getenv('GEMINI_API_KEY1')

if not api_key:
    raise ValueError("No API key found. Please set GEMINI_API_KEY in your .env file.")

genai.configure(api_key=api_key)

# New route to serve the HTML file
@app.route('/')
def serve_index():
    # Assumes your storybot.html file is in the same directory as storybot.py
    return send_from_directory('.', 'storybot.html')

@app.route('/ask', methods=['POST'])
def ask_storybot():
    try:
        data = request.get_json()
        question = data.get('question')
        genre = data.get('genre', 'General')
        age_group = data.get('age_group', 'All Ages')
        length = data.get('length', 'Short')
        subject = data.get('subject', 'General knowledge')

        if not question:
            return jsonify({'error': 'No question provided.'}), 400

        # Construct the prompt for the Gemini API
        prompt = (
            f"Please write a {length} story for {age_group} in a {genre} style "
            f"that explains the topic '{question}' within the subject of '{subject}'. "
            "Make sure the explanation is woven into the story, and the story is creative and easy to understand."
        )

        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        story = response.text

        return jsonify({'response': story})

    except Exception as e:
        # Log the full exception for debugging
        print(f"An error occurred: {e}")
        # Return a generic error to the user
        return jsonify({'error': 'An unexpected error occurred. Please try again.'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)