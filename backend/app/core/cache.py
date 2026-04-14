from fastapi import Request, Response
from fastapi_cache import FastAPICache

def school_key_builder(
    func,
    namespace: str = "",
    request: Request = None,
    response: Response = None,
    args: tuple = None,
    kwargs: dict = None,
):
    # If no namespace provided, try to get from school_id kwarg
    ns = namespace or kwargs.get("school_id") or "global"
    
    prefix = FastAPICache.get_prefix()
    # Build a stable key string
    cache_key = f"{prefix}:{ns}:{func.__module__}:{func.__name__}:{args}:{kwargs}"
    return cache_key
