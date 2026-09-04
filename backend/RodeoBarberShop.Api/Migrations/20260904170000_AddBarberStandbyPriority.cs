using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RodeoBarberShop.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddBarberStandbyPriority : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "standby_priority",
                table: "barber_profiles",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "standby_priority",
                table: "barber_profiles");
        }
    }
}
