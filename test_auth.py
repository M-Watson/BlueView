import asyncio
from auth import BlueSkyAuth
import getpass

async def test_auth():
    handle = input("Enter your BlueSky handle (e.g., alice.bsky.social): ")
    password = getpass.getpass("Enter your BlueSky App Password: ")
    
    auth = BlueSkyAuth()
    if auth.login(handle, password):
        print("Login successful!")
        client = auth.get_client()
        profile = client.get_profile(actor=handle)
        print(f"Logged in as: {profile.display_name} (@{profile.handle})")
    else:
        print("Login failed.")

if __name__ == "__main__":
    asyncio.run(test_auth())
