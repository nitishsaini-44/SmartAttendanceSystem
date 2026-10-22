# Flask API for Face Recognition with PostgreSQL Integration
# Embeddings generated locally via InsightFace (Buffalo_L) with remote HF Space fallback
from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import base64
import os
import json
from datetime import datetime
import psycopg

# Load .env from parent directory (server/.env)
try:
    from dotenv import load_dotenv
    import pathlib
    env_path = pathlib.Path(__file__).parent.parent / '.env'
    load_dotenv(dotenv_path=env_path)
except ImportError:
    pass

from models.hf_model import HFSpaceModel

app = Flask(__name__)
CORS(app)

DATABASE_URL = os.environ.get('DATABASE_URL')

def get_db():
    """Create a new PostgreSQL connection with autocommit disabled (manual commit)"""
    return psycopg.connect(DATABASE_URL)

# Initialize Face Recognition model (InsightFace Buffalo_L local / HF fallback)
print("Initializing Face Recognition model...")
model = HFSpaceModel()
print("Face Recognition model ready!")

THRESHOLD = 0.5

def cosine_similarity(a, b):
    """Calculate cosine similarity between two vectors"""
    a = np.array(a)
    b = np.array(b)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

def decode_base64_to_bytes(base64_string):
    """Convert base64 string to raw image bytes"""
    try:
        if not base64_string:
            print("Error: Empty base64 string")
            return None

        # Remove data URL prefix if present
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]

        # Clean up the base64 string (remove whitespace)
        base64_string = base64_string.strip().replace('\n', '').replace('\r', '').replace(' ', '')

        # Add padding if needed
        padding = 4 - len(base64_string) % 4
        if padding != 4:
            base64_string += '=' * padding

        img_bytes = base64.b64decode(base64_string)

        if len(img_bytes) == 0:
            print("Error: Decoded image data is empty")
            return None

        return img_bytes
    except Exception as e:
        print(f"Error decoding image: {str(e)}")
        return None

def get_all_students_with_embeddings(academic_year=None, branch=None, section=None, subsection=None):
    """Get active students with face embeddings registered from PostgreSQL, optionally scoped to an academic batch"""
    result = {}
    try:
        query = 'SELECT "studentId", "name", "faceEmbedding" FROM students WHERE status = %s AND "faceEmbedding" IS NOT NULL'
        params = ['active']

        if academic_year is not None and str(academic_year).strip() != '':
            try:
                query += ' AND "academic_year" = %s'
                params.append(int(academic_year))
            except (ValueError, TypeError):
                pass

        if branch and str(branch).strip():
            query += ' AND UPPER("branch") = UPPER(%s)'
            params.append(str(branch).strip())

        if section and str(section).strip():
            query += ' AND UPPER("section") = UPPER(%s)'
            params.append(str(section).strip())

        if subsection and str(subsection).strip() and str(subsection).strip().upper() != 'ALL':
            query += ' AND UPPER("subsection") = UPPER(%s)'
            params.append(str(subsection).strip())

        query += ';'

        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(query, tuple(params))
                rows = cur.fetchall()
                for sid, sname, embedding in rows:
                    if isinstance(embedding, str):
                        try:
                            embedding = json.loads(embedding)
                        except Exception:
                            continue
                    if embedding and isinstance(embedding, list) and len(embedding) > 0:
                        result[sid] = {
                            "name": sname,
                            "embedding": np.array(embedding, dtype=np.float32)
                        }
    except Exception as e:
        print(f"[ERROR] Failed to fetch student embeddings from PostgreSQL: {e}")
    print(f"[DEBUG] Found {len(result)} students with face embeddings in PostgreSQL (filter: Y={academic_year}, B={branch}, S={section}, Sub={subsection})")
    return result

