import asyncio
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend
from redis import asyncio as aioredis
from app.core.config import settings

async def clear_cache():
    if settings.REDIS_URL:
        redis = aioredis.from_url(settings.REDIS_URL, encoding="utf8", decode_responses=True)
        await redis.flushall()
        print("Redis cache cleared")
    else:
        print("Using InMemoryBackend - restart server to clear or wait for expiration")

if __name__ == "__main__":
    asyncio.run(clear_cache())
