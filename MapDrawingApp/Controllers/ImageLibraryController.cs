using Microsoft.AspNetCore.Mvc;

namespace MapDrawingApp.Controllers
{
    public class ImageLibraryController : Controller
    {
        private readonly IWebHostEnvironment _environment;

        public ImageLibraryController(IWebHostEnvironment environment)
        {
            _environment = environment;
        }

        [HttpGet]
        public IActionResult GetLibraryImages()
        {
            try
            {
                var libraryPath = Path.Combine(_environment.WebRootPath, "library");

                // Create directory if it doesn't exist
                if (!Directory.Exists(libraryPath))
                {
                    Directory.CreateDirectory(libraryPath);
                    return Json(new { success = true, images = new string[0] });
                }

                // Get all image files
                var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg" };
                var imageFiles = Directory.GetFiles(libraryPath)
                    .Where(file => allowedExtensions.Contains(Path.GetExtension(file).ToLower()))
                    .Select(file => new
                    {
                        name = Path.GetFileName(file),
                        url = "/library/" + Path.GetFileName(file),
                        size = new FileInfo(file).Length
                    })
                    .OrderBy(img => img.name)
                    .ToList();

                return Json(new { success = true, images = imageFiles });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }
    }
}
