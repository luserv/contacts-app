export function middleware(request: Request) {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, x-db-host, x-db-port, x-db-database, x-db-user, x-db-password',
            },
        });
    }

    return null;
}
