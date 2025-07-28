# CallSound Pro - Voice-Triggered Sound Clips Application

## Overview

CallSound Pro is a full-stack web application that enables users to upload sound clips and trigger them through voice recognition. The application listens for specific trigger words/phrases and plays corresponding audio files, making it ideal for live streaming, gaming, or entertainment purposes.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (January 2025)

✓ **Voice-Activated Soundboard Complete** - Built full-stack application with voice recognition and automatic sound triggering
✓ **Core Features Implemented** - Sound upload, trigger word management, real-time audio visualization
✓ **User Interface** - Modern responsive design with dark mode support
✓ **Browser Compatibility** - Web Speech API integration with Chrome/Edge support (desktop optimized)
✓ **Multiple Default Responses** - Sequential cycling through multiple default response sounds
✓ **Audio Recording Feature** - Direct browser-based recording with WebM support and real-time preview
✓ **Mobile Voice Recognition Optimization** - Enhanced mobile support with haptic feedback and touch-optimized UI
✓ **Session-Based Storage** - Data stored temporarily in memory during browser session for privacy and performance
✓ **Profile System** - Export/import all data as portable JSON files for permanent storage and sharing across devices
✓ **Server Profile Storage** - Cloud backup with 10MB limit and custom filenames for cross-device access
✓ **Production Ready** - All essential features working and tested
✓ **Default Clip Auto-Play** - Default clips automatically play when voice is detected but no trigger words match
✓ **Conversation Recording Removed** - Removed conversation recording feature due to browser microphone access limitations that prevent simultaneous voice recognition and recording
✓ **Streamlined Interface** - Integrated trigger word management directly into sound library with per-clip trigger assignment and deletion
✓ **Voice Recognition Continuous Listening** - Fixed 10-second timeout issue with automatic restart functionality
✓ **Profile Loading Fixed** - Resolved database schema mismatch preventing profile imports from working
✓ **Delete Functionality Fixed** - Corrected delete button API call syntax for sound clip removal
✓ **Server Profiles on Main Page** - Moved server profile loading to main page with collapsible list of available profiles
✓ **Ultra-Fast Response Times** - Optimized all response delays for maximum speed: instant trigger responses, immediate default clips, faster recognition restarts
✓ **Improved Layout** - Moved "Load Soundboard" section below voice recognition for better visual hierarchy and renamed for clarity
✓ **Maximum Microphone Sensitivity** - Disabled echo cancellation, noise suppression, and auto-gain control for maximum sensitivity
✓ **Voice Controls Reorganized** - Moved detailed voice controls to Settings > Voice tab, simplified main page to status display
✓ **Import/Export on Main Page** - Moved profile import and export options to bottom of main page for easier access
✓ **Clean Interface** - Removed session storage warning message for cleaner main page appearance
✓ **Audio Controls Added** - Master volume and mic sensitivity sliders positioned below sound library with real-time adjustment
✓ **Adaptive Microphone Settings** - Mic sensitivity dynamically adjusts audio constraints, sample rates, and analyzer settings for optimal performance
✓ **Preview All Clips** - Added preview button to sound library that plays all clips in sequence with progress tracking
✓ **Sequential Playback** - Preview function plays each clip with 500ms gap between them and shows completion percentage
✓ **Dynamic Badge System** - Clips with triggers show "Assigned" badge, clips without triggers show "Default" badge based on actual trigger assignments
✓ **Auto-Restart After 10 Words** - Voice recognition automatically restarts every 10 words to prevent timeout when users talk for extended periods, with user guidance for manual restart if needed
✓ **Persistent User Notice** - Added permanent info banner at top of main page instructing users how to manually restart voice recognition if it stops responding
✓ **Read-Only Server Profiles** - Added read-only checkbox for server profile saving with lock icon visual indicators, preventing overwriting or deletion of protected profiles
✓ **Profile Save Validation** - Server profile saving now requires at least one sound clip, preventing empty profile saves with clear user feedback and disabled save button when no clips exist


## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Library**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with CSS variables for theming
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state
- **Build Tool**: Vite with React plugin
- **Audio Processing**: Web Audio API for voice recognition and audio playback

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful API design
- **File Handling**: Multer for multipart/form-data file uploads
- **Development**: Hot module replacement via Vite integration

### Database & ORM
- **Database**: PostgreSQL (configured via Drizzle)
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Connection**: Neon Database serverless driver
- **Schema**: Shared schema definitions between client and server
- **Migrations**: Drizzle Kit for database migrations

