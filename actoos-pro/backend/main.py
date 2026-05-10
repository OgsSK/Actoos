"""
Railway Entry Point for ACTOOS PRO
Handles PORT environment variable properly
"""
import os
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8001))
    print(f"Starting ACTOOS PRO API on port {port}...")
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=port,
        log_level="info"
    )
