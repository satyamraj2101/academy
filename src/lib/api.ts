export class ApiError extends Error {
  status: number;
  data: any;
  
  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = 'An unexpected error occurred';
    let errorData = null;
    try {
      const data = await response.json();
      errorMessage = data.error || data.message || errorMessage;
      errorData = data;
    } catch {
      // Ignore JSON parse errors
    }
    throw new ApiError(response.status, errorMessage, errorData);
  }

  // Handle empty responses
  if (response.status === 204) {
    return {} as T;
  }

  try {
    return (await response.json()) as T;
  } catch (error) {
    throw new Error('Failed to parse API response');
  }
}
