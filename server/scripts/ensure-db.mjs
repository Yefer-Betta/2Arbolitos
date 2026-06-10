import mysql from 'mysql2/promise';

const [host, user, pass, port] = process.argv.slice(2);
try {
  const conn = await mysql.createConnection({ host, user, password: pass, port: parseInt(port), connectTimeout: 5000 });
  await conn.query('CREATE DATABASE IF NOT EXISTS `2arbolitos` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  await conn.end();
  process.exit(0);
} catch (e) {
  process.stderr.write(e.message || String(e));
  process.exit(1);
}
