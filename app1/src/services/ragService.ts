// src/services/ragService.ts
import { Mistral } from '@mistralai/mistralai';

// Types for RAG system
export interface Document {
  id: string;
  title: string;
  content: string;
  embedding?: number[];
  metadata: {
    source: 'website' | 'upload' | 'manual';
    createdAt: Date;
    url?: string;
    fileType?: string;
  };
}

export interface SearchResult {
  document: Document;
  similarity: number;
  relevantChunk: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: Document[];
}

// Simple embedding service using text similarity (production: use proper embeddings)
class SimpleEmbeddingService {
  // Simple keyword-based similarity for demo (replace with real embeddings later)
  calculateSimilarity(query: string, document: Document): number {
    const queryWords = this.tokenize(query.toLowerCase());
    const docWords = this.tokenize(document.content.toLowerCase());
    
    let matches = 0;
    queryWords.forEach(word => {
      if (docWords.includes(word)) {
        matches++;
      }
    });
    
    return queryWords.length > 0 ? matches / queryWords.length : 0;
  }

  private tokenize(text: string): string[] {
    return text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
  }

  searchRelevantChunk(query: string, content: string): string {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const queryWords = this.tokenize(query.toLowerCase());
    
    let bestSentence = '';
    let bestScore = 0;
    
    sentences.forEach(sentence => {
      const sentenceWords = this.tokenize(sentence.toLowerCase());
      let score = 0;
      
      queryWords.forEach(word => {
        if (sentenceWords.some(sw => sw.includes(word) || word.includes(sw))) {
          score++;
        }
      });
      
      if (score > bestScore) {
        bestScore = score;
        bestSentence = sentence.trim();
      }
    });
    
    return bestSentence || content.substring(0, 200) + '...';
  }
}

// Knowledge Base Service
export class KnowledgeBaseService {
  private documents: Document[] = [];
  private embeddingService: SimpleEmbeddingService;

  constructor() {
    this.embeddingService = new SimpleEmbeddingService();
    this.loadFromStorage();
    this.initializeDefaultKnowledge();
  }

  private initializeDefaultKnowledge() {
    // Add some default knowledge about common topics
    if (this.documents.length === 0) {
      this.addDocument(
        'Mistral AI Information',
        `Mistral AI ist ein französisches KI-Unternehmen, das sich auf die Entwicklung von Large Language Models spezialisiert hat. 
        Die Firma wurde 2023 gegründet und bietet verschiedene Modelle wie Mistral 7B, Mistral 8x7B und Mistral Large an. 
        Mistral AI legt großen Wert auf offene und verantwortungsvolle KI-Entwicklung. 
        Die Modelle sind für verschiedene Anwendungen optimiert, von Textgenerierung bis hin zu Code-Assistenz.`,
        { source: 'manual' }
      );

      this.addDocument(
        'RAG (Retrieval-Augmented Generation)',
        `RAG ist eine Technik, die Large Language Models mit externen Wissensdatenbanken kombiniert. 
        Dabei wird zuerst relevante Information aus einer Datenbank abgerufen und dann vom Sprachmodell zur Antwortgenerierung verwendet. 
        Dies ermöglicht es, aktuelle und spezifische Informationen in die Antworten einzubeziehen, ohne das Modell neu zu trainieren. 
        RAG verbessert die Faktentreue und reduziert Halluzinationen bei AI-Systemen.`,
        { source: 'manual' }
      );

      this.addDocument(
        'Chatbot Development',
        `Ein Chatbot ist ein Computerprogramm, das menschliche Konversation simuliert. 
        Moderne Chatbots nutzen Natural Language Processing und Machine Learning. 
        Sie können in Customer Service, E-Commerce, Bildung und vielen anderen Bereichen eingesetzt werden. 
        Wichtige Komponenten sind: Intent Recognition, Entity Extraction, Dialog Management und Response Generation.`,
        { source: 'manual' }
      );
    }
  }

  async addDocument(title: string, content: string, metadata: Partial<Document['metadata']>): Promise<string> {
    const id = this.generateId();
    
    const document: Document = {
      id,
      title,
      content: content.trim(),
      metadata: {
        source: 'manual',
        createdAt: new Date(),
        ...metadata
      }
    };

    this.documents.push(document);
    this.saveToStorage();
    return id;
  }

  async addWebsiteContent(url: string, title: string, content: string): Promise<string> {
    return this.addDocument(title, content, {
      source: 'website',
      url: url
    });
  }

  async search(query: string, topK = 3): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    this.documents.forEach(doc => {
      const similarity = this.embeddingService.calculateSimilarity(query, doc);
      if (similarity > 0.1) { // Minimum threshold
        const relevantChunk = this.embeddingService.searchRelevantChunk(query, doc.content);
        results.push({
          document: doc,
          similarity,
          relevantChunk
        });
      }
    });

    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  getAllDocuments(): Document[] {
    return [...this.documents];
  }

