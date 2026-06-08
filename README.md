# BlueView

BlueView is a flexible, chronological, and highly organized alternative interface for BlueSky. It is designed to help users catch up on missed content intentionally, without the stress of the infinite scroll.

## Features

* **Time-Bounded Catch-up:** Set explicit "Since" and "Until" dates to retrieve exactly what you missed.
* **Dynamic Grid Layouts:** Switch from a standard list view to a customizable multi-column grid (1-6 columns) for dense visual scanning.
* **Smart Grouping:** Organize your feed by **Day** or by **Author** to easily track specific conversations or events over time.
* **Author Search & Filtering:** A persistent sidebar lists every author in your catch-up window. Search for a specific handle and click to isolate their posts.
* **Collections & Saved Searches:** Save groups of handles (e.g., "Tech Journalists") or specific hashtags (e.g., `#news`) for quick, one-click catch-ups.
* **Media Management:** Toggle rich media (images and link previews) on or off to save bandwidth.

## Technology Stack

* **Backend:** Python 3, FastAPI
* **AT Protocol Integration:** `atproto` (Community Python SDK)
* **Frontend:** Vanilla HTML5, CSS3, JavaScript (Single Page Application structure)
* **Documentation Engine:** Python `markdown` library

## Quick Start (Development)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/bluereview.git
   cd bluereview
   ```

2. **Set up a virtual environment:**
   ```bash
   python -m venv venv
   source venv/Scripts/activate # On Windows
   # source venv/bin/activate   # On macOS/Linux
   ```

3. **Install dependencies:**
   ```bash
   pip install fastapi uvicorn atproto markdown
   ```

4. **Run the server:**
   ```bash
   python main.py
   ```

5. **Access the Application:**
   Open your browser and navigate to `http://127.0.0.1:8000/static/index.html`.

## Usage Note

To log into the application, you must use your BlueSky handle and an **App Password**. Do not use your primary account password. You can generate an App Password in your BlueSky account settings.

## Documentation

Full documentation is served directly from the application via the "User Guide" and "Tech Docs" buttons in the navigation bar. Raw markdown files are available in the `/docs` directory.