@app.route('/', methods=['GET'])
@app.route('/health', methods=['GET'])
@app.route('/api/health', methods=['GET'])
def health_check():
    """Lightweight health check - confirms Flask + model + PostgreSQL configuration"""
    model_name = (
        "InsightFace Buffalo_L (Local CPU)"
        if getattr(model, "mode", None) == "local"
        else f"HuggingFace Space ({getattr(model, 'mode', 'unknown')})"
    )
    return jsonify({
        "success": True,
        "message": "Face recognition API is running",
        "model": model_name,
        "database": "PostgreSQL"
    })

@app.route('/api/health/full', methods=['GET'])
def health_check_full():
    """Full health check including PostgreSQL database connection and registered face count"""
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute('SELECT 1;')
        students_with_embeddings = get_all_students_with_embeddings()
        student_count = len(students_with_embeddings)
        return jsonify({
            "success": True,
            "message": "Face recognition API is running",
            "database": "PostgreSQL connected",
            "registeredFaces": student_count
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"API running but PostgreSQL database error: {str(e)}"
        }), 500

@app.route('/api/add-student', methods=['POST'])
def add_student():
    """Extract face embedding and save directly into PostgreSQL students table"""
    try:
        data = request.json or {}
        student_id = data.get('studentId')
        name = data.get('name')
        image_base64 = data.get('image')

        if not student_id or not image_base64:
            return jsonify({
                "success": False,
                "message": "Missing required fields: studentId, image"
            }), 400

        # Decode image to bytes
        img_bytes = decode_base64_to_bytes(image_base64)
        if img_bytes is None:
            return jsonify({
                "success": False,
                "message": "Invalid image data format"
            }), 400

        # Extract face embeddings
        try:
            faces = model.get_faces(img_bytes)
        except Exception as model_err:
            print(f"[ERROR] Face detection engine failed: {model_err}")
            return jsonify({
                "success": False,
                "message": f"Biometric engine error: {str(model_err)}"
            }), 500

        if len(faces) == 0:
            return jsonify({
                "success": False,
                "message": "No face detected in the image"
            }), 400

        if len(faces) > 1:
            return jsonify({
                "success": False,
                "message": "Multiple faces detected. Please provide an image with a single face."
            }), 400

        # Get 512-dim embedding as standard float list
        embedding = faces[0]["embedding"].tolist()
        embedding_json = json.dumps(embedding)

        # Update student record in PostgreSQL
        updated_row = None
        try:
            with get_db() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        'UPDATE students SET "faceEmbedding" = %s::json, "updatedAt" = NOW() WHERE "studentId" = %s RETURNING id, name;',
                        (embedding_json, student_id)
                    )
                    updated_row = cur.fetchone()
                    conn.commit()
        except Exception as db_err:
            print(f"[WARN] PostgreSQL update failed in python (will still return embedding): {db_err}")

        return jsonify({
            "success": True,
            "message": "Face registered successfully in PostgreSQL",
            "embedding": embedding,
            "matchedInDb": bool(updated_row)
        })

    except Exception as e:
        print(f"Error adding student: {str(e)}")
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

