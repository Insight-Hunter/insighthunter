export const fetchBusinesses = async () => {
  const response = await fetch('/api/business');
  if (!response.ok) {
    throw new Error('Failed to fetch businesses');
  }
  const data = await response.json();
  return data.data;
};