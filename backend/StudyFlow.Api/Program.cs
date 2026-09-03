using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using StudyFlow.Api.Data;
using StudyFlow.Api.Models;
using StudyFlow.Api.Options;
using StudyFlow.Api.Services;
using StudyFlow.Api.Services.Automation;

var builder = WebApplication.CreateBuilder(args);
const string frontendCors = "Frontend";
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>()
    ?.Where(origin => !string.IsNullOrWhiteSpace(origin))
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToArray()
    ?? [];

// Add services to the container.

builder.Services.AddControllers();
builder.Services.AddCors(options =>
{
    options.AddPolicy(frontendCors, policy =>
    {
        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services
    .AddIdentity<ApplicationUser, IdentityRole<Guid>>(options =>
    {
        options.User.RequireUniqueEmail = true;
        options.SignIn.RequireConfirmedEmail = true;

        options.Password.RequiredLength = 8;
        options.Password.RequiredUniqueChars = 4;
        options.Password.RequireDigit = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireUppercase = true;
        options.Password.RequireNonAlphanumeric = true;
    })
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders();

var jwtSection = builder.Configuration.GetRequiredSection(JwtOptions.SectionName);
var jwtOptions = jwtSection.Get<JwtOptions>()
    ?? throw new InvalidOperationException("JWT configuration is missing.");

if (string.IsNullOrWhiteSpace(jwtOptions.Key)
    || string.IsNullOrWhiteSpace(jwtOptions.Issuer)
    || string.IsNullOrWhiteSpace(jwtOptions.Audience)
    || jwtOptions.ExpirationMinutes <= 0)
{
    throw new InvalidOperationException("JWT configuration is invalid.");
}

builder.Services.Configure<JwtOptions>(jwtSection);
builder.Services.AddScoped<ITokenService, JwtTokenService>();
var automationSection = builder.Configuration.GetRequiredSection(
    StudyItemAutomationOptions.SectionName);
builder.Services
    .AddOptions<StudyItemAutomationOptions>()
    .Bind(automationSection)
    .Validate(
        options => !string.IsNullOrWhiteSpace(options.AcademicTimeZoneId),
        "An academic time zone is required.")
    .Validate(
        options => TimeZoneInfo.TryFindSystemTimeZoneById(
            options.AcademicTimeZoneId,
            out _),
        "The configured academic time zone is not available.")
    .Validate(
        options => options.IntervalHours > 0,
        "The StudyItem automation interval must be greater than zero hours.")
    .ValidateOnStart();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<IAcademicClock, AcademicClock>();
builder.Services.AddScoped<IStudyItemAutomationProcessor, StudyItemAutomationProcessor>();
builder.Services.AddHostedService<StudyItemAutomationBackgroundService>();
builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Key)),
            ValidateIssuer = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtOptions.Audience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero,
        };
    });
builder.Services.AddAuthorization();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Production TLS is terminated by the deployment reverse proxy.
app.UseCors(frontendCors);
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
