using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MapDrawingApp.Data;
using MapDrawingApp.Models;
using System;
using System.Linq;

namespace MapDrawingApp.Controllers
{
    public class MapController : Controller
    {
        private readonly ApplicationDbContext _context;
        private readonly IWebHostEnvironment _environment;
        private readonly ILogger<MapController> _logger;

        public MapController(
            ApplicationDbContext context,
            IWebHostEnvironment environment,
            ILogger<MapController> logger)
        {
            _context = context;
            _environment = environment;
            _logger = logger;
        }

        public IActionResult Index()
        {
            return View();
        }

        // ============= MAP MANAGEMENT =============

        [HttpGet]
        public IActionResult GetAllMaps()
        {
            try
            {
                _logger.LogInformation("GetAllMaps called");

                var maps = _context.Maps
                    .OrderByDescending(m => m.UpdatedAt)
                    .Select(m => new
                    {
                        id = m.Id,
                        name = m.Name,
                        description = m.Description,
                        thumbnailUrl = m.ThumbnailUrl,
                        createdAt = m.CreatedAt,
                        updatedAt = m.UpdatedAt,
                        objectCount = _context.MapObjects.Count(o => o.MapId == m.Id)
                    })
                    .ToList();

                _logger.LogInformation($"Found {maps.Count} maps");

                return Json(new { success = true, maps });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetAllMaps Error");
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public IActionResult CreateMap([FromBody] MapCreateRequest request)
        {
            try
            {
                _logger.LogInformation($"CreateMap called: {request?.Name}");

                if (request == null || string.IsNullOrWhiteSpace(request.Name))
                {
                    return Json(new { success = false, message = "Tên map không được để trống" });
                }

                var map = new Map
                {
                    Name = request.Name.Trim(),
                    Description = request.Description?.Trim(),
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now
                };

                _context.Maps.Add(map);
                _context.SaveChanges();

                _logger.LogInformation($"Map created successfully: ID={map.Id}");

                return Json(new
                {
                    success = true,
                    id = map.Id,
                    map = new
                    {
                        id = map.Id,
                        name = map.Name,
                        description = map.Description,
                        createdAt = map.CreatedAt,
                        updatedAt = map.UpdatedAt
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "CreateMap Error");
                return Json(new
                {
                    success = false,
                    message = $"Lỗi: {ex.InnerException?.Message ?? ex.Message}"
                });
            }
        }

        [HttpPost]
        public IActionResult UpdateMap([FromBody] MapUpdateRequest request)
        {
            try
            {
                _logger.LogInformation($"UpdateMap called: ID={request?.Id}");

                if (request == null || request.Id <= 0)
                {
                    return Json(new { success = false, message = "ID không hợp lệ" });
                }

                var existingMap = _context.Maps.Find(request.Id);
                if (existingMap == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy map" });
                }

                if (!string.IsNullOrWhiteSpace(request.Name))
                {
                    existingMap.Name = request.Name.Trim();
                }

                existingMap.Description = request.Description?.Trim();
                existingMap.UpdatedAt = DateTime.Now;

                _context.SaveChanges();

                _logger.LogInformation($"Map updated successfully: ID={request.Id}");

                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "UpdateMap Error");
                return Json(new
                {
                    success = false,
                    message = $"Lỗi: {ex.InnerException?.Message ?? ex.Message}"
                });
            }
        }

        [HttpPost]
        public IActionResult DeleteMap(int id)
        {
            try
            {
                _logger.LogInformation($"DeleteMap called: ID={id}");

                var map = _context.Maps.Find(id);
                if (map == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy map" });
                }

                // Delete all objects in this map
                var objects = _context.MapObjects.Where(o => o.MapId == id).ToList();
                _logger.LogInformation($"Deleting {objects.Count} objects");

                _context.MapObjects.RemoveRange(objects);
                _context.Maps.Remove(map);
                _context.SaveChanges();

                _logger.LogInformation($"Map deleted successfully: ID={id}");

                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "DeleteMap Error");
                return Json(new
                {
                    success = false,
                    message = $"Lỗi: {ex.InnerException?.Message ?? ex.Message}"
                });
            }
        }

        [HttpGet]
        public IActionResult GetMapObjects(int mapId)
        {
            try
            {
                _logger.LogInformation($"GetMapObjects called: MapId={mapId}");

                var objects = _context.MapObjects
                    .Where(o => o.MapId == mapId)
                    .OrderBy(o => o.CreatedAt)
                    .ToList();

                _logger.LogInformation($"Found {objects.Count} objects for map {mapId}");

                // CRITICAL: Return array directly, not wrapped
                return Json(objects);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetMapObjects Error");
                return Json(new { success = false, message = ex.Message });
            }
        }

        // ============= OBJECT MANAGEMENT - FIXED =============

        [HttpPost]
        public IActionResult CreateObject([FromBody] CreateObjectRequest request)
        {
            try
            {
                _logger.LogInformation($"CreateObject called");
                _logger.LogInformation($"  MapId: {request?.MapId}");
                _logger.LogInformation($"  Type: {request?.Type}");
                _logger.LogInformation($"  Data length: {request?.Data?.Length ?? 0}");

                // VALIDATION
                if (request == null)
                {
                    _logger.LogError("Request is null");
                    return Json(new { success = false, message = "Request is null" });
                }

                if (request.MapId <= 0)
                {
                    _logger.LogError($"Invalid MapId: {request.MapId}");
                    return Json(new { success = false, message = $"MapId không hợp lệ: {request.MapId}" });
                }

                if (string.IsNullOrEmpty(request.Type))
                {
                    _logger.LogError("Type is empty");
                    return Json(new { success = false, message = "Type không được để trống" });
                }

                if (string.IsNullOrEmpty(request.Data))
                {
                    _logger.LogError("Data is empty");
                    return Json(new { success = false, message = "Data không được để trống" });
                }

                // Check if map exists
                var mapExists = _context.Maps.Any(m => m.Id == request.MapId);
                if (!mapExists)
                {
                    _logger.LogError($"Map {request.MapId} does not exist");
                    return Json(new { success = false, message = $"Map ID {request.MapId} không tồn tại" });
                }

                // CREATE OBJECT
                var obj = new MapObject
                {
                    MapId = request.MapId,
                    Type = request.Type,
                    Data = request.Data,
                    ImageUrl = request.ImageUrl,
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now,
                    IsDeleted = false
                };

                _logger.LogInformation("Adding object to context...");
                _context.MapObjects.Add(obj);

                _logger.LogInformation("Saving changes...");
                var changes = _context.SaveChanges();

                _logger.LogInformation($"✓ Object created: ID={obj.Id}, Changes={changes}");

                return Json(new { success = true, id = obj.Id });
            }
            catch (DbUpdateException dbEx)
            {
                _logger.LogError(dbEx, "Database update error in CreateObject");
                _logger.LogError($"Inner exception: {dbEx.InnerException?.Message}");
                return Json(new
                {
                    success = false,
                    message = $"Lỗi database: {dbEx.InnerException?.Message ?? dbEx.Message}"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "CreateObject Error");
                _logger.LogError($"Stack trace: {ex.StackTrace}");
                return Json(new
                {
                    success = false,
                    message = $"Lỗi: {ex.InnerException?.Message ?? ex.Message}"
                });
            }
        }

        [HttpPost]
        public IActionResult UpdateObject([FromBody] UpdateObjectRequest request)
        {
            try
            {
                _logger.LogInformation($"UpdateObject called: ID={request?.Id}");

                if (request == null || request.Id <= 0)
                {
                    return Json(new { success = false, message = "Request không hợp lệ" });
                }

                var obj = _context.MapObjects.Find(request.Id);
                if (obj == null)
                {
                    _logger.LogWarning($"Object {request.Id} not found");
                    return Json(new { success = false, message = "Không tìm thấy object" });
                }

                obj.Type = request.Type;
                obj.Data = request.Data;
                obj.ImageUrl = request.ImageUrl;
                obj.UpdatedAt = DateTime.Now;

                _context.SaveChanges();

                _logger.LogInformation($"✓ Object updated: ID={request.Id}");

                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "UpdateObject Error");
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public IActionResult DeleteObject(int id)
        {
            try
            {
                _logger.LogInformation($"DeleteObject called: ID={id}");

                var obj = _context.MapObjects.Find(id);
                if (obj == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy object" });
                }

                _context.MapObjects.Remove(obj);
                _context.SaveChanges();

                _logger.LogInformation($"✓ Object deleted: ID={id}");

                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "DeleteObject Error");
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpGet]
        public IActionResult GetAllObjects()
        {
            try
            {
                var objects = _context.MapObjects.OrderBy(o => o.CreatedAt).ToList();
                _logger.LogInformation($"GetAllObjects: Found {objects.Count} objects");
                return Json(objects);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetAllObjects Error");
                return Json(new { success = false, message = ex.Message });
            }
        }

        // ============= IMAGE UPLOAD =============

        [HttpPost]
        public IActionResult UploadImage(IFormFile file)
        {
            try
            {
                if (file == null || file.Length == 0)
                {
                    return Json(new { success = false, message = "No file uploaded" });
                }

                var uploadsFolder = Path.Combine(_environment.WebRootPath, "images");
                if (!Directory.Exists(uploadsFolder))
                {
                    Directory.CreateDirectory(uploadsFolder);
                }

                var uniqueFileName = Guid.NewGuid().ToString() + Path.GetExtension(file.FileName);
                var filePath = Path.Combine(uploadsFolder, uniqueFileName);

                using (var fileStream = new FileStream(filePath, FileMode.Create))
                {
                    file.CopyTo(fileStream);
                }

                var imageUrl = "/images/" + uniqueFileName;
                _logger.LogInformation($"Image uploaded: {imageUrl}");

                return Json(new { success = true, imageUrl = imageUrl });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "UploadImage Error");
                return Json(new { success = false, message = ex.Message });
            }
        }

        // ============= REQUEST CLASSES =============

        public class MapCreateRequest
        {
            public string Name { get; set; }
            public string Description { get; set; }
        }

        public class MapUpdateRequest
        {
            public int Id { get; set; }
            public string Name { get; set; }
            public string Description { get; set; }
        }

        public class CreateObjectRequest
        {
            public int MapId { get; set; }
            public string Type { get; set; }
            public string Data { get; set; }
            public string ImageUrl { get; set; }
        }

        public class UpdateObjectRequest
        {
            public int Id { get; set; }
            public string Type { get; set; }
            public string Data { get; set; }
            public string ImageUrl { get; set; }
        }
        // ADD THESE METHODS TO MapController.cs

        // ============= CANVAS SIZE MANAGEMENT =============

        [HttpPost]
        public IActionResult UpdateCanvasSize([FromBody] UpdateCanvasSizeRequest request)
        {
            try
            {
                _logger.LogInformation($"UpdateCanvasSize called: MapId={request?.MapId}, Size={request?.Width}x{request?.Height}");

                if (request == null || request.MapId <= 0)
                {
                    return Json(new { success = false, message = "Request không hợp lệ" });
                }

                if (request.Width < 400 || request.Height < 300)
                {
                    return Json(new { success = false, message = "Kích thước tối thiểu: 400x300" });
                }

                if (request.Width > 10000 || request.Height > 10000)
                {
                    return Json(new { success = false, message = "Kích thước tối đa: 10000x10000" });
                }

                var map = _context.Maps.Find(request.MapId);
                if (map == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy map" });
                }

                map.CanvasWidth = request.Width;
                map.CanvasHeight = request.Height;
                map.UpdatedAt = DateTime.Now;

                _context.SaveChanges();

                _logger.LogInformation($"✓ Canvas size updated: {request.Width}x{request.Height}");

                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "UpdateCanvasSize Error");
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpGet]
        public IActionResult GetCanvasSize(int mapId)
        {
            try
            {
                _logger.LogInformation($"GetCanvasSize called: MapId={mapId}");

                var map = _context.Maps.Find(mapId);
                if (map == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy map" });
                }

                return Json(new
                {
                    success = true,
                    width = map.CanvasWidth,
                    height = map.CanvasHeight
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetCanvasSize Error");
                return Json(new { success = false, message = ex.Message });
            }
        }

        // ============= REQUEST CLASS - ADD TO EXISTING CLASSES =============

        public class UpdateCanvasSizeRequest
        {
            public int MapId { get; set; }
            public int Width { get; set; }
            public int Height { get; set; }
        }
    }
}