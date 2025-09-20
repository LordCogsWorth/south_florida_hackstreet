'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { fetchFlashcards } from '@/lib/api/client';
import {
  Search,
  Filter,
  BookOpen,
  Clock,
  Star,
  TrendingUp,
  Plus,
  MoreHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Flashcard } from '@/lib/api/types';

export const DeckList = () => {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [filteredCards, setFilteredCards] = useState<Flashcard[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load flashcards on mount
  useEffect(() => {
    loadFlashcards();
  }, []);

  // Filter flashcards based on search and tag
  useEffect(() => {
    let filtered = flashcards;

    if (searchQuery) {
      filtered = filtered.filter(
        (card) =>
          card.front.toLowerCase().includes(searchQuery.toLowerCase()) ||
          card.back.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedTag) {
      filtered = filtered.filter((card) => card.tags?.includes(selectedTag));
    }

    setFilteredCards(filtered);
  }, [flashcards, searchQuery, selectedTag]);

  const loadFlashcards = async () => {
    try {
      setIsLoading(true);
      const cards = await fetchFlashcards('demo-session');
      setFlashcards(cards);
    } catch (error) {
      console.error('Failed to load flashcards:', error);
      toast.error('Failed to load flashcards');
    } finally {
      setIsLoading(false);
    }
  };

  const getUniqueTags = () => {
    const tags = new Set<string>();
    flashcards.forEach((card) => {
      card.tags?.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'text-green-600 bg-green-100 dark:bg-green-900';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900';
      case 'hard':
        return 'text-red-600 bg-red-100 dark:bg-red-900';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900';
    }
  };

  const getReviewStatus = (card: Flashcard) => {
    if (card.reviewCount === 0) return 'New';
    if (card.nextReview && new Date(card.nextReview) > new Date())
      return 'Scheduled';
    return 'Due';
  };

  const getReviewColor = (card: Flashcard) => {
    const status = getReviewStatus(card);
    switch (status) {
      case 'New':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900';
      case 'Scheduled':
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900';
      case 'Due':
        return 'text-orange-600 bg-orange-100 dark:bg-orange-900';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading flashcards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Flashcard Decks</h2>
          <p className="text-sm text-muted-foreground">
            {filteredCards.length} of {flashcards.length} cards
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Deck
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search flashcards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="flex gap-1">
            <Button
              variant={selectedTag === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTag(null)}
            >
              All
            </Button>
            {getUniqueTags().map((tag) => (
              <Button
                key={tag}
                variant={selectedTag === tag ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              >
                {tag}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Cards List */}
      <ScrollArea className="flex-1">
        <div className="space-y-3">
          {filteredCards.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No flashcards found</p>
              <p className="text-xs">
                {searchQuery || selectedTag
                  ? 'Try adjusting your search or filter'
                  : 'Create your first flashcard deck'}
              </p>
            </div>
          ) : (
            filteredCards.map((card) => (
              <Card key={card.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm line-clamp-2 mb-2">
                        {card.front}
                      </CardTitle>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`text-xs ${getDifficultyColor(card.difficulty)}`}
                        >
                          {card.difficulty}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-xs ${getReviewColor(card)}`}
                        >
                          {getReviewStatus(card)}
                        </Badge>
                        {card.tags?.map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {card.back}
                    </p>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{card.reviewCount} reviews</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          <span>{card.correctCount} correct</span>
                        </div>
                      </div>

                      {card.nextReview && (
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          <span>
                            {new Date(card.nextReview).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
