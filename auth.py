from atproto import Client
import os
from typing import Optional

class BlueSkyAuth:
    def __init__(self, base_url: str = "https://bsky.social"):
        self.client = Client(base_url=base_url)
    
    def login(self, handle: str, app_password: str) -> bool:
        """
        Attempts to login to BlueSky using a handle and app password.
        """
        try:
            self.client.login(handle, app_password)
            return True
        except Exception as e:
            print(f"Login failed: {e}")
            return False

    def get_client(self) -> Client:
        return self.client

# Test block
if __name__ == "__main__":
    # This is for manual testing if needed, but we'll use a separate test script or the app itself
    pass
