from atproto import Client, models
from datetime import datetime, timezone
from typing import List, Optional

class BlueSkyFetcher:
    def __init__(self, client: Client):
        self.client = client

    def fetch_timeline_range(self, since: datetime, until: datetime, limit: int = 50) -> List[models.AppBskyFeedDefs.FeedViewPost]:
        """
        Fetches timeline posts between 'since' and 'until' datetimes.
        Uses indexed_at to handle reposts correctly.
        """
        all_posts = []
        cursor = None
        total_processed = 0
        
        if since.tzinfo is None:
            since = since.replace(tzinfo=timezone.utc)
        if until.tzinfo is None:
            until = until.replace(tzinfo=timezone.utc)

        print(f"DEBUG: Starting Timeline Fetch: since={since}, until={until}")

        while True:
            params = {"limit": limit}
            if cursor:
                params["cursor"] = cursor
            
            response = self.client.get_timeline(**params)
            feed = response.feed
            
            if not feed:
                print("DEBUG: API returned empty feed.")
                break

            for item in feed:
                total_processed += 1
                
                # Use indexed_at for chronology (when it appeared in the feed)
                if hasattr(item, 'reason') and item.reason and hasattr(item.reason, 'indexed_at'):
                    indexed_at_str = item.reason.indexed_at
                else:
                    indexed_at_str = item.post.indexed_at
                
                indexed_at = datetime.fromisoformat(indexed_at_str.replace('Z', '+00:00'))

                if indexed_at > until:
                    continue
                
                if indexed_at < since:
                    print(f"DEBUG: Reached since boundary at index {total_processed}: {indexed_at} < {since}")
                    return all_posts
                
                all_posts.append(item)

            cursor = response.cursor
            if not cursor:
                break
            
            if total_processed > 5000:
                print(f"DEBUG: Safety limit reached (5000 processed).")
                break

        print(f"DEBUG: Final timeline fetch count: {len(all_posts)}")
        return all_posts

    def fetch_feed_range(self, feed_uri: str, since: datetime, until: datetime, limit: int = 50) -> List[models.AppBskyFeedDefs.FeedViewPost]:
        """
        Fetches posts from a specific public feed URI between 'since' and 'until'.
        """
        all_posts = []
        cursor = None
        total_processed = 0
        
        if since.tzinfo is None:
            since = since.replace(tzinfo=timezone.utc)
        if until.tzinfo is None:
            until = until.replace(tzinfo=timezone.utc)

        print(f"DEBUG: Starting Feed Fetch: since={since}, until={until}")

        while True:
            params = {
                "feed": feed_uri,
                "limit": limit
            }
            if cursor:
                params["cursor"] = cursor
            
            response = self.client.app.bsky.feed.get_feed(**params)
            feed = response.feed
            
            if not feed:
                print("DEBUG: API returned empty feed.")
                break

            for item in feed:
                total_processed += 1
                
                if hasattr(item, 'reason') and item.reason and hasattr(item.reason, 'indexed_at'):
                    indexed_at_str = item.reason.indexed_at
                else:
                    indexed_at_str = item.post.indexed_at
                
                indexed_at = datetime.fromisoformat(indexed_at_str.replace('Z', '+00:00'))

                if indexed_at > until:
                    continue
                if indexed_at < since:
                    print(f"DEBUG: Reached since boundary in feed: {indexed_at} < {since}")
                    return all_posts
                
                all_posts.append(item)

            cursor = response.cursor
            if not cursor:
                break
            
            if total_processed > 5000:
                print(f"DEBUG: Safety limit reached in feed (5000 processed).")
                break

        print(f"DEBUG: Final feed fetch count: {len(all_posts)}")
        return all_posts

    def search_posts_range(self, query: str, since: datetime, until: datetime, limit: int = 50) -> List[models.AppBskyFeedDefs.FeedViewPost]:
        """
        Uses the search API to find posts matching a query (or hashtag) within a range.
        """
        all_posts = []
        cursor = None
        total_processed = 0

        if since.tzinfo is None:
            since = since.replace(tzinfo=timezone.utc)
        if until.tzinfo is None:
            until = until.replace(tzinfo=timezone.utc)

        print(f"DEBUG: Starting Tag/Search Fetch: q='{query}', since={since}, until={until}")

        while True:
            # Create the params object for search_posts
            search_params = models.AppBskyFeedSearchPosts.Params(
                q=query,
                since=since.isoformat(),
                until=until.isoformat(),
                limit=limit,
                sort="latest",
                cursor=cursor
            )

            print(f"DEBUG: Fetching search batch with query: {query}")
            response = self.client.app.bsky.feed.search_posts(params=search_params)
            posts = response.posts
            
            if not posts:
                break

            for post in posts:
                total_processed += 1
                # Search results are just 'PostView' objects, we need to wrap them 
                # or handle them consistently in the frontend.
                # To keep it consistent with the existing renderer, we'll wrap it in a pseudo FeedViewPost
                all_posts.append(models.AppBskyFeedDefs.FeedViewPost(post=post))

            cursor = response.cursor
            if not cursor:
                break
            
            if total_processed > 5000:
                break

        print(f"DEBUG: Final search fetch count: {len(all_posts)}")
        return all_posts

    def fetch_authors_range(self, authors: List[str], since: datetime, until: datetime, limit: int = 50) -> List[models.AppBskyFeedDefs.FeedViewPost]:
        """
        Fetches posts from multiple specific authors within a range.
        """
        all_posts = []
        
        for author in authors:
            print(f"DEBUG: Fetching feed for author: {author}")
            try:
                # get_author_feed is efficient for specific users
                cursor = None
                author_posts_count = 0
                
                while True:
                    params = {
                        "actor": author,
                        "limit": limit
                    }
                    if cursor:
                        params["cursor"] = cursor
                        
                    response = self.client.get_author_feed(**params)
                    feed = response.feed
                    
                    if not feed:
                        break

                    found_boundary = False
                    for item in feed:
                        created_at_str = item.post.record.created_at
                        created_at = datetime.fromisoformat(created_at_str.replace('Z', '+00:00'))

                        if created_at > until:
                            continue
                        if created_at < since:
                            found_boundary = True
                            break
                        
                        all_posts.append(item)
                        author_posts_count += 1

                    if found_boundary:
                        break
                        
                    cursor = response.cursor
                    if not cursor or author_posts_count > 500: # Limit per author to avoid hang
                        break
            except Exception as e:
                print(f"DEBUG: Error fetching author {author}: {e}")
                continue

        # Sort all aggregated posts by indexed_at
        all_posts.sort(key=lambda x: x.post.indexed_at, reverse=True)
        return all_posts
