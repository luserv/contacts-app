export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8081';

export const getDbHeaders = () => ({
  'x-db-host': 'localhost',
  'x-db-port': '5432',
  'x-db-database': 'contacts',
  'x-db-user': 'postgres',
  'x-db-password': 'admin',
});
