class RAGChatService {
  private mistralClient: Mistral;
  private knowledgeBase: KnowledgeBaseService;

  async chatWithRAG(userQuery: string, conversationHistory: ChatMessage[]): Promise<string> {
    // 1. Search relevant documents
    const relevantDocs = await this.knowledgeBase.search(userQuery, 3);
    
    // 2. Create context from retrieved documents
    const context = relevantDocs
      .map(doc => `**${doc.title}**:\n${doc.content}`)
      .join('\n\n---\n\n');

    // 3. Create enhanced prompt
    const systemPrompt = `Du bist ein hilfreicher AI-Assistent. Nutze die folgenden Informationen aus der Knowledge-Base, um präzise und hilfreiche Antworten zu geben:

KNOWLEDGE BASE:
${context}

Anweisungen:
- Beantworte Fragen basierend auf den bereitgestellten Informationen
- Wenn keine relevanten Infos vorhanden sind, sage das ehrlich
- Zitiere die Quelle wenn möglich
- Sei präzise und hilfreich`;

    // 4. Create conversation with context
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: userQuery }
    ];

    // 5. Get Mistral response
    const response = await this.mistralClient.chat.complete({
      model: 'mistral-small',
      messages,
      maxTokens: 500,
      temperature: 0.7,
    });

    return response.choices[0].message.content;
  }
}