export function corsResponse(response: Response): Response {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-db-host, x-db-port, x-db-database, x-db-user, x-db-password',
    };

    // Create a new response with CORS headers
    const newResponse = new Response(response.body, response);
    Object.entries(corsHeaders).forEach(([key, value]) => {
        newResponse.headers.set(key, value);
    });

    return newResponse;
}
