# Budgetracker Koin

Koin je moderní webová aplikace pro správu osobních financí. Nabízí přehledný dashboard, sledování transakcí, správu trvalých příkazů a chytrého AI asistenta, který pomáhá s rozpočtem a automatickou kategorizací výdajů. 

Projekt je postaven na moderním stacku **Next.js, React, TailwindCSS, Framer Motion a Supabase**.

##  Jak spustit projekt lokálně

K úspěšnému spuštění vývojového prostředí na tvém počítači, verifikuj tyto požadavky:

### 1. Požadavky
Než začneš, ujisti se, že máš nainstalované následující nástroje:
* [Node.js](https://nodejs.org/) (doporučena verze 20 a novější)
* [Git](https://git-scm.com/)
* Účet na [Supabase](https://supabase.com/) (pro databázi a autentizaci)
* Účet na [OpenAI](https://openai.com/) (pro AI funkce a kategorizaci)

### 2. Klonování repozitáře
Otevři si terminál a stáhni si projekt k sobě do složky:

```bash
git clone [https://gitlab.com/FIS-VSE/4IT115/20261LS/ut1245/veps00/budgetracker.git](https://gitlab.com/FIS-VSE/4IT115/20261LS/ut1245/veps00/budgetracker.git)
cd budgetracker
```

### 3. Instalace závislostí
Nainstaluj všechny potřebné balíčky pomocí npm:
```bash
npm install
```
 ### 4. Nastavení proměnných prostředí
NEXT_PUBLIC_SUPABASE_URL=[https://tvoje-supabase-url.supabase.co](https://tvoje-supabase-url.supabase.co)
NEXT_PUBLIC_SUPABASE_ANON_KEY=tvuj-dlouhy-anon-key


OPENAI_API_KEY=tvuj-openai-tajny-klic
OPENAI_MODEL=gpt-4o-mini

### 5. Spuštění vývojového serveru
Jakmile je vše nastaveno, aplikaci lze spustit ve vývojovém (development) režimu:

```bash
npm run dev
```
