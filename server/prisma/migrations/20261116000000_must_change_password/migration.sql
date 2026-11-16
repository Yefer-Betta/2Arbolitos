-- Migración aditiva: obliga a cambiar la contraseña en el primer login.
-- No toca filas existentes (default false); el seed marca sus usuarios con true
-- y el arranque marca solo los que aún usan una clave conocida del seed.
ALTER TABLE `users` ADD COLUMN `mustChangePassword` BOOLEAN NOT NULL DEFAULT false;
