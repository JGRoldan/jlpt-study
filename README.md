# JLPT Study App

Web app para estudiar japonés JLPT (N5/N4) con flashcards, espaciado SM-2, y audio.

## Características

- **Flashcards** con animación 3D
- **Espaciado SM-2** para revisión eficiente
- **Audio** con Web Speech API
- **Vocabulario** y **Kanjis** por nivel (N5/N4)
- **Estadísticas** de progreso
- **Diseño mobile-first**

## Tech Stack

- Next.js 16 + TypeScript
- TailwindCSS + shadcn/ui
- Supabase (database)
- Web Speech API (audio)
- Cerebras / OpenRouter (generación de contenido)

## Getting Started

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Edita .env.local con tus credenciales

# Ejecutar desarrollo
npm run dev
```

## Variables de Entorno

```env
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
CEREBRAS_API_KEY=tu_cerebras_key
OPENROUTER_API_KEY=tu_openrouter_key
```

## Despliegue

Desplegar en Vercel:

1. Fork o importa el repo en vercel.com
2. Agrega las Environment Variables en Vercel
3. Deploy automático en cada push a main

## Licencia

MIT License - ver [LICENSE](LICENSE)