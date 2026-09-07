
using System;
using FatooraRahatak.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

#nullable disable

namespace FatooraRahatak.Infrastructure.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260701130328_AddRefreshToken")]
    partial class AddRefreshToken
    {

        protected override void BuildTargetModel(ModelBuilder modelBuilder)
        {
#pragma warning disable 612, 618
            modelBuilder
                .HasAnnotation("ProductVersion", "10.0.9")
                .HasAnnotation("Relational:MaxIdentifierLength", 128);

            SqlServerModelBuilderExtensions.UseIdentityColumns(modelBuilder);

            modelBuilder.Entity("FatooraRahatak.Domain.Entities.Employees.Employee", b =>
                {
                    b.Property<long>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("bigint");

                    SqlServerPropertyBuilderExtensions.UseIdentityColumn(b.Property<long>("Id"));

                    b.Property<DateTime>("CreatedAt")
                        .HasColumnType("datetime2");

                    b.Property<DateOnly>("HireDate")
                        .HasColumnType("date");

                    b.Property<long>("RoleId")
                        .HasColumnType("bigint");

                    b.Property<decimal>("Salary")
                        .HasPrecision(10, 2)
                        .HasColumnType("decimal(10,2)");

                    b.Property<string>("Status")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<long>("StoreId")
                        .HasColumnType("bigint");

                    b.Property<DateTime>("UpdatedAt")
                        .HasColumnType("datetime2");

                    b.Property<long>("UserId")
                        .HasColumnType("bigint");

                    b.HasKey("Id");

                    b.HasIndex("RoleId");

                    b.HasIndex("StoreId");

                    b.HasIndex("UserId")
                        .IsUnique();

                    b.ToTable("Employees");
                });

            modelBuilder.Entity("FatooraRahatak.Domain.Entities.Packages.Package", b =>
                {
                    b.Property<long>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("bigint");

                    SqlServerPropertyBuilderExtensions.UseIdentityColumn(b.Property<long>("Id"));

                    b.Property<DateTime>("CreatedAt")
                        .HasColumnType("datetime2");

                    b.Property<bool>("HasAccountingFull")
                        .HasColumnType("bit");

                    b.Property<bool>("HasAffiliateMarketing")
                        .HasColumnType("bit");

                    b.Property<bool>("HasApiAccess")
                        .HasColumnType("bit");

                    b.Property<bool>("HasCustomDomain")
                        .HasColumnType("bit");

                    b.Property<bool>("HasPayroll")
                        .HasColumnType("bit");

                    b.Property<bool>("HasZatcaInvoice")
                        .HasColumnType("bit");

                    b.Property<bool>("IsActive")
                        .HasColumnType("bit");

                    b.Property<int>("MaxBranchesPOS")
                        .HasColumnType("int");

                    b.Property<int>("MaxEmployees")
                        .HasColumnType("int");

                    b.Property<int?>("MaxOrdersPerMonth")
                        .HasColumnType("int");

                    b.Property<int>("MaxPaymentGateways")
                        .HasColumnType("int");

                    b.Property<int?>("MaxProducts")
                        .HasColumnType("int");

                    b.Property<int>("MaxShippingCompanies")
                        .HasColumnType("int");

                    b.Property<int>("MaxWarehouses")
                        .HasColumnType("int");

                    b.Property<decimal>("MonthlyPrice")
                        .HasPrecision(10, 2)
                        .HasColumnType("decimal(10,2)");

                    b.Property<string>("PackageName")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<DateTime>("UpdatedAt")
                        .HasColumnType("datetime2");

                    b.HasKey("Id");

                    b.ToTable("Packages");
                });

            modelBuilder.Entity("FatooraRahatak.Domain.Entities.Packages.Subscription", b =>
                {
                    b.Property<long>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("bigint");

                    SqlServerPropertyBuilderExtensions.UseIdentityColumn(b.Property<long>("Id"));

                    b.Property<bool>("AutoRenew")
                        .HasColumnType("bit");

                    b.Property<DateTime>("CreatedAt")
                        .HasColumnType("datetime2");

                    b.Property<DateTime>("EndDate")
                        .HasColumnType("datetime2");

                    b.Property<DateTime?>("GracePeriodEnd")
                        .HasColumnType("datetime2");

                    b.Property<long>("PackageId")
                        .HasColumnType("bigint");

                    b.Property<string>("PaymentStatus")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<DateTime>("StartDate")
                        .HasColumnType("datetime2");

                    b.Property<int>("Status")
                        .HasColumnType("int");

                    b.Property<long>("StoreId")
                        .HasColumnType("bigint");

                    b.Property<DateTime>("UpdatedAt")
                        .HasColumnType("datetime2");

                    b.HasKey("Id");

                    b.HasIndex("PackageId");

                    b.HasIndex("StoreId");

                    b.ToTable("Subscriptions");
                });

            modelBuilder.Entity("FatooraRahatak.Domain.Entities.Roles.EmployeePermissionOverride", b =>
                {
                    b.Property<long>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("bigint");

                    SqlServerPropertyBuilderExtensions.UseIdentityColumn(b.Property<long>("Id"));

                    b.Property<DateTime>("CreatedAt")
                        .HasColumnType("datetime2");

                    b.Property<long>("EmployeeId")
                        .HasColumnType("bigint");

                    b.Property<bool>("IsGranted")
                        .HasColumnType("bit");

                    b.Property<long>("PermissionId")
                        .HasColumnType("bigint");

                    b.Property<DateTime>("UpdatedAt")
                        .HasColumnType("datetime2");

                    b.HasKey("Id");

                    b.HasIndex("EmployeeId");

                    b.HasIndex("PermissionId");

                    b.ToTable("EmployeePermissionOverrides");
                });

            modelBuilder.Entity("FatooraRahatak.Domain.Entities.Roles.Permission", b =>
                {
                    b.Property<long>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("bigint");

                    SqlServerPropertyBuilderExtensions.UseIdentityColumn(b.Property<long>("Id"));

                    b.Property<int>("ActionType")
                        .HasColumnType("int");

                    b.Property<DateTime>("CreatedAt")
                        .HasColumnType("datetime2");

                    b.Property<string>("ModuleName")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<string>("PermissionCode")
                        .IsRequired()
                        .HasColumnType("nvarchar(450)");

                    b.Property<DateTime>("UpdatedAt")
                        .HasColumnType("datetime2");

                    b.HasKey("Id");

                    b.HasIndex("PermissionCode")
                        .IsUnique();

                    b.ToTable("Permissions");
                });

            modelBuilder.Entity("FatooraRahatak.Domain.Entities.Roles.Role", b =>
                {
                    b.Property<long>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("bigint");

                    SqlServerPropertyBuilderExtensions.UseIdentityColumn(b.Property<long>("Id"));

                    b.Property<DateTime>("CreatedAt")
                        .HasColumnType("datetime2");

                    b.Property<bool>("IsSystemRole")
                        .HasColumnType("bit");

                    b.Property<string>("RoleName")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<int>("RoleScope")
                        .HasColumnType("int");

                    b.Property<DateTime>("UpdatedAt")
                        .HasColumnType("datetime2");

                    b.HasKey("Id");

                    b.ToTable("Roles");
                });

            modelBuilder.Entity("FatooraRahatak.Domain.Entities.Roles.RolePermission", b =>
                {
                    b.Property<long>("RoleId")
                        .HasColumnType("bigint");

                    b.Property<long>("PermissionId")
                        .HasColumnType("bigint");

                    b.HasKey("RoleId", "PermissionId");

                    b.HasIndex("PermissionId");

                    b.ToTable("RolePermissions");
                });

            modelBuilder.Entity("FatooraRahatak.Domain.Entities.Stores.Store", b =>
                {
                    b.Property<long>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("bigint");

                    SqlServerPropertyBuilderExtensions.UseIdentityColumn(b.Property<long>("Id"));

                    b.Property<long?>("ActiveSubscriptionId")
                        .HasColumnType("bigint");

                    b.Property<DateTime>("BillingCycleDate")
                        .HasColumnType("datetime2");

                    b.Property<DateTime>("CreatedAt")
                        .HasColumnType("datetime2");

                    b.Property<string>("CustomDomain")
                        .HasColumnType("nvarchar(max)");

                    b.Property<string>("DefaultLanguage")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<bool>("IsVatRegistered")
                        .HasColumnType("bit");

                    b.Property<string>("Logo")
                        .HasColumnType("nvarchar(max)");

                    b.Property<long>("OwnerUserId")
                        .HasColumnType("bigint");

                    b.Property<long>("PackageId")
                        .HasColumnType("bigint");

                    b.Property<int>("Status")
                        .HasColumnType("int");

                    b.Property<string>("StoreName")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<string>("StoreSlug")
                        .IsRequired()
                        .HasColumnType("nvarchar(450)");

                    b.Property<DateTime>("UpdatedAt")
                        .HasColumnType("datetime2");

                    b.Property<string>("VatNumber")
                        .HasColumnType("nvarchar(max)");

                    b.HasKey("Id");

                    b.HasIndex("OwnerUserId")
                        .IsUnique();

                    b.HasIndex("PackageId");

                    b.HasIndex("StoreSlug")
                        .IsUnique();

                    b.ToTable("Stores");
                });

            modelBuilder.Entity("FatooraRahatak.Domain.Entities.Users.RefreshToken", b =>
                {
                    b.Property<long>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("bigint");

                    SqlServerPropertyBuilderExtensions.UseIdentityColumn(b.Property<long>("Id"));

                    b.Property<DateTime>("CreatedAt")
                        .HasColumnType("datetime2");

                    b.Property<DateTime>("ExpiresAt")
                        .HasColumnType("datetime2");

                    b.Property<bool>("IsRevoked")
                        .HasColumnType("bit");

                    b.Property<string>("Token")
                        .IsRequired()
                        .HasColumnType("nvarchar(450)");

                    b.Property<DateTime>("UpdatedAt")
                        .HasColumnType("datetime2");

                    b.Property<long>("UserId")
                        .HasColumnType("bigint");

                    b.HasKey("Id");

                    b.HasIndex("Token")
                        .IsUnique();

                    b.HasIndex("UserId");

                    b.ToTable("RefreshTokens");
                });

            modelBuilder.Entity("FatooraRahatak.Domain.Entities.Users.User", b =>
                {
                    b.Property<long>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("bigint");

                    SqlServerPropertyBuilderExtensions.UseIdentityColumn(b.Property<long>("Id"));

                    b.Property<DateTime>("CreatedAt")
                        .HasColumnType("datetime2");

                    b.Property<string>("Email")
                        .IsRequired()
                        .HasColumnType("nvarchar(450)");

                    b.Property<string>("FullName")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<bool>("IsActive")
                        .HasColumnType("bit");

                    b.Property<bool>("IsVerified")
                        .HasColumnType("bit");

                    b.Property<DateTime?>("LastLoginAt")
                        .HasColumnType("datetime2");

                    b.Property<string>("PasswordHash")
                        .IsRequired()
                        .HasColumnType("nvarchar(max)");

                    b.Property<string>("Phone")
                        .IsRequired()
                        .HasColumnType("nvarchar(450)");

                    b.Property<string>("ProfileImage")
                        .HasColumnType("nvarchar(max)");

                    b.Property<DateTime>("UpdatedAt")
                        .HasColumnType("datetime2");

                    b.Property<int>("UserType")
                        .HasColumnType("int");

                    b.HasKey("Id");

                    b.HasIndex("Email")
                        .IsUnique();

                    b.HasIndex("Phone")
                        .IsUnique();

                    b.ToTable("Users");
                });

            modelBuilder.Entity("FatooraRahatak.Domain.Entities.Employees.Employee", b =>
                {
                    b.HasOne("FatooraRahatak.Domain.Entities.Roles.Role", "Role")
                        .WithMany("Employees")
                        .HasForeignKey("RoleId")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();

                    b.HasOne("FatooraRahatak.Domain.Entities.Stores.Store", "Store")
                        .WithMany("Employees")
                        .HasForeignKey("StoreId")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();

                    b.HasOne("FatooraRahatak.Domain.Entities.Users.User", "User")
                        .WithOne("EmployeeProfile")
                        .HasForeignKey("FatooraRahatak.Domain.Entities.Employees.Employee", "UserId")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();

                    b.Navigation("Role");

                    b.Navigation("Store");

                    b.Navigation("User");
                });

            modelBuilder.Entity("FatooraRahatak.Domain.Entities.Packages.Subscription", b =>
                {
                    b.HasOne("FatooraRahatak.Domain.Entities.Packages.Package", "Package")
                        .WithMany("Subscriptions")
                        .HasForeignKey("PackageId")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();

                    b.HasOne("FatooraRahatak.Domain.Entities.Stores.Store", "Store")
                        .WithMany("Subscriptions")
                        .HasForeignKey("StoreId")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();

                    b.Navigation("Package");

                    b.Navigation("Store");
                });

            modelBuilder.Entity("FatooraRahatak.Domain.Entities.Roles.EmployeePermissionOverride", b =>
                {
                    b.HasOne("FatooraRahatak.Domain.Entities.Employees.Employee", "Employee")
                        .WithMany("PermissionOverrides")
                        .HasForeignKey("EmployeeId")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();

                    b.HasOne("FatooraRahatak.Domain.Entities.Roles.Permission", "Permission")
                        .WithMany("EmployeeOverrides")
                        .HasForeignKey("PermissionId")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();

                    b.Navigation("Employee");

                    b.Navigation("Permission");
                });

            modelBuilder.Entity("FatooraRahatak.Domain.Entities.Roles.RolePermission", b =>
                {
                    b.HasOne("FatooraRahatak.Domain.Entities.Roles.Permission", "Permission")
                        .WithMany("RolePermissions")
                        .HasForeignKey("PermissionId")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();

                    b.HasOne("FatooraRahatak.Domain.Entities.Roles.Role", "Role")
                        .WithMany("RolePermissions")
                        .HasForeignKey("RoleId")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();

                    b.Navigation("Permission");

                    b.Navigation("Role");
                });

            modelBuilder.Entity("FatooraRahatak.Domain.Entities.Stores.Store", b =>
                {
                    b.HasOne("FatooraRahatak.Domain.Entities.Users.User", "Owner")
                        .WithOne("OwnedStore")
                        .HasForeignKey("FatooraRahatak.Domain.Entities.Stores.Store", "OwnerUserId")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();

                    b.HasOne("FatooraRahatak.Domain.Entities.Packages.Package", "Package")
                        .WithMany("Stores")
                        .HasForeignKey("PackageId")
                        .OnDelete(DeleteBehavior.Restrict)
                        .IsRequired();

                    b.Navigation("Owner");

                    b.Navigation("Package");
                });

            modelBuilder.Entity("FatooraRahatak.Domain.Entities.Users.RefreshToken", b =>
                {
                    b.HasOne("FatooraRahatak.Domain.Entities.Users.User", "User")
                        .WithMany("RefreshTokens")
                        .HasForeignKey("UserId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("User");
                });

            modelBuilder.Entity("FatooraRahatak.Domain.Entities.Employees.Employee", b =>
                {
                    b.Navigation("PermissionOverrides");
                });

            modelBuilder.Entity("FatooraRahatak.Domain.Entities.Packages.Package", b =>
                {
                    b.Navigation("Stores");

                    b.Navigation("Subscriptions");
                });

            modelBuilder.Entity("FatooraRahatak.Domain.Entities.Roles.Permission", b =>
                {
                    b.Navigation("EmployeeOverrides");

                    b.Navigation("RolePermissions");
                });

            modelBuilder.Entity("FatooraRahatak.Domain.Entities.Roles.Role", b =>
                {
                    b.Navigation("Employees");

                    b.Navigation("RolePermissions");
                });

            modelBuilder.Entity("FatooraRahatak.Domain.Entities.Stores.Store", b =>
                {
                    b.Navigation("Employees");

                    b.Navigation("Subscriptions");
                });

            modelBuilder.Entity("FatooraRahatak.Domain.Entities.Users.User", b =>
                {
                    b.Navigation("EmployeeProfile");

                    b.Navigation("OwnedStore");

                    b.Navigation("RefreshTokens");
                });
#pragma warning restore 612, 618
        }
    }
}
