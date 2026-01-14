using Microsoft.AspNetCore.SignalR;

namespace MapDrawingApp.Hubs
{
    public class MapHub : Hub
    {
        public async Task ObjectCreated(int objectId, string type, string data)
        {
            await Clients.Others.SendAsync("ObjectCreated", objectId, type, data);
        }

        public async Task ObjectUpdated(int objectId, string type, string data)
        {
            await Clients.Others.SendAsync("ObjectUpdated", objectId, type, data);
        }

        public async Task ObjectDeleted(int objectId)
        {
            await Clients.Others.SendAsync("ObjectDeleted", objectId);
        }

        public async Task ObjectMoved(int objectId, double x, double y)
        {
            await Clients.Others.SendAsync("ObjectMoved", objectId, x, y);
        }

        public async Task ObjectTransformed(int objectId, string data)
        {
            await Clients.Others.SendAsync("ObjectTransformed", objectId, data);
        }
    }
}