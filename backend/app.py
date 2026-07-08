import os
import json
import uuid
import tempfile
import zipfile
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.utils import secure_filename

from plagiarism_engine import PlagiarismEngine
from text_extractor import TextExtractor
from ai_detector import AIDetector

load_dotenv()

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000"])

UPLOAD_FOLDER = tempfile.mkdtemp()
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB

ALLOWED_EXTENSIONS = {'txt', 'pdf', 'docx', 'doc'}

engine = PlagiarismEngine()
extractor = TextExtractor()
ai_detector = AIDetector()


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def build_report(filename, text, web_results, ai_result, cross_matches=None):
    """Build a standardized report object."""
    overall_similarity = 0.0
    sources = []

    if web_results:
        scores = [r.get('similarity', 0) for r in web_results]
        overall_similarity = max(scores) if scores else 0.0
        sources = web_results

    # Normalise: confidence may already be 0-1 or 0-100 depending on model path
    raw_conf = ai_result.get("confidence", 0)
    conf_pct = raw_conf if raw_conf <= 1.0 else raw_conf / 100.0

    report = {
        "id": str(uuid.uuid4()),
        "filename": filename,
        "word_count": len(text.split()),
        "char_count": len(text),
        "overall_similarity": round(overall_similarity * 100, 2),
        "ai_generated": ai_result.get("is_ai", False),
        "ai_confidence": round(conf_pct * 100, 2),
        "ai_reasoning": ai_result.get("reasoning", ""),
        "ai_indicators": ai_result.get("indicators", []),
        "ai_model": ai_result.get("model", "Local Heuristic Analyzer"),
        "sources": sources,
        "cross_file_matches": cross_matches or [],
        "verdict": _get_verdict(overall_similarity, ai_result.get("is_ai", False)),
        "text_preview": text[:500] + ("..." if len(text) > 500 else ""),
    }
    return report


def _get_verdict(similarity, is_ai):
    if is_ai:
        return "AI_GENERATED"
    if similarity >= 0.7:
        return "HIGH_PLAGIARISM"
    if similarity >= 0.4:
        return "MODERATE_PLAGIARISM"
    if similarity >= 0.15:
        return "LOW_SIMILARITY"
    return "ORIGINAL"


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "service": "PLAGFLAG API", "version": "1.0.0"})


@app.route('/api/analyze/text', methods=['POST'])
def analyze_text():
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({"error": "No text provided"}), 400

        text = data['text'].strip()
        if not text:
            return jsonify({"error": "Empty text provided"}), 400

        if len(text) < 20:
            return jsonify({"error": "Text too short for analysis (minimum 20 characters)"}), 400

        web_results = engine.search_web(text)
        ai_result = ai_detector.detect(text)
        report = build_report("text_input", text, web_results, ai_result)

        return jsonify({"success": True, "report": report})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/analyze/file', methods=['POST'])
def analyze_file():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400

        if not allowed_file(file.filename):
            return jsonify({"error": f"Unsupported file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"}), 400

        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        try:
            text = extractor.extract(filepath)
        except Exception as e:
            os.remove(filepath)
            return jsonify({"error": f"Failed to extract text: {str(e)}"}), 422

        if not text or len(text.strip()) < 20:
            os.remove(filepath)
            return jsonify({"error": "Could not extract meaningful text from file"}), 422

        web_results = engine.search_web(text)
        ai_result = ai_detector.detect(text)
        report = build_report(filename, text, web_results, ai_result)

        os.remove(filepath)
        return jsonify({"success": True, "report": report})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/analyze/folder', methods=['POST'])
def analyze_folder():
    try:
        files = request.files.getlist('files')
        if not files or len(files) == 0:
            return jsonify({"error": "No files uploaded"}), 400

        valid_files = [f for f in files if f.filename and allowed_file(f.filename)]
        if not valid_files:
            return jsonify({"error": "No valid files found. Allowed: pdf, docx, txt"}), 400

        saved_files = []
        for file in valid_files:
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], f"{uuid.uuid4()}_{filename}")
            file.save(filepath)
            saved_files.append((filename, filepath))

        # Extract text from all files
        file_texts = {}
        extraction_errors = []
        for filename, filepath in saved_files:
            try:
                text = extractor.extract(filepath)
                if text and len(text.strip()) >= 20:
                    file_texts[filename] = text
                else:
                    extraction_errors.append(f"{filename}: insufficient text")
            except Exception as e:
                extraction_errors.append(f"{filename}: {str(e)}")
            finally:
                if os.path.exists(filepath):
                    os.remove(filepath)

        if not file_texts:
            return jsonify({"error": "Could not extract text from any files", "details": extraction_errors}), 422

        # Cross-file similarity analysis
        cross_similarity = engine.compare_documents(file_texts)

        # Individual reports
        reports = []
        for filename, text in file_texts.items():
            web_results = engine.search_web(text)
            ai_result = ai_detector.detect(text)
            cross_matches = cross_similarity.get(filename, [])
            report = build_report(filename, text, web_results, ai_result, cross_matches)
            reports.append(report)

        # Folder summary
        flagged = [r for r in reports if r['verdict'] in ('HIGH_PLAGIARISM', 'AI_GENERATED')]
        avg_similarity = sum(r['overall_similarity'] for r in reports) / len(reports) if reports else 0

        summary = {
            "total_files": len(reports),
            "flagged_files": len(flagged),
            "avg_similarity": round(avg_similarity, 2),
            "extraction_errors": extraction_errors,
        }

        return jsonify({"success": True, "reports": reports, "summary": summary})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5000))
    debug = os.getenv('FLASK_ENV', 'development') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)
