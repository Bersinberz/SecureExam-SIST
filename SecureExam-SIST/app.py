from flask import Flask, jsonify, request
from pymongo import MongoClient

app = Flask(__name__)

client = MongoClient("mongodb://localhost:27017/")
db = client['Secure']
exams_collection = db['exams']

@app.route('/exam-details', methods=['GET'])
def get_exam_details():
    # Fetch exam details
    exam = exams_collection.find_one()
    if exam:
        return jsonify({
            'name': exam.get('name'),
            'time': int(exam.get('time')),  # Convert to integer for timer
            'file': exam.get('file')
        })
    return jsonify({'error': 'No exam found'}), 404

if __name__ == '__main__':
    app.run(debug=True)
