using MapDrawingApp.Models;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Reflection.Emit;

namespace MapDrawingApp.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<MapObject> MapObjects { get; set; } = null!;
        public DbSet<Map> Maps { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<MapObject>()
                .HasQueryFilter(m => !m.IsDeleted);
            modelBuilder.Entity<MapObject>()
                 .HasIndex(m => m.MapId);
        }
    }
}
