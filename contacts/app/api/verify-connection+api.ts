import { corsResponse } from './cors-helper';

export async function POST(request: Request) {
    try {
        const { Client } = await import('pg');
        const body = await request.json();
        const { host, port, database, user, password } = body;

        if (!host || !database || !user || !password) {
            return corsResponse(Response.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            ));
        }

        const client = new Client({
            host,
            port: parseInt(port || '5432'),
            database,
            user,
            password,
            ssl: false // Modify this if your DB requires SSL
        });

        await client.connect();

        try {
            const result = await client.query('SELECT NOW() as now');
            return corsResponse(Response.json({
                success: true,
                message: 'Connection successful!',
                timestamp: result.rows[0].now
            }));
        } finally {
            await client.end();
        }
    } catch (error) {
        console.error('Connection verification error:', error);
        return corsResponse(Response.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        ));
    }
}
