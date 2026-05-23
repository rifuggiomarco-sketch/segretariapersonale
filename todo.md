# Segretaria Personale AI - TODO

## Database & Schema
- [x] Configurare schema Drizzle per briefing, email, calendario, note
- [x] Creare tabelle: briefings, emails, calendar_events, user_notes, sync_logs
- [x] Applicare migrazioni SQL al database

## Backend - Google Integration
- [x] Implementare Google OAuth flow per Gmail e Calendar
- [x] Creare procedura di sincronizzazione Gmail (lettura email rilevanti)
- [x] Creare procedura di sincronizzazione Google Calendar (eventi 7 giorni)
- [x] Salvare email e eventi nel database

## Backend - AI & Briefing Generation
- [x] Implementare procedura generazione briefing con Claude
- [x] Strutturare output con sezioni: Panoramica, Agenda, Timeline, Azioni, Documenti, Segnalazioni
- [x] Salvare briefing generato nel database
- [x] Implementare endpoint per recuperare storico briefing

## Backend - Automazione
- [x] Configurare Heartbeat job per controllo periodico (mattina presto)
- [x] Implementare logica di sincronizzazione automatica email/calendario
- [x] Implementare notifica mattutina al proprietario
- [x] Gestire errori e retry per sincronizzazioni fallite

## Frontend - Dashboard & Layout
- [x] Implementare layout dark (#0a0a0a) con accenti gold (#e8c547)
- [x] Configurare font Bebas Neue + DM Sans
- [x] Creare header con titolo "MARCO AGENDA"
- [x] Implementare date bar con data odierna
- [x] Creare layout responsive fedele al prototipo

## Frontend - Interfaccia Principale
- [x] Visualizzare stato sincronizzazione email/calendario
- [x] Implementare campo note manuali (textarea)
- [x] Creare pulsante "GENERA BRIEFING"
- [x] Implementare loading state con step indicator
- [x] Visualizzare briefing generato con rendering markdown

## Frontend - Storico Briefing
- [x] Creare pagina/sezione storico briefing (sezione STORICO BRIEFING nella dashboard)
- [x] Implementare lista briefing generati con date (query getHistory recupera storico)
- [x] Permettere visualizzazione briefing precedenti (selezione da lista storico)
- [x] Implementare refresh/rigenerazione briefing (pulsante AGGIORNA BRIEFING)

## Frontend - Autenticazione
- [x] Implementare login OAuth
- [x] Mostrare stato utente autenticato
- [x] Implementare logout
- [x] Proteggere rotte autenticate

## Frontend - Google Auth
- [x] Creare componente GoogleAuthButton
- [x] Implementare procedura OAuth callback
- [x] Mostrare stato connessione Google
- [x] Salvare token Google nel database

## Testing & Validazione
- [x] Scrivere test Vitest per generazione briefing
- [x] Scrivere test Vitest per sincronizzazione email
- [x] Scrivere test Vitest per sincronizzazione calendario
- [x] Testare flow completo end-to-end
- [x] Validare rendering markdown briefing

## Deployment & Finali
- [x] Configurare variabili ambiente (Google API keys, Claude API)
- [x] Testare automazione in produzione
- [x] Verificare notifiche mattutine
- [x] Creare checkpoint finale

## Nuove Feature - Gestione Note Avanzata

- [x] Visualizzare lista note salvate con data e contenuto (pagina SavedNotes)
- [x] Creare parser per riconoscere data/orario nelle note (es: "domani 14:00", "lunedì 10:30")
- [x] Creare evento Google Calendar automaticamente se nota contiene data/orario
- [x] Allegare nota a evento Google Calendar esistente se riconosciuto
- [x] Mostrare preview evento creato prima di salvare (componente NotePreview)
- [x] Permettere modifica/cancellazione note salvate (tramite pagina SavedNotes)

## Google OAuth & Integrations
- [x] Risolvere redirect_uri_mismatch (verificare dominio esatto in uso)
- [x] Flusso Google OAuth implementato (login Manus -> Connetti Google -> Autorizza)
- [x] GOOGLE_OAUTH_REDIRECT_URI verificato e aggiornato
- [ ] Testare sincronizzazione Gmail e Google Calendar

## Weekly Shifts Feature
- [x] Completare integrazione ShiftsSection nel Dashboard
- [x] Aggiungere procedure tRPC per upload file e estrazione turni
- [x] Implementare zoom settimana singola
- [x] Testare estrazione turni da Excel/PDF/Screenshot

## Stripe & Freemium Model
- [ ] Implementare pagina pricing con piani Free/Premium
- [ ] Creare checkout Stripe per abbonamenti ricorrenti
- [ ] Configurare webhook per gestire pagamenti
- [ ] Aggiungere limitazioni per utenti Free (1 briefing/giorno)
- [ ] Implementare dashboard gestione abbonamenti

## Testing & Deployment Finali
- [ ] Testare flusso completo end-to-end
- [ ] Verificare notifiche Heartbeat mattutine
- [ ] Salvare checkpoint finale
