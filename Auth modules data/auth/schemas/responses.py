from fastapi.responses import JSONResponse

class APIResponse:
    @staticmethod
    def success(message: str, data: dict = None, status_code: int = 200):
        content = {"success": True, "message": message}
        if data is not None:
            content["data"] = data
        return JSONResponse(status_code=status_code, content=content)
