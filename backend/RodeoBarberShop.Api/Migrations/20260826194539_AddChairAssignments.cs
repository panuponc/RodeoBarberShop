using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RodeoBarberShop.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddChairAssignments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "chairs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    note = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_chairs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "barber_chair_assignments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    chair_id = table.Column<Guid>(type: "uuid", nullable: false),
                    barber_id = table.Column<Guid>(type: "uuid", nullable: false),
                    start_date = table.Column<DateOnly>(type: "date", nullable: false),
                    end_date = table.Column<DateOnly>(type: "date", nullable: true),
                    is_primary = table.Column<bool>(type: "boolean", nullable: false),
                    note = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_barber_chair_assignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_barber_chair_assignments_barber_profiles_barber_id",
                        column: x => x.barber_id,
                        principalTable: "barber_profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_barber_chair_assignments_chairs_chair_id",
                        column: x => x.chair_id,
                        principalTable: "chairs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_barber_chair_assignments_barber_id_start_date_end_date",
                table: "barber_chair_assignments",
                columns: new[] { "barber_id", "start_date", "end_date" });

            migrationBuilder.CreateIndex(
                name: "IX_barber_chair_assignments_chair_id_start_date_end_date",
                table: "barber_chair_assignments",
                columns: new[] { "chair_id", "start_date", "end_date" });

            migrationBuilder.CreateIndex(
                name: "IX_chairs_name",
                table: "chairs",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_chairs_sort_order",
                table: "chairs",
                column: "sort_order");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "barber_chair_assignments");

            migrationBuilder.DropTable(
                name: "chairs");
        }
    }
}
