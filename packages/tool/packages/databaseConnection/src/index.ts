import { z } from 'zod';
import { Client as PgClient } from 'pg'; // PostgreSQL 客户端
import mysql from 'mysql2/promise'; // MySQL 客户端
import mssql from 'mssql'; // SQL Server 客户端
import { addLog } from '@/utils/log';

// const supportedDatabaseTypes = ['PostgreSQL', 'MySQL', 'Microsoft SQL Server'];
const supportedDatabaseTypes = z.enum(['PostgreSQL', 'MySQL', 'Microsoft SQL Server']);

export const InputType = z
  .object({
    databaseType: supportedDatabaseTypes,
    host: z.string(),
    port: z.union([z.string(), z.number()]),
    databaseName: z.string(),
    user: z.string(),
    password: z.string(),
    sql: z.string()
  })
  .transform((data) => ({
    ...data,
    port: typeof data.port === 'string' ? parseInt(data.port, 10) : data.port
  }));

export const OutputType = z.object({
  // result: any; // 根据你的 SQL 查询结果类型调整
  result: z.any()
});

export async function tool({
  databaseName,
  databaseType,
  host,
  password,
  port,
  sql,
  user
}: z.infer<typeof InputType>): Promise<z.infer<typeof OutputType>> {
  let result;
  addLog.info('DatabaseConnection tool', {
    databaseType,
    host,
    port,
    databaseName,
    user,
    sql
  });
  try {
    if (databaseType === 'PostgreSQL') {
      const client = new PgClient({
        host,
        port,
        database: databaseName,
        user,
        password,
        connectionTimeoutMillis: 30000
      });

      await client.connect();
      const res = await client.query(sql);
      result = res.rows;
      await client.end();
    } else if (databaseType === 'MySQL') {
      const connection = await mysql.createConnection({
        host,
        port,
        database: databaseName,
        user,
        password,
        connectTimeout: 30000
      });

      const [rows] = await connection.execute(sql);
      result = rows;
      await connection.end();
    } else if (databaseType === 'Microsoft SQL Server') {
      const pool = await mssql.connect({
        server: host,
        port,
        database: databaseName,
        user,
        password,
        options: {
          trustServerCertificate: true
        }
      });

      result = await pool.query(sql);
      await pool.close();
    }
    return {
      result
    };
  } catch (error: unknown) {
    // 使用类型断言来处理错误
    if (error instanceof Error) {
      console.error('Database query error:', error.message);
      return Promise.reject(error.message);
    }
    console.error('Database query error:', error);
    return Promise.reject('An unknown error occurred');
  }
}
