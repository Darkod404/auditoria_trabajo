# Sistema de Auditoría

Aplicación web para gestión de auditorías internas.

## Iniciar Sesión

- **Usuario:** user
- **Contraseña:** 123

## Características

### 1. Gestión de Áreas
- Agregar nuevas áreas de auditoría (ej: Ventas, Abastecimiento)
- Cada área recibe un ID autoincremental

### 2. Gestión de Preguntas
- Agregar preguntas manualmente con su gravedad (1-10)
- Cargar preguntas desde archivo .txt
  - Sin severidad: cada línea es una pregunta (severidad = 1 por defecto)
  - Con severidad: usar formato "Pregunta|5" (ver `plantilla_preguntas_con_severidad.txt`)
- Asignar código a las preguntas para organizarlas

### 3. Realizar Auditorías
- Crear formularios de auditoría para un área específica
- Asignar código de preguntas
- Responder preguntas Sí/No
- Cada pregunta tiene una gravedad que afecta el porcentaje final

### 4. Resumen
- Ver todas las auditorías realizadas
- Ver área, fecha, preguntas y respuestas
- Ver porcentaje de cumplimiento

### 5. Exportar a Excel
- Generar archivo Excel con todas las auditorías
- Incluye fecha, área, preguntas, respuestas y porcentaje

## Instalación

```bash
npm install
npm run dev
```

## Despliegue en Vercel

1. Sube el código a GitHub
2. Conéctalo con Vercel
3. Deploy automático

## Estructura del archivo .txt de preguntas

Cada línea del archivo será una pregunta. Las preguntas se asociarán al código que indiques al cargar.
