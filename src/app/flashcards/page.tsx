'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { DeckList } from '@/components/flashcards/DeckList';
import { CardStudy } from '@/components/flashcards/CardStudy';
import { QuizMCQ } from '@/components/flashcards/QuizMCQ';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function FlashcardsPage() {
  return (
    <AppLayout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="border-b bg-background p-4">
          <h1 className="text-2xl font-bold">Flashcards & Quizzes</h1>
          <p className="text-muted-foreground">
            Study with AI-generated flashcards and test your knowledge with
            quizzes
          </p>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 min-h-0">
          <Tabs defaultValue="decks" className="h-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="decks">Decks</TabsTrigger>
              <TabsTrigger value="study">Study</TabsTrigger>
              <TabsTrigger value="quiz">Quiz</TabsTrigger>
            </TabsList>

            <TabsContent value="decks" className="h-full mt-4">
              <DeckList />
            </TabsContent>

            <TabsContent value="study" className="h-full mt-4">
              <CardStudy />
            </TabsContent>

            <TabsContent value="quiz" className="h-full mt-4">
              <QuizMCQ />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
