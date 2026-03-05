import { corsResponse } from '../cors-helper';
import { dbClient } from '../db-client';

export async function GET(request: Request, { id }: { id: string }) {
  try {
    const contact = await dbClient.getContactById(id);

    if (!contact) {
      return corsResponse(
        Response.json(
          { success: false, error: 'Contact not found' },
          { status: 404 }
        )
      );
    }

    return corsResponse(
      Response.json({ success: true, data: contact })
    );
  } catch (error) {
    console.error('Database error:', error);
    return corsResponse(
      Response.json(
        {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      )
    );
  }
}
