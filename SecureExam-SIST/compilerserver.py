import subprocess
import os
import shutil
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Directory to store temporary code files
CODE_DIR = "/tmp/code_exec"

# Ensure the directory exists
os.makedirs(CODE_DIR, exist_ok=True)

# Cleanup function to remove temporary files
def cleanup():
    if os.path.exists(CODE_DIR):
        shutil.rmtree(CODE_DIR)
        os.makedirs(CODE_DIR, exist_ok=True)

# Function to run Python code
def run_python(code):
    try:
        result = subprocess.run(
            ['python3', '-c', code],
            capture_output=True,
            text=True,
            timeout=5
        )
        return result.stdout or result.stderr
    except subprocess.TimeoutExpired:
        return "Error: Code execution timed out."
    except Exception as e:
        return f"Error: {str(e)}"

# Function to compile and run Java code
def run_java(code):
    try:
        file_path = os.path.join(CODE_DIR, "Main.java")
        with open(file_path, 'w') as f:
            f.write(code)

        # Compile Java code
        compile_result = subprocess.run(
            ['javac', file_path],
            capture_output=True,
            text=True,
            timeout=10
        )
        if compile_result.stderr:
            return compile_result.stderr

        # Run Java program
        run_result = subprocess.run(
            ['java', '-cp', CODE_DIR, 'Main'],
            capture_output=True,
            text=True,
            timeout=10
        )
        return run_result.stdout or run_result.stderr
    except subprocess.TimeoutExpired:
        return "Error: Code execution timed out."
    except Exception as e:
        return f"Error: {str(e)}"

# Function to compile and run C code
def run_c(code):
    try:
        file_path = os.path.join(CODE_DIR, "main.c")
        output_path = os.path.join(CODE_DIR, "main")
        with open(file_path, 'w') as f:
            f.write(code)

        # Compile C code
        compile_result = subprocess.run(
            ['gcc', '-o', output_path, file_path],
            capture_output=True,
            text=True,
            timeout=10
        )
        if compile_result.stderr:
            return compile_result.stderr

        # Execute C program
        run_result = subprocess.run(
            [output_path],
            capture_output=True,
            text=True,
            timeout=10
        )
        return run_result.stdout or run_result.stderr
    except subprocess.TimeoutExpired:
        return "Error: Code execution timed out."
    except Exception as e:
        return f"Error: {str(e)}"

# Function to compile and run C++ code
def run_cpp(code):
    try:
        file_path = os.path.join(CODE_DIR, "main.cpp")
        output_path = os.path.join(CODE_DIR, "main")
        with open(file_path, 'w') as f:
            f.write(code)

        # Compile C++ code
        compile_result = subprocess.run(
            ['g++', '-o', output_path, file_path],
            capture_output=True,
            text=True,
            timeout=10
        )
        if compile_result.stderr:
            return compile_result.stderr

        # Execute C++ program
        run_result = subprocess.run(
            [output_path],
            capture_output=True,
            text=True,
            timeout=10
        )
        return run_result.stdout or run_result.stderr
    except subprocess.TimeoutExpired:
        return "Error: Code execution timed out."
    except Exception as e:
        return f"Error: {str(e)}"

# Function to run JavaScript code
def run_javascript(code):
    try:
        file_path = os.path.join(CODE_DIR, "script.js")
        with open(file_path, 'w') as f:
            f.write(code)

        # Run JavaScript code using Node.js
        result = subprocess.run(
            ['node', file_path],
            capture_output=True,
            text=True,
            timeout=10
        )
        return result.stdout or result.stderr
    except subprocess.TimeoutExpired:
        return "Error: Code execution timed out."
    except Exception as e:
        return f"Error: {str(e)}"

@app.route('/run-code', methods=['POST'])
def run_code():
    data = request.get_json()
    language = data.get('language')
    code = data.get('code')

    if not language or not code:
        return jsonify({'output': 'Error: Language and code are required.'}), 400

    try:
        if language == 'python':
            output = run_python(code)
        elif language == 'java':
            output = run_java(code)
        elif language == 'c':
            output = run_c(code)
        elif language == 'cpp':
            output = run_cpp(code)
        elif language == 'javascript':
            output = run_javascript(code)
        else:
            output = "Error: Unsupported language."
        return jsonify({'output': output})
    except Exception as e:
        return jsonify({'output': f"Error: {str(e)}"}), 500
    finally:
        cleanup()

if __name__ == '__main__':
    app.run(debug=True)
