// src/App.tsx
import { Mistral } from '@mistralai/mistralai'; // Importieren des Mistral AI SDK [1, 2]
import { useState, useEffect } from 'react';
import './global.css'; // Importieren Ihrer globalen CSS-Datei

// Initialisieren Sie den Mistral AI Client aus einer Umgebungsvariablen [1, 2]
// VITE_MISTRAL_API_KEY wird von Vite automatisch als Umgebungsvariable erkannt, wenn es mit VITE_ beginnt.
// Es ist eine Best Practice, API-Schlüssel nicht direkt im Client-seitigen Code zu hardcodieren [1, 2].
const mistralApiKey = import.meta.env.VITE_MISTRAL_API_KEY;

// Der Mistral Client wird mit dem API-Schlüssel initialisiert [1, 2].
const client = new Mistral({ apiKey: mistralApiKey });

function App() {
  // useState Hook, um die Antwort des Mistral AI Models zu speichern [3]
  const [response, setResponse] = useState<string>('');

  // useEffect Hook, um die Mistral AI Verbindung beim Laden der Komponente zu testen
  useEffect(() => {
    const testMistralConnection = async () => {
      // Überprüfung, ob der API-Schlüssel gesetzt ist
      if (!mistralApiKey) {
        console.error("Mistral API Key ist nicht gesetzt. Bitte fügen Sie ihn in eine .env Datei ein (z.B. VITE_MISTRAL_API_KEY=...).");
        setResponse("Fehler: API-Schlüssel fehlt. Bitte prüfen Sie Ihre .env-Datei.");
        return;
      }

      try {
        // Ein einfacher Chat-Vervollständigungsaufruf, um die API zu testen [1, 4, 5]
        // Wir verwenden hier 'mistral-tiny' als Beispielmodell [6], da es kostengünstig ist.
        // Die Mistral AI API akzeptiert eine Liste von Chat-Nachrichten als Eingabe [5].
        const chatResponse = await client.chat.complete({
          model: 'mistral-tiny', // Beispielmodell, kann später angepasst werden [6]
          messages: [{ role: 'user', content: 'Wer bist du?' }], // Beispielanfrage
        });

        // Extrahieren der Antwort aus dem Chat-Response-Objekt [4, 6]
        setResponse(`Mistral AI Antwort: "${chatResponse.choices.message.content}"`);
      } catch (error) {
        console.error("Fehler bei der Mistral API-Verbindung:", error);
        setResponse("Fehler bei der Mistral AI API-Verbindung. Überprüfen Sie Ihre Konsole für Details und stellen Sie sicher, dass Ihr API-Schlüssel gültig ist.");
      }
    };

    testMistralConnection();
  }, []); // Das leere Array [] bedeutet, dass dieser Effekt nur einmal nach dem initialen Render ausgeführt wird.

  return (
    <div className="app-container">
      <h1>Mistral RAG AI Chatbot</h1>
      <p>Willkommen zu Ihrer AI-Chat-Anwendung.</p>
      <p>Status der Mistral AI Verbindung: <strong>{response}</strong></p>
      {/* Hier werden später die Chatbot-Komponenten hinzugefügt, wie Eingabefelder und Anzeigen für den Chatverlauf */}
    </div>
  );
}

export default App;