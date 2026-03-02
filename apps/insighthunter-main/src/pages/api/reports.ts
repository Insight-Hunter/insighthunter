
import type { APIRoute } from 'astro';
import { Surreal } from 'surrealdb'

export const GET: APIRoute = async ({ locals }) => {
  const db = locals.runtime.env.DB;
  
  try {
    // Replace 'reports' with your actual table name and implement your query logic
    const reports = await db.select('reports');
    
    return new Response(JSON.stringify(reports), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch reports' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const { title, client } = await request.json();

  if (!title || !client) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: title, client' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const db = locals.runtime.env.DB;

  try {
    // Replace 'reports' with your actual table name and structure
    const newReport = await db.create('reports', {
      title,
      client,
      status: 'Queued',
      generatedAt: new Date(),
    });

    return new Response(JSON.stringify(newReport), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating report:', error);
    return new Response(JSON.stringify({ error: 'Failed to create report' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
