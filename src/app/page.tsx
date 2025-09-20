import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Mic,
  Brain,
  FileText,
  Download,
  Zap,
  Shield,
  Clock,
  Users,
  BookOpen,
  Sparkles,
} from 'lucide-react';

export default function Home() {
  const features = [
    {
      icon: Mic,
      title: 'Live Transcription',
      description:
        'Real-time speech-to-text with speaker identification and confidence scoring.',
      color: 'text-blue-600',
    },
    {
      icon: Brain,
      title: 'AI-Powered Notes',
      description:
        'Smart note generation with step-by-step problem expansion and summaries.',
      color: 'text-purple-600',
    },
    {
      icon: FileText,
      title: 'Whiteboard Vision',
      description:
        'Capture and OCR whiteboard content with automatic equation recognition.',
      color: 'text-green-600',
    },
    {
      icon: Download,
      title: 'Smart Exports',
      description:
        'Generate comprehensive study materials in PDF, DOCX, and Markdown formats.',
      color: 'text-orange-600',
    },
    {
      icon: Zap,
      title: 'Real-time Sync',
      description:
        'Live updates with WebSocket technology for instant collaboration.',
      color: 'text-yellow-600',
    },
    {
      icon: Shield,
      title: 'Privacy First',
      description:
        'FERPA-compliant with local processing and secure data handling.',
      color: 'text-red-600',
    },
  ];

  const stats = [
    { label: 'Active Sessions', value: '1,200+' },
    { label: 'Students Helped', value: '15,000+' },
    { label: 'Notes Generated', value: '50,000+' },
    { label: 'Accuracy Rate', value: '95%+' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <Badge variant="outline" className="mb-4">
              <Sparkles className="h-3 w-3 mr-1" />
              Enhanced Digital Intelligence for Teaching & Learning
            </Badge>

            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-foreground mb-6">
              Meet{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                E.D.I.T.H.
              </span>
            </h1>

            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Your intelligent lecture companion that transforms how students
              capture, understand, and retain knowledge through real-time
              transcription, AI-powered insights, and smart study materials.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/session">
                  <Mic className="h-5 w-5 mr-2" />
                  Start Demo Session
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/settings">
                  <BookOpen className="h-5 w-5 mr-2" />
                  Learn More
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl font-bold text-foreground mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Powerful Features for Modern Learning
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to capture, understand, and retain knowledge
              from your lectures and study sessions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg bg-muted ${feature.color}`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              How E.D.I.T.H. Works
            </h2>
            <p className="text-xl text-muted-foreground">
              Three simple steps to transform your learning experience
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                1. Record & Capture
              </h3>
              <p className="text-muted-foreground">
                Start recording your lecture and E.D.I.T.H. will transcribe
                speech and capture whiteboard content in real-time.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Brain className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">2. AI Processing</h3>
              <p className="text-muted-foreground">
                Our AI analyzes the content to generate summaries, flashcards,
                and step-by-step explanations automatically.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Study & Export</h3>
              <p className="text-muted-foreground">
                Access your smart notes, study with flashcards, and export
                comprehensive materials for offline study.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to Transform Your Learning?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of students who are already using E.D.I.T.H. to
            enhance their academic success.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/session">
                <Mic className="h-5 w-5 mr-2" />
                Start Your First Session
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/settings">
                <BookOpen className="h-5 w-5 mr-2" />
                Explore Features
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t bg-muted/50">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-muted-foreground">
            © 2024 E.D.I.T.H. - Enhanced Digital Intelligence for Teaching &
            Learning
          </p>
        </div>
      </footer>
    </div>
  );
}
