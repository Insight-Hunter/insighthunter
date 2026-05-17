'use server'

import { redirect } from 'next/navigation';

export async function login(previousState: any, formData: FormData) {
  const response = await fetch(`${process.env.AUTH_WORKER_URL}/login`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(Object.fromEntries(formData)),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    return { error: data.error };
  }

  redirect('/dashboard');
}
