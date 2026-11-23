from fastapi import FastAPI

app = FastAPI(title="Trust Game API", version="0.1.0")

@app.get("/health")
def health():
    return {"status": "ok", "multiplayer_ready": False}
