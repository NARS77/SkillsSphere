import json
from channels.generic.websocket import AsyncWebsocketConsumer


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # We accept all connections for simplicity in testing
        self.group_name = "notifications"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        message = data.get("message")

        # Broadcast message to group
        await self.channel_layer.group_send(self.group_name, {"type": "notification_message", "message": message})

    async def notification_message(self, event):
        message = event["message"]
        await self.send(text_data=json.dumps({"message": message}))
