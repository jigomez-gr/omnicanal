# Guía Paso a Paso: Dominio Hostinger, Bot de Telegram, Instagram, Facebook y Meta Business para «Soniquete con Arte»

Esta guía detalla cómo dar de alta desde cero todas las cuentas oficiales de **Soniquete con Arte · Promoción Flamenca** y conectarlas con esta plataforma.

---

## 1. ¿Es mejor `soniqueteflamenco.com` o `soniqueteflamenco.es`? (Y configuración en Hostinger)

### Recomendación profesional
- **Dominio principal recomendado: `soniqueteflamenco.com`**.
  - **Por qué**: El flamenco tiene una proyección internacional enorme (festivales y salas en Francia, Japón, EE. UU., Reino Unido, Latinoamérica y turistas internacionales que buscan espectáculos en Madrid). Además, `.com` transmite categoría de agencia global.
- **Compra también `soniqueteflamenco.es` (cuesta unos pocos euros al año en Hostinger) y redirígelo automáticamente a `soniqueteflamenco.com`**.
  - **Por qué**: Así proteges tu marca en España para que nadie registre el `.es` y, además, cualquier ayuntamiento, diputación o ateneo español que escriba `.es` entrará directamente a tu web.

### Cómo crear el dominio y el buzón `soniqueteflamenco@soniqueteflamenco.com` en Hostinger
1. Entra en [Hostinger](https://www.hostinger.es) → **Dominios** → registra `soniqueteflamenco.com` (y opcionalmente `soniqueteflamenco.es`).
2. Ve a **Emails** en el panel hPanel de Hostinger → selecciona `soniqueteflamenco.com` → **Crear cuenta de email**:
   - Dirección: `soniqueteflamenco@soniqueteflamenco.com`
   - Contraseña: crea una contraseña segura y guárdala.
3. En la sección **Configuración de DNS / Verificación de correo** de Hostinger, activa con un clic los registros **SPF, DKIM y DMARC** (Hostinger tiene un botón automático para añadirlos). Esto es fundamental para que cuando envíes ofertas de conciertos a salas y ayuntamientos desde el módulo **Envíos**, tus correos nunca caigan en Spam.
4. Para conectarlo en esta plataforma:
   - Entra en **Canales › Conectar canal › Correo (Otro por IMAP/SMTP)** o en **Ajustes › Correo del sistema**:
   - **Servidor IMAP (entrada)**: `imap.hostinger.com` · Puerto `993` (SSL/TLS)
   - **Servidor SMTP (salida)**: `smtp.hostinger.com` · Puerto `465` (SSL/TLS) o `587` (STARTTLS)
   - **Usuario**: `soniqueteflamenco@soniqueteflamenco.com`
   - **Contraseña**: la contraseña de ese buzón.

---

## 2. Cómo crear el Bot de Telegram `soniqueteflamencoMadrid` y obtener su Token

Telegram permite operar de forma inmediata y gratuita con tu propio bot oficial para atender a programadores de salas, enviarles el pack de vídeos `.mp4` y lanzar campañas desde el módulo **Envíos**.

### Paso a paso en Telegram (`@BotFather`)
1. Abre tu aplicación de Telegram (en el móvil o en el ordenador) y busca en la lupa superior a **`@BotFather`** (fíjate en que tenga la insignia azul de verificado).
2. Pulsa **Iniciar** (`/start`) y envía el comando:
   ```text
   /newbot
   ```
3. **Nombre visible del bot**: cuando `@BotFather` te pregunte cómo se llamará tu bot, responde:
   ```text
   Soniquete con Arte · Flamenco Madrid
   ```
4. **Nombre de usuario (username) del bot**: `@BotFather` te pedirá un nombre de usuario único que **debe terminar en `bot`**. Escribe por ejemplo:
   ```text
   soniqueteflamencoMadrid_bot
   ```
   *(Nota: Telegram exige por norma técnica que el username técnico termine en `bot` o `_bot`, mientras que el nombre público visible sí es «Soniquete con Arte · Flamenco Madrid»).*
5. **Copia tu Token HTTP API**: `@BotFather` te responderá con un mensaje que dice:
   `Use this token to access the HTTP API:` seguido de un código como `7123456789:AAH...`.
6. *(Opcional pero recomendado)* Configura la descripción y foto del bot enviando a `@BotFather`:
   - `/setdescription` → *"Agencia de Promoción Profesional de Intérpretes y Conciertos de Flamenco en Madrid · soniqueteflamenco.com"*
   - `/setuserpic` → Sube el logotipo de Soniquete con Arte.

### Cómo poner el Token en la plataforma (o pasármelo)
- **Desde la pantalla de la app**:
  1. Ve al menú lateral izquierdo → **Canales** (`/canales`).
  2. Pulsa **Conectar canal** → elige **Telegram**.
  3. Pega el **Token** que te dio `@BotFather`, elige el agente activo y pulsa **Conectar**. La plataforma registra automáticamente el webhook seguro con firma `X-Telegram-Bot-Api-Secret-Token`.
- **O si prefieres que lo deje conectado yo**: pásame el token o ponlo en `.env.local` y lo vinculamos al instante.

---

## 3. Cómo crear desde cero Facebook, Instagram Profesional y Meta Business (WhatsApp + Instagram)

Para que **Instagram** y **WhatsApp Oficial** funcionen con agentes IA y puedas publicar los **Reels (pieza 7 · 58 s)** y **Posts 4:5 (pieza 9)** sin bloqueos, debes crearlos en este orden exacto usando tu nuevo correo `soniqueteflamenco@soniqueteflamenco.com`:

### Paso 3.1: Crear la Página de Facebook de la Agencia
1. Entra en [facebook.com](https://www.facebook.com) con tu cuenta personal de administrador (Meta exige que una Página cuelgue de una persona real por seguridad, aunque el público nunca verá tu perfil personal).
2. En el menú izquierdo, haz clic en **Páginas** → **Crear nueva página**.
3. Configura:
   - **Nombre de la página**: `Soniquete con Arte · Promoción Flamenca`
   - **Categoría**: `Agencia artística` / `Promotor musical` / `Artes escénicas`
   - **Presentación**: *"Promoción profesional de intérpretes de flamenco, producción de conciertos para salas, tablaos, ateneos y ayuntamientos. soniqueteflamenco.com"*
4. En los datos de contacto de la página pon:
   - Web: `https://soniqueteflamenco.com`
   - Correo: `soniqueteflamenco@soniqueteflamenco.com`

### Paso 3.2: Crear la Cuenta Profesional de Instagram (`@soniqueteflamenco`)
1. Abre Instagram o entra en [instagram.com](https://www.instagram.com) y pulsa **Registrarse** usando el correo `soniqueteflamenco@soniqueteflamenco.com`.
2. Nombre de usuario recomendado: **`@soniqueteflamenco`** (o `@soniqueteflamenco`).
3. Una vez dentro de la cuenta, conviértela en cuenta **Profesional** (es gratuito e imprescindible para la API de agentes IA):
   - Ve a **Configuración y actividad** → **Tipo de cuenta y herramientas** → **Cambiar a cuenta profesional**.
   - Elige **Empresa (Business)** (o **Creador**) y categoría **Artista / Agencia de talentos / Música**.
4. **Vincúlala a tu Página de Facebook**:
   - En la misma sección de Instagram o desde Facebook (**Configuración de la página › Cuentas vinculadas › Instagram**), pulsa **Conectar cuenta** e inicia sesión con `@soniqueteflamenco`.

### Paso 3.3: Crear el Portfolio Empresarial en Meta Business Suite (`business.facebook.com`)
1. Entra en [business.facebook.com/overview](https://business.facebook.com/overview) y pulsa **Crear una cuenta**.
2. Datos:
   - **Nombre del negocio**: `Soniquete con Arte`
   - **Tu nombre** y **Correo empresarial**: `soniqueteflamenco@soniqueteflamenco.com`
3. Confirma el enlace que te llegará al buzón `soniqueteflamenco@soniqueteflamenco.com`.
4. Dentro de **Configuración del negocio** (`business.facebook.com/settings`):
   - En **Cuentas › Páginas**, verifica que aparece `Soniquete con Arte · Promoción Flamenca`.
   - En **Cuentas › Cuentas de Instagram**, verifica que aparece `@soniqueteflamenco`.
   - En **Cuentas › Cuentas de WhatsApp**, añade el número de WhatsApp de la agencia.

### Paso 3.4: Crear la App en Meta Developers (`developers.facebook.com`) para conectar la IA
1. Entra en [developers.facebook.com/apps](https://developers.facebook.com/apps) → **Crear app**.
2. Elige **Otro** → tipo **Empresa (Business)** → asígnala al portfolio **Soniquete con Arte**.
3. Añade los productos **WhatsApp** e **Instagram**:
   - En **Configuración de la app › Básica**, copia el **Identificador de la app (App ID)** y la **Clave secreta de la app (App Secret)**.
   - En **business.facebook.com/settings › Usuarios › Usuarios del sistema**, crea un usuario `Agente Soniquete` con rol **Administrador**, asígnale la App, el número de WhatsApp y la cuenta de Instagram, y pulsa **Generar nuevo token** (sin caducidad, marcando `whatsapp_business_messaging`, `whatsapp_business_management`, `instagram_business_basic` e `instagram_business_manage_messages`).
4. Por último, entra en esta plataforma → **Canales** (`/canales`) → **Conectar WhatsApp** y **Conectar Instagram**, y pega el Token y el App Secret.
