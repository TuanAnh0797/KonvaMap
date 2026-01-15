
using System.ComponentModel.DataAnnotations;

namespace MapDrawingApp.Models
{
    public class MapObject
    {
        [Key]
        public int Id { get; set; }
        public int MapId { get; set; }

        public string Type { get; set; } = string.Empty;

        public string Data { get; set; } = string.Empty;

        public string? Name { get; set; }

        public string? Description { get; set; }

        public string? ImageUrl { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        public bool IsDeleted { get; set; } = false;

        // Optional: Object metadata
        public string? ObjectName { get; set; }
        public string? ObjectDescription { get; set; }

        public MapObject()
        {
            CreatedAt = DateTime.Now;
            UpdatedAt = DateTime.Now;
        }
    }
}