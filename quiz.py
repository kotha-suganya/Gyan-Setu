from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
import google.generativeai as genai
import json
import os

app = Flask(__name__)
CORS(app)

# IMPORTANT: Replace "YOUR_API_KEY" with your actual Google API key.
GEMINI_API_KEY = os.getenv("QUIZ")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel('gemini-2.5-flash')
else:
    print("Warning: GEMINI_API_KEY not found. Chatbot functionality will be limited.")

@app.route('/')
def home():
    """Serves the quiz.html file directly when the user visits the root URL."""
    return render_template('quiz.html')


@app.route('/api/questions', methods=['GET'])
def get_questions():
    """
    Dynamically generates and returns quiz questions using a large language model.
    """
    subject = request.args.get('subject')
    student_class = request.args.get('class')
    difficulty = request.args.get('difficulty')

    if not all([subject, student_class, difficulty]):
        return jsonify({'error': 'Missing subject, class, or difficulty parameter. Please select all options.'}), 400

    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Craft a clear prompt for the AI model to generate questions in a specific JSON format.
        prompt = (
            f"Generate 5 unique multiple-choice questions for a quiz on the subject of '{subject}' "
            f"for a '{student_class}' student at an '{difficulty}' difficulty level. "
            f"The response must be a JSON array of objects. Each object should have three keys: "
            f"'question' (string), 'options' (an array of 4-5 strings), and 'answer' (a string that is one of the options). "
            f"Do not include any other text or explanation, just the JSON."
        )

        response = model.generate_content(prompt)
        
        # Extract the text and attempt to parse it as JSON.
        generated_json_string = response.text.replace('```json\n', '').replace('```', '').strip()
        questions = json.loads(generated_json_string)

        return jsonify(questions)

    except json.JSONDecodeError:
        print(f"Failed to parse JSON: {response.text}")
        return jsonify({'error': 'Failed to generate questions. Please try again or select a different combination.'}), 500
    except Exception as e:
        print(f"An error occurred: {e}")
        return jsonify({'error': 'An unexpected error occurred. Please try again later.'}), 500


if __name__ == '__main__':
    app.run(port=5003, debug=True)