  removeDocument(id: string): boolean {
    const index = this.documents.findIndex(doc => doc.id === id);
    if (index !== -1) {
      this.documents.splice(index, 1);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private saveToStorage() {
    try {
      const data = JSON.stringify(this.documents.map(doc => ({
        ...doc,
        metadata: {
          ...doc.metadata,
          createdAt: doc.metadata.createdAt.toISOString()
        }
      })));
      localStorage.setItem('mistral_knowledge_base', data);
    } catch (error) {
      console.warn('Could not save knowledge base to storage:', error);
    }
  }

  private loadFromStorage() {
    try {
      const data = localStorage.getItem('mistral_knowledge_base');
      if (data) {
        const parsed = JSON.parse(data);
        this.documents = parsed.map((doc: Document) => ({
          ...doc,
          metadata: {
            ...doc.metadata,
            createdAt: new Date(doc.metadata.createdAt)
          }
        }));
      }
    } catch (error) {
      console.warn('Could not load knowledge base from storage:', error);
      this.documents = [];
    }
  }
}

// Enhanced RAG Chat Service
export class RAGChatService {
  private mistralClient: Mistral;
  private knowledgeBase: KnowledgeBaseService;

  constructor(apiKey: string) {
    this.mistralClient = new Mistral({ apiKey });
    this.knowledgeBase = new KnowledgeBaseService();
  }

  getKnowledgeBase(): KnowledgeBaseService {
    return this.knowledgeBase;
  }

  async chatWithRAG(
    userQuery: string, 
    conversationHistory: ChatMessage[] = []
  ): Promise<{
    response: string;
    sources: Document[];
  }> {
    try {
      // 1. Search for relevant documents
      const searchResults = await this.knowledgeBase.search(userQuery, 3);
      
      // 2. Create context from retrieved documents
      let context = '';
      const sources: Document[] = [];
      
      if (searchResults.length > 0) {
        context = searchResults
          .map((result, index) => {
            sources.push(result.document);
            return `[Quelle ${index + 1}] ${result.document.title}:\n${result.relevantChunk}`;
          })
          .join('\n\n');
      }

      // 3. Create enhanced prompt
      const systemPrompt = `Du bist ein hilfreicher AI-Assistent. ${context ? 
        `Nutze die folgenden Informationen aus der Knowledge-Base, um präzise Antworten zu geben:\n\n${context}\n\nAnweisungen:` : 'Anweisungen:'
      }
- Beantworte Fragen basierend auf deinem Wissen${context ? ' und den bereitgestellten Informationen' : ''}
- Wenn du Informationen aus der Knowledge-Base verwendest, erwähne die entsprechende Quelle
- Sei präzise, hilfreich und höflich
- Wenn du dir bei etwas unsicher bist, sage das ehrlich`;

      // 4. Prepare conversation messages
      const messages: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [
        { role: 'system', content: systemPrompt }
      ];

      // Add recent conversation history (last 6 messages to stay within token limits)
      const recentHistory = conversationHistory.slice(-6);
      recentHistory.forEach(msg => {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      });

      // Add current user query
      messages.push({ role: 'user', content: userQuery });

      // 5. Get Mistral response
      const response = await this.mistralClient.chat.complete({
        model: 'mistral-small',
        messages,
        maxTokens: 1000,
        temperature: 0.7,
      });

      const assistantResponse = response.choices?.[0]?.message?.content || 
        'Entschuldigung, ich konnte keine Antwort generieren.';

      return {
        response: assistantResponse,
        sources: sources
      };

    } catch (error) {
      console.error('RAG Chat error:', error);
      return {
        response: 'Entschuldigung, es gab einen Fehler bei der Verarbeitung Ihrer Anfrage. Bitte versuchen Sie es erneut.',
        sources: []
      };
    }
  }

  // Method to add website content
  async addWebsiteContent(url: string): Promise<string> {
    try {
      // Simple website content extraction (in production, use proper scraping)
      const response = await fetch(url);
      const html = await response.text();
      
      // Extract title
      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : url;
      
      // Simple content extraction (remove HTML tags)
      const content = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (content.length > 100) {
        return await this.knowledgeBase.addWebsiteContent(url, title, content);
      } else {
        throw new Error('Could not extract meaningful content from website');
      }
    } catch (error) {
      console.error('Website scraping error:', error);
      throw error;
    }
  }

  // Method to add file content
  async addFileContent(file: File): Promise<string> {
    try {
      let content = '';
      
      if (file.type === 'text/plain') {
        content = await file.text();
      } else if (file.type === 'application/json') {
        const json = JSON.parse(await file.text());
        content = JSON.stringify(json, null, 2);
      } else {
        throw new Error(`Unsupported file type: ${file.type}`);
      }

      return await this.knowledgeBase.addDocument(
        file.name,
        content,
        {
          source: 'upload',
          fileType: file.type
        }
      );
    } catch (error) {
      console.error('File processing error:', error);
      throw error;
    }
  }
}