# Estilo: caricatura cálida (validado 2026-09-19)

Referencia de mercado: "Lo que nadie te cuenta sobre el negocio de los buffets libres" (dinerodespierto,
962K vistas, x56). Ilustración 2D cálida, stills con zoom/paneo lento (Ken Burns), corte cada 3-5 s,
subtítulos blancos sobre barra negra semitransparente. Su debilidad: el protagonista cambia de cara.
Nuestra ventaja: anfitrión fijo.

## Generación ($0, local)
tool `local_diffusion` con:
- model `stabilityai/stable-diffusion-xl-base-1.0`
- lora  `ByteDance/SDXL-Lightning:sdxl_lightning_8step_lora.safetensors`  (8 pasos, sin CFG)
- vae   `madebyollin/sdxl-vae-fp16-fix`   ← obligatorio en Mac: sin él 88-133 s/imagen por swap
- 1344x768 (16:9) · 768x1344 para Shorts · seed fija por escena

## Prompt (CLIP lee solo 77 tokens: personaje + escena primero, estilo al final)
- ANFITRIÓN: `curly-haired man with round glasses, mustard-yellow jacket, plain white t-shirt`
- ESTILO: `2D cartoon illustration, warm tan brown orange palette, thin brown outlines, soft light, flat shading`
- NEGATIVO: `photo, photorealistic, 3d render, text, letters, watermark, logo, blurry, deformed hands`
- Plantilla: `{ANFITRIÓN}, {acción simple + lugar + plano}, {ESTILO}` — contar tokens antes (ver projects/prueba-caricatura/generar_prueba.py)

## Medido en M5 16 GB (con VM + Office abiertos)
~25-38 s/imagen tras la carga (~40 s una vez). Video de 10 min ≈ 150 imágenes ≈ 75-95 min.
Cerrar la VM/Docker y apps pesadas debería acercarlo a ~20 s/imagen (medido 20 s en frío).

## Límites conocidos
- Acciones complejas o relaciones espaciales ("leche al fondo del pasillo") salen débiles → una acción simple por imagen, el concepto lo cuenta la narración/texto en pantalla.
- La ropa secundaria (color de camiseta) aún varía → revisar y regenerar con otra seed.
- Nunca texto dentro de la imagen: los rótulos se ponen en Remotion.
