FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["backend/StudyFlow.Api/StudyFlow.Api.csproj", "backend/StudyFlow.Api/"]
RUN dotnet restore "backend/StudyFlow.Api/StudyFlow.Api.csproj"

COPY ["backend/StudyFlow.Api/", "backend/StudyFlow.Api/"]
WORKDIR /src/backend/StudyFlow.Api
RUN dotnet publish "StudyFlow.Api.csproj" \
    --configuration Release \
    --output /app/publish \
    --no-restore \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

COPY --from=build /app/publish .
USER $APP_UID
ENTRYPOINT ["dotnet", "StudyFlow.Api.dll"]