@app.route('/api/remove-student', methods=['POST'])
def remove_student():
    """Remove face embedding from a student in PostgreSQL"""
    try:
        data = request.json or {}
        student_id = data.get('studentId')

        if not student_id:
            return jsonify({
                "success": False,
                "message": "Missing studentId"
            }), 400

        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'UPDATE students SET "faceEmbedding" = \'[]\'::json, "updatedAt" = NOW() WHERE "studentId" = %s RETURNING id;',
                    (student_id,)
                )
                row = cur.fetchone()
                conn.commit()

        if not row:
            return jsonify({
                "success": False,
                "message": "Student not found in PostgreSQL"
            }), 404

        return jsonify({
            "success": True,
            "message": f"Face data removed for student {student_id}"
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

@app.route('/api/recognize', methods=['POST'])
def recognize_face():
    """Recognize face against active students stored in PostgreSQL"""
    try:
        data = request.json or {}
        image_base64 = data.get('image')

        if not image_base64:
            return jsonify({
                "success": False,
                "message": "Missing image"
            }), 400

        img_bytes = decode_base64_to_bytes(image_base64)
        if img_bytes is None:
            return jsonify({
                "success": False,
                "message": "Invalid image data format"
            }), 400

        # Extract optional batch scope filters to reduce search space and eliminate cross-department latency
        academic_year = data.get('academicYear') or data.get('academic_year')
        branch = data.get('branch')
        section = data.get('section')
        subsection = data.get('subsection')

        # Load students with embeddings from PostgreSQL (scoped to batch if provided)
        students_db = get_all_students_with_embeddings(
            academic_year=academic_year,
            branch=branch,
            section=section,
            subsection=subsection
        )

        if len(students_db) == 0:
            return jsonify({
                "success": False,
                "message": "No students with registered faces in PostgreSQL"
            }), 400

        # Get face embeddings
        try:
            faces = model.get_faces(img_bytes)
        except Exception as model_err:
            print(f"[ERROR] Face detection engine failed: {model_err}")
            return jsonify({
                "success": False,
                "message": f"Biometric engine error: {str(model_err)}"
            }), 500

        print(f"[DEBUG] Detected {len(faces)} faces")

        if len(faces) == 0:
            return jsonify({
                "success": False,
                "message": "No face detected"
            }), 400

        # Vectorized comparison against all registered embeddings
        student_ids = list(students_db.keys())
        student_names = [students_db[sid]["name"] for sid in student_ids]

        registered_embeddings = np.vstack([students_db[sid]["embedding"] for sid in student_ids])
        registered_norms = np.linalg.norm(registered_embeddings, axis=1, keepdims=True)
        registered_normalized = registered_embeddings / registered_norms

        recognized_students = []

        for face in faces:
            face_emb = face["embedding"].reshape(1, -1)
            face_norm = np.linalg.norm(face_emb)
            face_normalized = face_emb / face_norm

            similarities = np.dot(face_normalized, registered_normalized.T).flatten()

            best_idx = np.argmax(similarities)
            best_score = similarities[best_idx]
            best_match = student_ids[best_idx]

            print(f"[DEBUG] Best match: {best_match} with score {best_score:.4f} (threshold={THRESHOLD})")

            if best_score > THRESHOLD:
                recognized_students.append({
                    "studentId": best_match,
                    "name": student_names[best_idx],
                    "confidence": float(best_score)
                })

        if len(recognized_students) == 0:
            return jsonify({
                "success": False,
                "message": "Face not recognized"
            }), 400

        return jsonify({
            "success": True,
            "message": "Face(s) recognized",
            "students": recognized_students
        })

    except Exception as e:
        print(f"Error in recognize: {str(e)}")
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

@app.route('/api/recognize-multiple', methods=['POST'])
def recognize_multiple_faces():
    """Recognize multiple faces from a classroom image using PostgreSQL embeddings"""
    try:
        data = request.json or {}
        image_base64 = data.get('image')

        if not image_base64:
            return jsonify({
                "success": False,
                "message": "Missing image"
            }), 400

        img_bytes = decode_base64_to_bytes(image_base64)
        if img_bytes is None:
            return jsonify({
                "success": False,
                "message": "Invalid image data format"
            }), 400

        # Extract optional batch scope filters to reduce search space and eliminate cross-department latency
        academic_year = data.get('academicYear') or data.get('academic_year')
        branch = data.get('branch')
        section = data.get('section')
        subsection = data.get('subsection')

        # Load students with embeddings from PostgreSQL (scoped to batch if provided)
        students_db = get_all_students_with_embeddings(
            academic_year=academic_year,
            branch=branch,
            section=section,
            subsection=subsection
        )

        if len(students_db) == 0:
            return jsonify({
                "success": False,
                "message": "No students with registered faces in PostgreSQL"
            }), 400

        # Get all face embeddings
        try:
            faces = model.get_faces(img_bytes)
        except Exception as model_err:
            print(f"[ERROR] Face detection engine failed: {model_err}")
            return jsonify({
                "success": False,
                "message": f"Biometric engine error: {str(model_err)}"
            }), 500

        if len(faces) == 0:
            return jsonify({
                "success": False,
                "message": "No faces detected in the image"
            }), 400

        student_ids = list(students_db.keys())
        student_names = [students_db[sid]["name"] for sid in student_ids]

        registered_embeddings = np.vstack([students_db[sid]["embedding"] for sid in student_ids])
        registered_norms = np.linalg.norm(registered_embeddings, axis=1, keepdims=True)
        registered_normalized = registered_embeddings / registered_norms

        detected_embeddings = np.vstack([face["embedding"] for face in faces])
        detected_norms = np.linalg.norm(detected_embeddings, axis=1, keepdims=True)
        detected_normalized = detected_embeddings / detected_norms

        similarity_matrix = np.dot(detected_normalized, registered_normalized.T)

        best_student_indices = np.argmax(similarity_matrix, axis=1)
        best_scores = np.max(similarity_matrix, axis=1)

        recognized = []
        unrecognized_count = 0

        for i in range(len(faces)):
            best_score = float(best_scores[i])
            best_idx = best_student_indices[i]
            matched_id = student_ids[best_idx]
            matched_name = student_names[best_idx]

            if best_score > THRESHOLD:
                recognized.append({
                    "studentId": matched_id,
                    "name": matched_name,
                    "confidence": round(best_score, 4)
                })
            else:
                unrecognized_count += 1

        # Deduplicate
        seen = {}
        for student in recognized:
            sid = student["studentId"]
            if sid not in seen or student["confidence"] > seen[sid]["confidence"]:
                seen[sid] = student
        unique_recognized = list(seen.values())

        return jsonify({
            "success": True,
            "message": f"Detected {len(faces)} faces, recognized {len(unique_recognized)} students",
            "totalFaces": len(faces),
            "recognizedStudents": unique_recognized,
            "unrecognizedCount": unrecognized_count
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

@app.route('/api/get-embedding', methods=['POST'])
def get_embedding():
    """Get face embedding from an image without saving"""
    try:
        data = request.json or {}
        image_base64 = data.get('image')

        if not image_base64:
            return jsonify({
                "success": False,
                "message": "Missing image"
            }), 400

        img_bytes = decode_base64_to_bytes(image_base64)
        if img_bytes is None:
            return jsonify({
                "success": False,
                "message": "Invalid image data format"
            }), 400

        try:
            faces = model.get_faces(img_bytes)
        except Exception as model_err:
            print(f"[ERROR] Face detection engine failed: {model_err}")
            return jsonify({
                "success": False,
                "message": f"Biometric engine error: {str(model_err)}"
            }), 500

        if len(faces) == 0:
            return jsonify({
                "success": False,
                "message": "No face detected"
            }), 400

        if len(faces) > 1:
            return jsonify({
                "success": False,
                "message": "Multiple faces detected"
            }), 400

        embedding = faces[0]["embedding"].tolist()

        return jsonify({
            "success": True,
            "message": "Face embedding extracted",
            "embedding": embedding
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

@app.route('/api/registered-count', methods=['GET'])
def get_registered_count():
    """Get count of active students with registered face embeddings from PostgreSQL"""
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    'SELECT COUNT(*) FROM students WHERE status = %s AND "faceEmbedding" IS NOT NULL AND "faceEmbedding"::text != \'[]\';',
                    ('active',)
                )
                count = cur.fetchone()[0]
        return jsonify({
            "success": True,
            "count": count
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

if __name__ == '__main__':
    masked_db = DATABASE_URL.split('@')[1] if DATABASE_URL and '@' in DATABASE_URL else 'PostgreSQL'
    print(f"Connecting to PostgreSQL: {masked_db}")
    print("Starting Face Recognition API on port 5001...")
    app.run(host='0.0.0.0', port=5001, debug=False)
