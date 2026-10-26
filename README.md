# 🚀 Plannex: Plataforma Web + Móvil + Backend (Supabase)

**Plannex** es una aplicación diseñada para **pagar de una**, mantener la **planificación de gastos y compromisos** y llevar un **registro histórico detallado** de todos tus pagos.

---

## 📁 Estructura del Proyecto

```text
fullstack-app/
├── apps/
│   ├── web/                     # 🌐 Aplicación Web con Next.js 15 (App Router, Tailwind CSS)
│   └── mobile/                  # 📱 Aplicación Móvil con Expo / React Native
│
├── packages/
│   ├── supabase/                # 🔗 Cliente y tipos compartidos de Supabase en TypeScript
│   └── tsconfig/                # ⚙️ Configuraciones base de TypeScript
│
├── supabase/
│   ├── migrations/              # 🗄️ Esquema SQL de la base de datos (tablas, RLS, triggers)
│   └── config.toml              # 🛠️ Configuración de Supabase CLI
│
├── turbo.json                   # ⚡ Pipeline de Turborepo
├── package.json                 # 📦 Configuración de Workspaces y scripts raíz
└── .env.example                 # 🔐 Plantilla de variables de entorno
```

---

## ⚡ Paso 1: Configurar Supabase

1. Ve a [supabase.com](https://supabase.com) y crea un nuevo proyecto (es gratuito).
2. Entra en el panel de tu proyecto y ve a **SQL Editor**.
3. Copia el contenido del archivo [`supabase/migrations/20261026000000_initial_schema.sql`](./supabase/migrations/20261026000000_initial_schema.sql) y ejecútalo (**Run**).
   - Esto creará la tabla `profiles`.
   - Activará las políticas de seguridad **Row Level Security (RLS)**.
   - Configurará un trigger automático para que cada usuario registrado tenga su perfil vinculado.
4. Dirígete a **Project Settings** -> **API** y copia tu:
   - **Project URL**
   - **anon / public key**

---

## 🔐 Paso 2: Configurar Variables de Entorno

Copia los archivos de ejemplo y añade tus credenciales:

### En la Web (`apps/web`):
Crea un archivo `.env.local` dentro de `apps/web/`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

### En la App Móvil (`apps/mobile`):
Crea un archivo `.env` dentro de `apps/mobile/`:
```bash
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

---

## 📦 Paso 3: Instalar Dependencias

Abre la terminal en la raíz del proyecto y ejecuta:

```bash
npm install
```

---

## 🚀 Paso 4: Ejecutar el Proyecto

Puedes ejecutar ambos proyectos juntos o de forma individual:

### Ejecutar todo a la vez (Web + Móvil):
```bash
npm run dev
```

### Ejecutar solo la Web (Next.js):
```bash
npm run dev:web
```
Abre en tu navegador: [http://localhost:3000](http://localhost:3000)

### Ejecutar solo la App Móvil (Expo):
```bash
npm run dev:mobile
```
- Presiona `i` para abrir el simulador de iOS.
- Presiona `a` para abrir el emulador de Android.
- O escanea el código QR con la app **Expo Go** en tu teléfono físico.

---

## 🔄 Tipos de TypeScript Compartidos

Si modificas el esquema en Supabase, puedes sincronizar los tipos de TypeScript ejecutando:
```bash
cd packages/supabase
npx supabase gen types typescript --project-id tu-project-id > src/types.ts
```
Tanto la Web como la App Móvil actualizarán inmediatamente el autocompletado y validación de tipos sin duplicar código.
