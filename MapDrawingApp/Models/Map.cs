using System.ComponentModel.DataAnnotations;

namespace MapDrawingApp.Models
{
    public class Map
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(200)]
        public string Name { get; set; }

        [MaxLength(500)]
        public string? Description { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime UpdatedAt { get; set; }

        // Thumbnail image (optional)
        public string? ThumbnailUrl { get; set; }

        // ✅ ADDED: Canvas settings
        public int CanvasWidth { get; set; } = 1200;
        public int CanvasHeight { get; set; } = 800;

        // Map settings (JSON) - for future use
        public string? Settings { get; set; }

        public Map()
        {
            CreatedAt = DateTime.Now;
            UpdatedAt = DateTime.Now;
            CanvasWidth = 1200;
            CanvasHeight = 800;
        }
    }
}