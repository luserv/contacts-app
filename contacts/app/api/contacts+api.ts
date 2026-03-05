import { corsResponse } from './cors-helper';
import { dbClient } from './db-client';

export async function GET(request: Request) {
  try {
    const data = await dbClient.getContacts();
    return corsResponse(
      Response.json({
        success: true,
        data,
      })
    );
  } catch (error) {
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { first_name = '', surname = '' } = body;

    const newContact = await dbClient.createContact({
      first_name,
      surname,
    });

    return corsResponse(
      Response.json({
        success: true,
        data: newContact,
      })
    );
  } catch (error) {
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
