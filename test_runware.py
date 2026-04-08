import asyncio
import aiohttp
import uuid
import sys
import os

from dotenv import load_dotenv
load_dotenv(".env")
RUNWARE_API_KEY = os.getenv("RUNWARE_API_KEY")

async def test():
    async with aiohttp.ClientSession() as session:
        payload = {
            "taskType": "imageInference", 
            "taskUUID": str(uuid.uuid4()), 
            "positivePrompt": "test",
            "model": "google:4@3", 
            "width": 512, 
            "height": 512,
            "numberResults": 1, 
            "outputFormat": "PNG",
            # Try different fields
            "seedImage": "https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png"
        }
        async with session.post("https://api.runware.ai/v1/images", json=[payload], headers={"Authorization": f"Bearer {RUNWARE_API_KEY}"}) as resp:
            print(f"seedImage status: {resp.status}, response: {await resp.text()}")

        payload.pop("seedImage")
        payload["referenceImage"] = "https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png"
        async with session.post("https://api.runware.ai/v1/images", json=[payload], headers={"Authorization": f"Bearer {RUNWARE_API_KEY}"}) as resp:
            print(f"referenceImage status: {resp.status}, response: {await resp.text()}")

        payload.pop("referenceImage")
        payload["imagePrompt"] = "https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png"
        async with session.post("https://api.runware.ai/v1/images", json=[payload], headers={"Authorization": f"Bearer {RUNWARE_API_KEY}"}) as resp:
            print(f"imagePrompt status: {resp.status}, response: {await resp.text()}")

        payload.pop("imagePrompt")
        payload["controlNet"] = [{"model": "canny", "guideImage": "https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png"}]
        async with session.post("https://api.runware.ai/v1/images", json=[payload], headers={"Authorization": f"Bearer {RUNWARE_API_KEY}"}) as resp:
            print(f"controlNet status: {resp.status}, response: {await resp.text()}")

asyncio.run(test())
