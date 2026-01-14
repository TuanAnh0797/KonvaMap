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

        // Map settings (JSON)
        public string? Settings { get; set; }

        public Map()
        {
            CreatedAt = DateTime.Now;
            UpdatedAt = DateTime.Now;
        }
    }
}

