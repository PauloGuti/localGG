# Seguridad

## Secretos
- Este repositorio **no contiene ni debe contener** claves, tokens ni certificados.
- Las claves de IA que un usuario introduzca en la app se guardan **solo en su equipo**, cifradas con el llavero del sistema. localGG no tiene servidor propio ni las envía a nadie salvo al proveedor que el usuario eligió.
- CI ejecuta `gitleaks` en cada push y PR. Si encuentras un secreto expuesto, avisa de forma privada (ver abajo) y rota la clave.

## Reportar una vulnerabilidad
Usa *Security → Report a vulnerability* en GitHub. Evita abrir un issue público con detalles de explotación.
