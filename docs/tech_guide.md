# BlueView: Technical Documentation

## Overview
BlueView is a FastAPI-powered web application that utilizes the AT Protocol (via the `atproto` Python SDK) to provide a structured, time-bounded interface for BlueSky feeds.

## Tech Stack
- **Backend:** Python 3.x, FastAPI, Uvicorn
- **BlueSky Integration:** `atproto` (Community Python SDK)
- **Frontend:** Vanilla HTML5, CSS3 (Grid/Flexbox), JavaScript (ES6+)
- **Storage:** Local `config.json` for user collections and searches.

## Architecture

### 1. Data Retrieval (`fetcher.py`)
The `BlueSkyFetcher` class handles communication with the AT Protocol.
- **Timeline Fetching:** Uses `client.get_timeline` with cursor-based pagination. It compares the `indexed_at` timestamp of posts/reposts against the user's `since` boundary to stop fetching.
- **Author Aggregation:** Iterates through a list of handles and fetches their individual feeds, merging and sorting the result.
- **Tag Search:** Uses the `app.bsky.feed.search_posts` endpoint with explicit `since` and `until` parameters.

### 2. API Layer (`main.py`)
- **Authentication:** Standard handle/app-password login. Does not store long-lived sessions in this prototype (client sends credentials per fetch).
- **Config Management:** Simple GET/POST routes to read/write `config.json`.
- **Static Serving:** Serves the frontend from the `/static` directory.

### 3. Frontend (`app.js`)
- **State Management:** Local variables manage the current post set (`allPosts`) and configuration.
- **Rendering:** A functional rendering engine that partitions data based on grouping selections (Day/Author) and applies dynamic CSS grid classes.

## Development Setup

1.  **Clone & Venv:**
    ```bash
    python -m venv venv
    ./venv/Scripts/activate
    pip install fastapi uvicorn atproto
    ```
2.  **Run:**
    ```bash
    python main.py
    ```

## Contributing
This project is open-source. Feel free to submit PRs for:
- OAuth implementation for safer auth.
- Improved media handling (videos/GIFs).
- Multi-user support with database persistence.
