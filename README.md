# E.D.I.T.H. - Enhanced Digital Intelligence for Teaching & Learning

A real-time lecture companion that transforms how students capture, understand, and retain knowledge through AI-powered transcription, whiteboard vision, and smart study materials.

## 🚀 Features

### Core Functionality

- **Live Transcription**: Real-time speech-to-text with speaker identification
- **Whiteboard Vision**: Capture and OCR whiteboard content with automatic equation recognition
- **AI-Powered Notes**: Smart note generation with step-by-step problem expansion
- **Smart Note Pack**: Comprehensive study materials with summaries and key insights
- **Flashcards & Quizzes**: AI-generated study cards and interactive quizzes
- **Export Options**: Multiple formats (PDF, DOCX, Markdown) for offline study

### Advanced Features

- **Real-time Sync**: WebSocket-based live updates
- **Note Alignment**: Compare your notes with captured content
- **Timeline Navigation**: Browse through captured snapshots chronologically
- **Keyboard Shortcuts**: Efficient navigation and control
- **Dark Mode**: System-aware theme switching
- **Privacy First**: FERPA-compliant with local data processing

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui component library
- **State Management**: Zustand for global state, TanStack Query for server state
- **Real-time**: Socket.IO client for live events
- **Forms**: react-hook-form + zod validation
- **Icons**: Lucide React
- **Testing**: Vitest + React Testing Library + Playwright

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd edith-frontend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Update `.env.local` with your configuration:

   ```env
   NEXT_PUBLIC_API_BASE=http://localhost:8000
   NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
   ```

4. **Start the development server**

   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Landing page
│   ├── session/           # Live session page
│   ├── notes/             # Notes and alignment page
│   ├── flashcards/        # Study and quiz page
│   ├── exports/           # Export center
│   └── settings/          # Settings and preferences
├── components/            # React components
│   ├── shell/            # App shell components
│   ├── session/          # Session-specific components
│   ├── notes/            # Notes-related components
│   ├── flashcards/       # Study components
│   ├── exports/          # Export components
│   ├── settings/         # Settings components
│   └── ui/               # shadcn/ui components
├── lib/                  # Utilities and configurations
│   ├── api/              # API client and types
│   ├── store/            # Zustand store
│   ├── realtime/         # Socket.IO client
│   └── utils/            # Helper functions
├── mocks/                # Mock data for development
└── test/                 # Test setup and utilities
```

## 🎯 Usage

### Starting a Session

1. Navigate to the **Session** page
2. Click **Record** to start capturing audio and whiteboard content
3. Use the **Whiteboard Preview** to capture snapshots
4. View the **Live Transcript** for real-time speech-to-text

### Managing Notes

1. Go to the **Notes** page
2. Write your notes in the editor
3. Use **Note Alignment** to compare with captured content
4. Generate a **Smart Note Pack** for comprehensive study materials

### Studying with Flashcards

1. Visit the **Flashcards** page
2. Browse available decks or start a study session
3. Use the **Quiz** mode to test your knowledge
4. Track your progress and review statistics

### Exporting Content

1. Navigate to the **Exports** page
2. Choose your desired format (PDF, DOCX, Markdown, etc.)
3. Select content to include
4. Download your study materials

## ⌨️ Keyboard Shortcuts

| Shortcut  | Action                                 |
| --------- | -------------------------------------- |
| `⌘R`      | Toggle recording                       |
| `S`       | Capture snapshot                       |
| `B`       | Add bookmark                           |
| `M`       | Add marker                             |
| `]` / `[` | Next/Previous snapshot                 |
| `/`       | Focus transcript search                |
| `Space`   | Flip flashcard                         |
| `1-4`     | Grade flashcard (Again/Hard/Good/Easy) |
| `?`       | Show keyboard shortcuts                |

## 🧪 Testing

### Unit Tests

```bash
npm run test
```

### E2E Tests

```bash
npm run test:ui
```

### Linting

```bash
npm run lint
```

## 🔧 Configuration

### Environment Variables

| Variable                 | Description          | Default                 |
| ------------------------ | -------------------- | ----------------------- |
| `NEXT_PUBLIC_API_BASE`   | Backend API base URL | `http://localhost:8000` |
| `NEXT_PUBLIC_SOCKET_URL` | WebSocket server URL | `http://localhost:4000` |

### Settings

Access the settings page to configure:

- Theme preferences (Light/Dark/System)
- Data retention period
- Privacy controls
- Keyboard shortcuts
- Notifications

## 🔒 Privacy & Security

- **FERPA Compliant**: Designed to meet educational privacy requirements
- **Local Processing**: All data processed on your device
- **No External Servers**: Audio and transcript data stays local
- **Data Control**: Full control over your data with export/delete options

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Deploy with zero configuration

### Other Platforms

```bash
npm run build
npm run start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) for the amazing React framework
- [shadcn/ui](https://ui.shadcn.com/) for the beautiful component library
- [Tailwind CSS](https://tailwindcss.com/) for utility-first styling
- [Zustand](https://zustand-demo.pmnd.rs/) for state management
- [TanStack Query](https://tanstack.com/query) for server state management

## 📞 Support

For support, email support@edith-app.com or join our Discord community.

---

**E.D.I.T.H.** - Transforming education through intelligent technology.
