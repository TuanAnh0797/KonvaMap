using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MapDrawingApp.Data;
using MapDrawingApp.Models;

namespace MapDrawingApp.Controllers
{
    public class MapViewController : Controller
    {
        private readonly ApplicationDbContext _context;

        public MapViewController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: /MapView
        public IActionResult Index()
        {
            return View();
        }

        // GET: /MapView/View/{id}
        public IActionResult View(int id)
        {
            var map = _context.Maps.Find(id);
            if (map == null)
            {
                return NotFound();
            }

            ViewBag.MapId = id;
            ViewBag.MapName = map.Name;
            ViewBag.MapDescription = map.Description;
            ViewBag.CanvasWidth = map.CanvasWidth;
            ViewBag.CanvasHeight = map.CanvasHeight;

            return View();
        }

        // GET: /MapView/GetAllMaps
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
                        canvasWidth = m.CanvasWidth,
                        canvasHeight = m.CanvasHeight,
                        createdAt = m.CreatedAt,
                        updatedAt = m.UpdatedAt,
                        objectCount = _context.MapObjects.Count(o => o.MapId == m.Id)
                    })
                    .ToList();

                return Json(new { success = true, maps });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        // GET: /MapView/GetMapObjects/{mapId}
        [HttpGet]
        public IActionResult GetMapObjects(int mapId)
        {
            try
            {
                var objects = _context.MapObjects
                    .Where(o => o.MapId == mapId)
                    .OrderBy(o => o.CreatedAt)
                    .ToList();

                return Json(new { success = true, objects });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }
    }
}