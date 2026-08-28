import os
import json
import logging
from dotenv import load_dotenv
from typing import Dict, Any, List
from rocketride import RocketRideClient

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), ".env"), override=True)

logger = logging.getLogger(__name__)

class RocketRideDB:
    def __init__(self):
        self.uri = os.environ.get("ROCKETRIDE_URI")
        self.apikey = os.environ.get("ROCKETRIDE_APIKEY")
        self.pipe_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
            "rocketride",
            "ap_sentinel.pipe"
        )
        if self.uri:
            # Local fallback uses ap_sentinel_local.pipe
            self.pipe_path = self.pipe_path.replace("ap_sentinel.pipe", "ap_sentinel_local.pipe")
    
    async def get_client(self) -> RocketRideClient:
        client = RocketRideClient(uri=self.uri) if self.uri else RocketRideClient()
        try:
            await client.connect(self.apikey)
        except Exception as e:
            raise RuntimeError(f"RocketRide pipeline connection error: {e}")
        return client

    async def execute(self, sql: str) -> Dict[str, Any]:
        client = await self.get_client()
        token = None
        try:
            # We need a token to use the database tool
            # The SDK uses the pipeline token to scope the DB execution
            result = await client.use(filepath=self.pipe_path, source='db_execute')
            token = result.get('token')
            if not token:
                raise RuntimeError("No token returned from pipeline use.")
            
            # Execute raw SQL
            logger.debug(f"Executing SQL via RocketRide: {sql}")
            query_result = await client.database.query(token=token, sql=sql)
            return query_result
        finally:
            if token:
                try:
                    await client.terminate(token=token)
                except Exception:
                    pass
            await client.disconnect()

rr_db = RocketRideDB()
