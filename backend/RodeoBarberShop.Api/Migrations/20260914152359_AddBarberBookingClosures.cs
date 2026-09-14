using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RodeoBarberShop.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddBarberBookingClosures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "barber_booking_closures",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BarberId = table.Column<Guid>(type: "uuid", nullable: false),
                    StartAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    EndAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    ClosedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ReopenedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReopenedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_barber_booking_closures", x => x.Id);
                    table.ForeignKey(
                        name: "FK_barber_booking_closures_barber_profiles_BarberId",
                        column: x => x.BarberId,
                        principalTable: "barber_profiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_barber_booking_closures_users_ClosedByUserId",
                        column: x => x.ClosedByUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_barber_booking_closures_users_ReopenedByUserId",
                        column: x => x.ReopenedByUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_barber_booking_closures_BarberId_StartAt_EndAt",
                table: "barber_booking_closures",
                columns: new[] { "BarberId", "StartAt", "EndAt" });

            migrationBuilder.CreateIndex(
                name: "IX_barber_booking_closures_ClosedByUserId",
                table: "barber_booking_closures",
                column: "ClosedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_barber_booking_closures_ReopenedByUserId",
                table: "barber_booking_closures",
                column: "ReopenedByUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "barber_booking_closures");
        }
    }
}
