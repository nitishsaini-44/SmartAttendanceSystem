"""
Face Recognition Model Client
Supports:
1. Fast, offline Local InsightFace with buffalo_l (uses CPUExecutionProvider)
2. Remote HuggingFace Gradio Space fallback (nitishsaini44/baffaloL_model)
"""

import json
import os
import tempfile
import warnings
import numpy as np

# Suppress harmless future / deprecation warnings
warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning)

HF_SPACE_ID = "nitishsaini44/baffaloL_model"
HF_SPACE_URL = "https://nitishsaini44-baffalol-model.hf.space"


class HFSpaceModel:
    """
    Robust Face Recognition Model provider.
    Tries Local InsightFace (Buffalo_L) first for zero network latency and no rate limits,
    with automatic fallback to remote HuggingFace Space.
    """

    def __init__(self):
        self.mode = None
        self.local_app = None
        self.client = None

        # 1. Try initializing Local InsightFace
        try:
            import cv2
            import insightface
            from insightface.app import FaceAnalysis

            print("Attempting to load local InsightFace model (buffalo_l)...")
            app = FaceAnalysis(
                name="buffalo_l",
                allowed_modules=['detection', 'recognition'],
                providers=['CPUExecutionProvider']
            )
            app.prepare(ctx_id=-1, det_size=(640, 640))
            self.local_app = app
            self.mode = "local"
            print("Local InsightFace (buffalo_l) initialized successfully!")
            return
        except Exception as e:
            print(f"Notice: Local InsightFace init failed ({e}). Falling back to HF Space...")

        # 2. Fallback to HuggingFace Space
        self._init_hf_space()

    def _init_hf_space(self):
        try:
            from gradio_client import Client
            hf_token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN")
            if hf_token:
                print("HF_TOKEN found — logging in with authentication.")
                try:
                    from huggingface_hub import login
                    login(token=hf_token, add_to_git_credential=False)
                except Exception as e:
                    print(f"WARNING: huggingface_hub login failed: {e}")
            else:
                print("WARNING: HF_TOKEN not set. ZeroGPU rate limits may apply on HF Space.")

            client = None
            if hf_token:
                for token_key in ['token', 'hf_token']:
                    try:
                        client = Client(HF_SPACE_URL, **{token_key: hf_token})
                        break
                    except TypeError:
                        continue
            if client is None:
                client = Client(HF_SPACE_URL)

            self.client = client
            self.mode = "hf_space"
            print("HuggingFace Space client initialized successfully!")
        except Exception as e:
            print(f"ERROR: Failed to connect to HuggingFace Space: {e}")
            self.mode = "error"

    _TMP_DIR = "/dev/shm" if os.path.isdir("/dev/shm") else tempfile.gettempdir()

    def get_faces(self, image_bytes: bytes) -> list:
        """
        Extract faces and 512-d embeddings from raw image bytes.

        Returns:
            List of dicts: [{"embedding": np.ndarray(512,), "bbox": [x1, y1, x2, y2]}, ...]
        """
        if self.mode == "local" and self.local_app is not None:
            return self._get_faces_local(image_bytes)

        return self._get_faces_hf(image_bytes)

    def _get_faces_local(self, image_bytes: bytes) -> list:
        import cv2
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Could not decode image bytes into image")

        faces = self.local_app.get(img)
        result = []
        for face in faces:
            if hasattr(face, 'embedding') and face.embedding is not None:
                result.append({
                    "embedding": face.embedding.astype(np.float32),
                    "bbox": face.bbox.tolist() if hasattr(face, 'bbox') and face.bbox is not None else []
                })
        print(f"[LocalInsightFace] Detected {len(result)} face(s)")
        return result

    def _get_faces_hf(self, image_bytes: bytes) -> list:
        from gradio_client import handle_file
        if not self.client:
            self._init_hf_space()
            if not self.client:
                raise RuntimeError("No face recognition engine available (HF Space connection failed)")

        tmp_path = None
        try:
            fd, tmp_path = tempfile.mkstemp(suffix=".jpg", dir=self._TMP_DIR)
            try:
                os.write(fd, image_bytes)
            finally:
                os.close(fd)

            result_string = self.client.predict(
                image=handle_file(tmp_path),
                api_name="/process_image"
            )

            if not result_string:
                print("[HFModel] Empty response from HF Space")
                return []

            result = json.loads(result_string)

            if isinstance(result, dict) and "error" in result:
                raise RuntimeError(f"HF Space returned error: {result['error']}")

            faces = self._parse_response(result)
            print(f"[HFModel] Received {len(faces)} face(s) from HF Space")
            return faces

        except json.JSONDecodeError as e:
            raise RuntimeError(f"HF Space returned invalid JSON: {e}")
        except Exception as e:
            err_msg = str(e)
            print(f"[HFModel] Error calling HF Space: {err_msg}")
            raise RuntimeError(f"Face recognition service error: {err_msg}")
        finally:
            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.unlink(tmp_path)
                except Exception:
                    pass

    def _parse_response(self, result) -> list:
        faces = []
        if not isinstance(result, list):
            return faces

        for item in result:
            if isinstance(item, dict) and "embedding" in item:
                emb = item["embedding"]
                if emb:
                    faces.append({
                        "embedding": np.array(emb, dtype=np.float32),
                        "bbox": item.get("bbox", [])
                    })
        return faces
