'use server'

import { redirect } from 'next/navigation';

export async function register(previousState: any, formData: FormData) {
  const name = `${formData.get('firstName')} ${formData.get('lastName')}`;
  formData.delete('firstName');
  formData.delete('lastName');
  formData.set('name', name);

  const response = await fetch(`${process.env.AUTH_WORKER_URL}/register`,
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
