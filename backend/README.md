
# Lumina Media Backend

A lightweight Django service to proxy media requests, solving CORS and Range Header issues for the Lumina Editor.

## Prerequisites
- Python 3.8+
- pip (Python Package Manager)

## Installation

1. Create a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   # Windows
   .\venv\Scripts\activate
   # Mac/Linux
   source venv/bin/activate
   ```

2. Install dependencies:
   ```bash
   pip install django requests django-cors-headers
   ```

## Running the Server

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Run the development server:
   ```bash
   python manage.py runserver
   ```

The server will start at `http://127.0.0.1:8000`.

## API Usage

### Proxy Endpoint
`GET /api/media/proxy?url=<ENCODED_URL>`

Example:
`http://127.0.0.1:8000/api/media/proxy?url=https%3A%2F%2Fcdn.pixabay.com%2F...`

## Security Note for Production
- In `backend/lumina_backend/settings.py`, update `CORS_ALLOW_ALL_ORIGINS` to `False` and configure `CORS_ALLOWED_ORIGINS` to match your frontend domain.
- Update `ALLOWED_HOSTS` in `backend/proxy/views.py` to strictly control which domains can be proxied.
