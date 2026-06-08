from fastapi import FastAPI, HTTPException, Depends
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from auth import BlueSkyAuth
from fetcher import BlueSkyFetcher
from typing import Optional, List
from datetime import datetime, timezone

app = FastAPI()

# Simple in-memory storage for the prototype session
# In a production app, use encrypted cookies or a session store
sessions = {}

# Serve static files
app.mount("/static", StaticFiles(directory="static"), name="static")

class LoginRequest(BaseModel):
    handle: str
    password: str

import json
import markdown
import os

# ... existing code ...

@app.get("/api/docs/{doc_type}")
async def get_docs(doc_type: str):
    if doc_type not in ["user", "tech"]:
        raise HTTPException(status_code=404, detail="Doc not found")
        
    filename = "user_guide.md" if doc_type == "user" else "tech_guide.md"
    filepath = os.path.join("docs", filename)
    
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            md_content = f.read()
            html_content = markdown.markdown(md_content)
            return {"html": html_content}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Documentation file not found")

class CatchupRequest(BaseModel):
    handle: str
    password: str
    since: datetime
    until: Optional[datetime] = None
    feed_uri: Optional[str] = None
    tag: Optional[str] = None
    collection_authors: Optional[List[str]] = None

@app.get("/api/config")
async def get_config():
    try:
        with open("config.json", "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return {"collections": [], "searches": []}

class ConfigSaveRequest(BaseModel):
    collections: List[dict]
    searches: List[dict]

@app.post("/api/config")
async def save_config(config: ConfigSaveRequest):
    with open("config.json", "w") as f:
        json.dump(config.dict(), f, indent=4)
    return {"status": "success"}

@app.get("/")
async def read_index():
    return {"message": "BlueView API is running. Go to /static/index.html for the UI."}

@app.post("/api/login")
async def login(request: LoginRequest):
    auth = BlueSkyAuth()
    if auth.login(request.handle, request.password):
        # We just return success for now; the client will send creds with fetch requests
        # In a real app, we'd return a session token.
        return {"status": "success", "message": f"Logged in as {request.handle}"}
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")

@app.post("/api/fetch-catchup")
async def fetch_catchup(request: CatchupRequest):
    print(f"DEBUG: Received CatchupRequest for {request.handle}: since={request.since}, until={request.until}, tag={request.tag}")
    auth = BlueSkyAuth()
    if not auth.login(request.handle, request.password):
        raise HTTPException(status_code=401, detail="Authentication failed")
    
    fetcher = BlueSkyFetcher(auth.get_client())
    
    until = request.until or datetime.now(timezone.utc)
    
    try:
        if request.collection_authors:
            posts = fetcher.fetch_authors_range(request.collection_authors, request.since, until)
        elif request.tag:
            # Ensure tag has the # prefix if the user just entered text
            query = request.tag if request.tag.startswith('#') else f"#{request.tag}"
            posts = fetcher.search_posts_range(query, request.since, until)
        elif request.feed_uri:
            posts = fetcher.fetch_feed_range(request.feed_uri, request.since, until)
        else:
            posts = fetcher.fetch_timeline_range(request.since, until)
        
        # Simplify the response data to avoid circular references or excessive size
        simplified_posts = []
        for p in posts:
            post_data = {
                "uri": p.post.uri,
                "author": {
                    "handle": p.post.author.handle,
                    "displayName": p.post.author.display_name,
                    "avatar": p.post.author.avatar
                },
                "text": p.post.record.text,
                "createdAt": p.post.record.created_at,
                "replyCount": p.post.reply_count,
                "repostCount": p.post.repost_count,
                "likeCount": p.post.like_count,
                "isReply": hasattr(p.post.record, 'reply') and p.post.record.reply is not None,
                "embed": None
            }
            
            # Extract images if present
            if hasattr(p.post, 'embed') and p.post.embed:
                embed = p.post.embed
                # Check for app.bsky.embed.images
                if hasattr(embed, 'images'):
                    images = []
                    for img in embed.images:
                        images.append({
                            "thumb": img.thumb,
                            "fullsize": img.fullsize,
                            "alt": img.alt
                        })
                    post_data["embed"] = {"type": "images", "images": images}
                # Check for external (links with thumbnails)
                elif hasattr(embed, 'external'):
                    post_data["embed"] = {
                        "type": "external",
                        "external": {
                            "uri": embed.external.uri,
                            "title": embed.external.title,
                            "description": embed.external.description,
                            "thumb": embed.external.thumb
                        }
                    }
            
            simplified_posts.append(post_data)

        return {
            "status": "success",
            "count": len(simplified_posts),
            "posts": simplified_posts
        }
    except Exception as e:
        print(f"Fetch error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
