from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv

# Import the Google API libraries
import google.generativeai as genai
from googleapiclient.discovery import build

# Load environment variables from the .env file
load_dotenv()

# Initialize the Flask application with static file path configured
app = Flask(__name__, static_url_path='', static_folder='.')
# Enable CORS for all routes and origins
CORS(app)

# --- API Configuration ---
# Retrieve API keys from environment variables
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")

# Configure Google Gemini API
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel('gemini-2.5-flash')
else:
    print("Warning: GEMINI_API_KEY not found. Chatbot functionality will be limited.")

# Configure YouTube Data API
if YOUTUBE_API_KEY:
    youtube = build('youtube', 'v3', developerKey=YOUTUBE_API_KEY)
else:
    print("Warning: YOUTUBE_API_KEY not found. Video search will not work.")

# --- Endpoints ---

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    user_prompt = data.get('prompt')
    subject = data.get('subject')

    if not GEMINI_API_KEY:
        return jsonify({'response': "I'm sorry, the chatbot service is currently unavailable."})

    try:
        # Create a subject-aware prompt for the AI
        full_prompt = f"As a helpful assistant specializing in {subject}, answer this question: {user_prompt}"
        
        # Make the actual API call to Google Gemini
        response = gemini_model.generate_content(full_prompt)
        bot_response = response.text
        
    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        bot_response = "I'm sorry, I'm having trouble thinking right now. Please try again later."

    return jsonify({'response': bot_response})


@app.route('/visuals', methods=['POST'])
def get_visuals():
    data = request.json
    user_query = data.get('query')
    subject = data.get('subject')

    if not YOUTUBE_API_KEY:
        return jsonify({'video_id': 'dQw4w9WgXcQ'}) # Return a default video

    try:
        # Construct a targeted search query
        search_query = f"{user_query} {subject} tutorial"
        
        # Make the actual API call to YouTube
        search_response = youtube.search().list(
            q=search_query,
            part='snippet',
            maxResults=1,
            type='video'
        ).execute()

        # Extract the video ID from the response
        if search_response['items']:
            video_id = search_response['items'][0]['id']['videoId']
        else:
            video_id = 'dQw4w9WgXcQ' # Default video if no results found

    except Exception as e:
        print(f"Error calling YouTube API: {e}")
        video_id = 'dQw4w9WgXcQ' # Default video on error

    return jsonify({
        'video_id': video_id,
        'visual_url': f'https://www.youtube.com/watch?v={video_id}'
    })
from flask import Flask, request, jsonify
from flask_cors import CORS

# app = Flask(__name__)
# CORS(app) # This will enable CORS for all routes

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'message': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'message': 'No selected file'}), 400
    if file:
        # Define the upload folder. It's good practice to make this configurable.
        # For simplicity, we'll create an 'uploads' directory if it doesn't exist.
        upload_folder = 'uploads'
        os.makedirs(upload_folder, exist_ok=True)
        
        filepath = os.path.join(upload_folder, file.filename)
        file.save(filepath)
        
        # You can also get the subject if sent from the frontend
        subject = request.form.get('subject', 'general')
        
        # Here you can add logic to process the file, e.g., analyze its content
        # For now, we'll just return a success message
        print(f"File '{file.filename}' uploaded for subject '{subject}' to '{filepath}'")
        return jsonify({'message': f'File {file.filename} uploaded successfully!'}), 200
    
    return jsonify({'message': 'File upload failed due to an unknown error'}), 500



if __name__ == '__main__':
    app.run(debug=True, port=5000)

# Remove the two separate blocks at the bottom and use this single one:
if __name__ == '__main__':
    # Create uploads directory if it doesn't exist
    if not os.path.exists('uploads'):
        os.makedirs('uploads')
    # Run on port 5000 as defined in your route
    app.run(debug=True, port=5000)