# AI Proposal Pro

Extensión de Chrome para generar propuestas profesionales para trabajos de Upwork usando IA.

## 🚀 Características

- ✅ Detecta automáticamente páginas de job details en Upwork
- ✅ Botón flotante elegante con animaciones suaves
- ✅ Extrae título, descripción y skills del trabajo
- ✅ Interfaz moderna con diseño premium
- ✅ Sistema de notificaciones elegante
- ✅ Generador de propuestas (template base, listo para integración con IA)

## 📦 Instalación

1. Descarga o clona este repositorio
2. Abre Chrome y ve a `chrome://extensions/`
3. Activa el "Modo de desarrollador" en la esquina superior derecha
4. Haz clic en "Cargar extensión sin empaquetar"
5. Selecciona la carpeta de la extensión

## 🎯 Cómo usar

1. Navega a cualquier página de job details en Upwork.com
2. Verás aparecer un botón flotante en la esquina inferior derecha: "Generar Propuesta con IA"
3. Haz clic en el botón para extraer la información del trabajo
4. Abre el popup de la extensión (haz clic en el icono en la barra de herramientas)
5. Revisa los datos extraídos y genera tu propuesta

## 📁 Estructura de archivos

```
Extension/
├── manifest.json          # Configuración Manifest V3
├── content_script.js      # Script que detecta páginas y añade el botón
├── styles.css            # Estilos del botón flotante y notificaciones
├── popup.html            # Interfaz del popup
├── popup.js              # Lógica del popup
├── popup_styles.css      # Estilos del popup
├── icons/                # Iconos de la extensión (pendiente)
└── README.md             # Este archivo
```

## 🔧 Permisos

- `activeTab`: Para interactuar con la página activa
- `storage`: Para guardar datos extraídos
- `host_permissions`: Acceso a upwork.com

## 🎨 Iconos

**NOTA**: Necesitas añadir los iconos de la extensión en la carpeta `icons/`:
- `icon16.png` (16x16px)
- `icon48.png` (48x48px)  
- `icon128.png` (128x128px)

Puedes generar iconos temporales o usar una herramienta como [Favicon Generator](https://favicon.io/).

## 🔮 Próximas características

- [ ] Integración con API de IA (OpenAI, Claude, etc.)
- [ ] Plantillas personalizables de propuestas
- [ ] Historial de propuestas generadas
- [ ] Configuración de tono y estilo
- [ ] Análisis de competencia
- [ ] Sugerencias de precio

## 📝 Notas técnicas

- Manifest V3 (última versión requerida por Chrome)
- Funciona con la arquitectura SPA de Upwork (React)
- Observador de mutaciones para detectar navegación sin recarga
- Sistema de almacenamiento local para persistencia de datos

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Si encuentras algún bug o tienes sugerencias, por favor abre un issue.

## 📄 Licencia

MIT License - Siéntete libre de usar y modificar según tus necesidades.

---

**Desarrollado con ❤️ para freelancers de Upwork**
