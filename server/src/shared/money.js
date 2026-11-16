// Punto de entrada del backend al helper único de dinero.
//
// En local re-exporta el módulo de la raíz. En Docker este archivo se
// reemplaza por una copia de shared/money.js (ver server/Dockerfile), de modo
// que el contenedor no dependa de rutas fuera de /app.
export * from '../../../shared/money.js';
