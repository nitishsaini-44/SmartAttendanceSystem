# Use official Python slim image
FROM python:3.11-slim

# No extra system packages needed — face processing is handled by the
# remote HuggingFace Space (nitishsaini44/baffaloL_model), not locally.

# Set working directory
WORKDIR /app

# Copy requirements first for layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 5001 8080

# Start with gunicorn — shell form so $PORT env var is expanded at runtime (defaults to 5001)
CMD gunicorn --bind 0.0.0.0:${PORT:-5001} --timeout 120 --workers 1 api_server:app
