using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RodeoBarberShop.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPaymentAccounts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "payment_account_id",
                table: "payments",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "payment_accounts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    account_name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    account_type = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    account_number = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    bank_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    is_default = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payment_accounts", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_payments_payment_account_id",
                table: "payments",
                column: "payment_account_id");

            migrationBuilder.CreateIndex(
                name: "IX_payment_accounts_is_active_is_default",
                table: "payment_accounts",
                columns: new[] { "is_active", "is_default" });

            migrationBuilder.AddForeignKey(
                name: "FK_payments_payment_accounts_payment_account_id",
                table: "payments",
                column: "payment_account_id",
                principalTable: "payment_accounts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_payments_payment_accounts_payment_account_id",
                table: "payments");

            migrationBuilder.DropTable(
                name: "payment_accounts");

            migrationBuilder.DropIndex(
                name: "IX_payments_payment_account_id",
                table: "payments");

            migrationBuilder.DropColumn(
                name: "payment_account_id",
                table: "payments");
        }
    }
}
