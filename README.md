youtube-shorts-generator/
├── src/
│   ├── main/
│   │   ├── java/com/example/shorts/
│   │   │   ├── config/                <-- API keys, OAuth, Beans
│   │   │   ├── controller/            <-- Optional REST API
│   │   │   ├── dto/                   <-- DTOs for OpenAI/YouTube
│   │   │   ├── model/                 <-- JPA Entities (e.g., QuoteVideo)
│   │   │   ├── repository/            <-- JPA Repositories
│   │   │   ├── scheduler/             <-- Scheduled job class
│   │   │   ├── service/
│   │   │   │   ├── QuoteService.java          <-- Calls OpenAI GPT
│   │   │   │   ├── VideoComposerService.java  <-- Builds video using FFmpeg
│   │   │   │   ├── YouTubeUploaderService.java<-- Uploads video
│   │   │   │   ├── FileService.java           <-- Local file mgmt
│   │   │   │   └── TextOverlayService.java    <-- Quote to drawtext config
│   │   │   └── ShortsGeneratorApplication.java <-- Main app
│   │   └── resources/
│   │       ├── application.yml
│   │       ├── static/                <-- Optional static assets
│   │       └── assets/
│   │           ├── backgrounds/       <-- Video/image backgrounds
│   │           ├── music/             <-- MP3 files
│   │           └── fonts/             <-- .ttf font for drawtext
│   └── test/java/com/example/shorts/
│       └── service/                   <-- Unit tests
├── Dockerfile                        <-- For containerization
├── pom.xml                           <-- Maven dependencies
└── README.md