## Key Components

### Audio Management System
- **Sound Clips**: Upload, store, and manage audio files (MP3, WAV, OGG)
- **File Storage**: Local filesystem storage with configurable upload directory
- **Audio Player**: Custom hook for audio playback with volume control
- **Supported Formats**: MP3, WAV, OGG with 10MB file size limit

### Voice Recognition Engine
- **Browser API**: Web Speech Recognition API (Chrome/Edge)
- **Real-time Processing**: Continuous listening with interim results
- **Audio Visualization**: Real-time audio level monitoring and visual feedback
- **Trigger Matching**: Case-sensitive/insensitive phrase matching with cooldown system

### Trigger Word System
- **Dynamic Configuration**: Create, edit, and delete trigger words
- **Sound Association**: Link trigger phrases to specific sound clips
- **Flexible Matching**: Optional case-sensitive matching
- **Enable/Disable**: Toggle individual triggers without deletion

### Storage System
- **Session Storage**: In-memory storage for temporary data during browser session
- **File Storage**: Local filesystem storage for audio files in uploads directory (cleaned on session end)
- **Interface-based Design**: IStorage interface supporting multiple storage backends
- **CRUD Operations**: Full create, read, update, delete functionality with session-based persistence

### Profile Management System
- **Export Functionality**: Download all user data (sound clips, trigger words, settings) as portable JSON files
- **Import Functionality**: Upload previously exported profiles to restore complete soundboard configurations
- **Data Portability**: Profile files include audio data as base64 encoding for complete portability
- **Cross-Device Compatibility**: Share profiles between different devices and users
- **Backup System**: Export profiles as backup before making major changes
- **Server Storage**: Save profiles to server with 10MB limit for cloud backup and cross-device access
- **Profile Management**: Custom filename prompts, server profile listing, loading, and deletion

## Data Flow

1. **Audio Upload**: Client uploads audio files → Multer processes → Server validates → File stored locally → Memory record created
2. **Voice Recognition**: Browser captures audio → Speech API processes → Text transcript generated → Trigger matching performed → Associated sound played
3. **Trigger Management**: User creates trigger words → Associated with sound clips → Stored in memory → Used for real-time matching
4. **Audio Playback**: Trigger detected → Sound clip retrieved → Audio element created → Played with volume control
5. **Profile Management**: User exports data → All memory data and audio files packaged → JSON file downloaded → User imports → Data restored to memory
6. **Server Profile Storage**: User saves to server → Profile validated for size limit → Stored with custom filename → Available for cross-device loading

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL serverless connection
- **drizzle-orm**: Database ORM and query builder
- **@tanstack/react-query**: Server state management
- **@radix-ui/**: Comprehensive UI component library
- **multer**: File upload handling middleware
- **wouter**: Lightweight React router

### Development Tools
- **Vite**: Fast build tool and development server
- **TypeScript**: Type safety and development experience
- **Tailwind CSS**: Utility-first CSS framework
- **ESBuild**: Fast JavaScript bundler for production

### Browser APIs
- **Web Speech Recognition**: Voice input processing (desktop Chrome/Edge optimized)
- **Web Audio API**: Audio level monitoring and playback
- **File API**: Client-side file handling

### Platform Compatibility
- **Desktop**: Full voice recognition support in Chrome and Edge browsers
- **Mobile/Android**: Enhanced voice recognition with mobile optimizations including haptic feedback, larger touch targets, and non-continuous mode for better stability
- **iOS**: Recording and upload features available; voice recognition support varies
- **Mobile Optimizations**: Haptic feedback for interactions, larger UI elements, optimized audio settings, and mobile-specific error handling

## Deployment Strategy

### Build Process
- **Client Build**: Vite builds React app to `dist/public`
- **Server Build**: ESBuild bundles server code to `dist/index.js`
- **Production Mode**: Serves static files and API from single Express server
- **Development Mode**: Vite dev server with HMR integration

### Environment Configuration
- **Database URL**: Required environment variable for PostgreSQL connection
- **File Storage**: Configurable upload directory (defaults to `./uploads`)
- **Development Features**: Replit-specific debugging and development tools

### Database Management
- **Schema Migrations**: Drizzle Kit for database schema management
- **Push Strategy**: Direct schema push for development
- **Production Ready**: Migration-based deployment for production environments

The application follows a modern full-stack architecture with clear separation between client and server, comprehensive error handling, and scalable storage solutions. The modular design allows for easy extension and maintenance while providing a robust foundation for voice-triggered audio applications.