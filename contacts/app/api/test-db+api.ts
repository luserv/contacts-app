import { corsResponse } from './cors-helper';
import { dbClient } from './db-client';

export async function GET(request: Request) {
  try {
    const result = await dbClient.testConnection();
    return corsResponse(
      Response.json({
        success: result.success,
        message: result.message,
        data: result.data,
      })
    );
  } catch (error) {
    console.error('Database connection error:', error);
    return corsResponse(
      Response.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      )
    );
  }
}
