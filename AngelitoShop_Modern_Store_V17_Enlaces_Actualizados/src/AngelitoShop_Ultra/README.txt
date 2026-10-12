ANGELITO SHOP — ULTRA IMMERSIVE V3
===================================

Esta versión usa el video entregado por el cliente como intro local y una experiencia visual más luminosa, densa e interactiva.

CAMBIOS PRINCIPALES
- Intro cinematográfico con assets/intro.mp4.
- El texto principal aparece después de aproximadamente 5 segundos del video.
- Logo recortado como círculo real: assets/logo-circle.png.
- Botón “Iniciar este catálogo” con transición cinematográfica hacia el login.
- Login con correo, contraseña, Google, registro y autocompletado del navegador.
- En modo demo, una cuenta debe registrarse antes de poder iniciar sesión; una cuenta no registrada muestra un aviso para crearla.
- Pantalla de “Cargando tu catálogo” durante unos segundos antes de entrar a la tienda.
- Inicio con producto destacado, botones circulares de Perfumes / Beauty / Care / Explorar.
- Carrusel de fragancias con producto central, laterales opacos, perspectiva, desenfoque, flechas y swipe.
- Las imágenes del carrusel fueron tratadas para integrar mejor los productos sobre fondos transparentes.
- Viewer de producto con giro automático, control manual con dedo/mouse, zoom y reflejo.
- Enlace individual por producto mediante #product=ID y botón “Copiar enlace”.
- WhatsApp prepara el nombre del producto + enlace directo del producto.
- Buscador, filtros, favoritos, selección de productos, rails, categorías y ubicación.
- Estimación de entrega informativa calculada dinámicamente en días hábiles.
- Panel administrativo reservado a maluvasa12@gmail.com cuando Firebase Authentication está conectado.
- Firestore para usuarios y actividad cuando Firebase está configurado.

PERFUMES / FRAGANCIAS
La galería principal usa las fragancias identificadas en las imágenes del PDF y excluye de la galería principal varios artículos claramente pertenecientes a cuidado/cabello.

DATOS DE PERFUMERÍA
Las descripciones de fragancias conocidas se ampliaron con información pública de L’Bel/Cyzone y fuentes de producto. Para productos cuyo nombre no pudo verificarse de forma concluyente a partir de la imagen, se mantiene una descripción visual/conservadora y se evita inventar notas específicas.

ENTREGA
El módulo de entrega es informativo. Los términos de Belcorp México consultados indican preparación posterior al cierre de campaña y, para México, plazos de entrega que varían por zona; la referencia utilizada en la interfaz es 3–11 días hábiles para “resto del país”. No es una promesa de entrega y debe confirmarse al procesar el pedido.

AUTENTICACIÓN REAL
1. Crea un proyecto en Firebase.
2. Activa Authentication > Sign-in method > Google y Email/Password.
3. Activa verificación de correo para Email/Password.
4. Crea Firestore Database.
5. Copia firebase/firebase-config.example.js a firebase/firebase-config.js y pega las credenciales reales.
6. Publica firebase/firestore.rules.
7. El administrador es maluvasa12@gmail.com.
8. Firebase permite manejar Google Login en Android, iPhone, tablet y PC; el código intenta popup y usa redirect cuando corresponde.

SIN FIREBASE
- La interfaz funciona en modo demo.
- El registro y acceso de demo se guardan solamente en localStorage del navegador.
- No es una base de datos compartida entre dispositivos.
- Para comprobar que un correo existe realmente y almacenar usuarios entre teléfonos/computadoras se necesita Firebase Authentication (o un backend equivalente).

VIDEO
assets/intro.mp4 es una versión local preparada a partir del video entregado por el cliente, recortada para comenzar en una parte visual más adecuada y con una corrección ligera de brillo/contraste/saturación.

WHATSAPP
Cambia CONFIG.whatsapp en js/app.js por el número internacional sin + ni espacios.

GOOGLE MAPS
La ubicación configurada actualmente es:
https://maps.app.goo.gl/Bj2HpmuZLbYH4kea6

CATÁLOGO DE REFERENCIA
https://catalogodigital.somosbelcorp.com/MX?consultant=MTY5MDUxMA==

SERVIDOR LOCAL
Recomendado: VS Code + Live Server.
También puedes ejecutar:
python -m http.server 5500
Y abrir:
http://localhost:5500
