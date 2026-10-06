# LlamadosUY · Simulador de ecosistema de llamados a empresas

Plataforma estática que simula un ecosistema de llamados (compras públicas) para
empresas. Pensada para hostearse en **GitHub Pages**: no requiere backend ni
build — es HTML + CSS + JS puro. Los datos se guardan en `localStorage` del
navegador y se sincronizan en vivo entre pestañas abiertas.

## Los dos entornos

El selector superior cambia entre las dos vistas (también podés usar
`?vista=telefono` o `?vista=admin` en la URL para abrir directo una vista):

### 📱 Teléfono — la empresa que recibe el aviso
- Mockup de celular con la app **LlamadosUY**
- Notificación push simulada cuando se publica un llamado nuevo
- Feed con filtros por rubro, contador de vencimiento y badge «Nuevo»
- Detalle del llamado: *Ver llamado completo*, *Ver requisitos* y *Postularse*
- Pestaña de postulaciones enviadas y perfil de empresa (inscripta en RUPE)

### 🏛️ Administración — el organismo que publica
- Dashboard con estadísticas (activos, postulaciones, próximo a vencer)
- Crear llamados: título, organismo, rubro, monto, fecha límite, lugar,
  descripción y lista dinámica de requisitos
- Guardar como **borrador** o **publicar** (notifica al teléfono al instante)
- Ver postulaciones recibidas por llamado, cerrar, republicar, editar y eliminar
- Botón «Restablecer demo» para volver a los datos de ejemplo

## Flujo de demostración sugerido

1. Abrí la vista **Administración** en una pestaña y **Teléfono** en otra
   (mismo navegador).
2. Publicá un llamado desde el panel → la notificación push aparece en el
   teléfono en tiempo real.
3. Desde el teléfono, tocá la notificación, revisá requisitos y postulate.
4. Volvé al panel → la postulación aparece en el contador del llamado.

## Deploy en GitHub Pages

1. Subí estos archivos a un repositorio (`index.html`, `styles.css`, `app.js`,
   `README.md`).
2. En el repo: **Settings → Pages → Source: Deploy from a branch**, elegí
   `main` y carpeta `/ (root)`.
3. Listo — la página queda disponible en `https://<usuario>.github.io/<repo>/`.

## Probar en local

Cualquier servidor estático sirve. Por ejemplo:

```bash
python -m http.server 8000
# o
npx serve .
```

y abrir `http://localhost:8000`.

## Notas

- Es una simulación: no hay backend real, las postulaciones y los llamados viven
  en `localStorage`. Limpiando los datos del sitio o con «Restablecer demo» se
  vuelve al estado inicial.
- Estructura: `index.html` (esqueleto de ambas vistas), `styles.css` (incluye el
  mockup del teléfono), `app.js` (estado, renderizado y eventos).
