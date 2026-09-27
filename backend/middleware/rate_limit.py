"""
SIH26011 - Rate Limiting Middleware
Simple in-memory rate limiter
"""
import time
from collections import defaultdict
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from ..config import settings


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory rate limiter."""
    
    def __init__(self, app):
        super().__init__(app)
        self.requests = defaultdict(list)
        self.max_requests = settings.RATE_LIMIT_REQUESTS
        self.window = settings.RATE_LIMIT_WINDOW
    
    async def dispatch(self, request: Request, call_next):
        # Get client IP
        client_ip = request.client.host if request.client else "unknown"
        
        # Skip rate limiting for health checks
        if request.url.path == "/api/health":
            return await call_next(request)
        
        # Clean old entries
        now = time.time()
        self.requests[client_ip] = [
            req_time for req_time in self.requests[client_ip]
            if now - req_time < self.window
        ]
        
        # Check rate limit
        if len(self.requests[client_ip]) >= self.max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please try again later."
            )
        
        # Record request
        self.requests[client_ip].append(now)
        
        return await call_next(request)