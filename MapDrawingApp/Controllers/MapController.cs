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

        public MapController(ApplicationDbContext context, IWebHostEnvironment environment)
        {
            _context = context;
            _environment = environment;
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

                return Json(new { success = true, maps });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"GetAllMaps Error: {ex.Message}");
                Console.WriteLine($"Stack: {ex.StackTrace}");
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public IActionResult CreateMap([FromBody] MapCreateRequest request)
        {
            try
            {
                Console.WriteLine($"CreateMap called: {request?.Name}");

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

                Console.WriteLine($"Map created successfully: ID={map.Id}");

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
                Console.WriteLine($"CreateMap Error: {ex.Message}");
                Console.WriteLine($"Inner Exception: {ex.InnerException?.Message}");
                Console.WriteLine($"Stack: {ex.StackTrace}");

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
                Console.WriteLine($"UpdateMap called: ID={request?.Id}");

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

                Console.WriteLine($"Map updated successfully: ID={request.Id}");

                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"UpdateMap Error: {ex.Message}");
                Console.WriteLine($"Inner Exception: {ex.InnerException?.Message}");

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
                Console.WriteLine($"DeleteMap called: ID={id}");

                var map = _context.Maps.Find(id);
                if (map == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy map" });
                }

                // Delete all objects in this map
                var objects = _context.MapObjects.Where(o => o.MapId == id).ToList();
                Console.WriteLine($"Deleting {objects.Count} objects");

                _context.MapObjects.RemoveRange(objects);
                _context.Maps.Remove(map);
                _context.SaveChanges();

                Console.WriteLine($"Map deleted successfully: ID={id}");

                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"DeleteMap Error: {ex.Message}");
                Console.WriteLine($"Inner Exception: {ex.InnerException?.Message}");

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
                Console.WriteLine($"GetMapObjects called: MapId={mapId}");

                var objects = _context.MapObjects
                    .Where(o => o.MapId == mapId)
                    .OrderBy(o => o.CreatedAt)
                    .ToList();

                Console.WriteLine($"Found {objects.Count} objects for map {mapId}");

                return Json(objects);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"GetMapObjects Error: {ex.Message}");
                return Json(new { success = false, message = ex.Message });
            }
        }

        // ============= OBJECT MANAGEMENT =============

        [HttpPost]
        public IActionResult CreateObject([FromBody] CreateObjectRequest request)
        {
            try
            {
                Console.WriteLine($"CreateObject: MapId={request?.MapId}, Type={request?.Type}");

                if (request == null || request.MapId <= 0)
                {
                    return Json(new { success = false, message = "MapId không hợp lệ" });
                }

                var obj = new MapObject
                {
                    MapId = request.MapId,
                    Type = request.Type,
                    Data = request.Data,
                    ImageUrl = request.ImageUrl,
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now
                };

                _context.MapObjects.Add(obj);
                _context.SaveChanges();

                Console.WriteLine($"Object created: ID={obj.Id}");

                return Json(new { success = true, id = obj.Id });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"CreateObject Error: {ex.Message}");
                Console.WriteLine($"Inner Exception: {ex.InnerException?.Message}");

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
                var obj = _context.MapObjects.Find(request.Id);
                if (obj == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy object" });
                }

                obj.Type = request.Type;
                obj.Data = request.Data;
                obj.ImageUrl = request.ImageUrl;
                obj.UpdatedAt = DateTime.Now;

                _context.SaveChanges();

                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"UpdateObject Error: {ex.Message}");
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public IActionResult DeleteObject(int id)
        {
            try
            {
                var obj = _context.MapObjects.Find(id);
                if (obj == null)
                {
                    return Json(new { success = false, message = "Không tìm thấy object" });
                }

                _context.MapObjects.Remove(obj);
                _context.SaveChanges();

                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"DeleteObject Error: {ex.Message}");
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpGet]
        public IActionResult GetAllObjects()
        {
            try
            {
                var objects = _context.MapObjects.OrderBy(o => o.CreatedAt).ToList();
                return Json(objects);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"GetAllObjects Error: {ex.Message}");
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
                return Json(new { success = true, imageUrl = imageUrl });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"UploadImage Error: {ex.Message}");
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
    }
}