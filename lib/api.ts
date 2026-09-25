// L'adresse de ton API NestJS
const API_URL = "http://localhost:3000";

// Types qui décrivent les données échangées avec l'API
export interface User {
  id: string;
  email: string;
  name?: string | null;
  photoUrl?: string | null;
}

export type ContactGroup = "FAMILLE" | "AMI" | "TRAVAIL" | "AUTRE";

export interface Contact {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
  group: ContactGroup;
  isFavorite: boolean;
  photoUrl?: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

// Le token est gardé en mémoire du navigateur (localStorage),
// pour rester connecté après un rafraîchissement de la page.
const TOKEN_KEY = "token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// Une erreur "propre" à afficher à l'utilisateur, avec le code HTTP
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// Fonction générique : appelle l'API, ajoute le token automatiquement,
// et transforme une erreur HTTP en ApiError lisible.
async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message =
      (Array.isArray(body?.message) ? body.message.join(", ") : body?.message) ??
      "Une erreur est survenue";
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// --- Authentification ---

export function register(email: string, password: string, name?: string) {
  return request<User>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
}

export async function login(email: string, password: string) {
  const { access_token } = await request<{ access_token: string }>(
    "/auth/login",
    { method: "POST", body: JSON.stringify({ email, password }) },
  );
  setToken(access_token);
  return access_token;
}

export function me() {
  return request<{ userId: string; email: string }>("/auth/me");
}

// --- Contacts ---

export function getContacts(search?: string, group?: ContactGroup) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (group) params.set("group", group);
  const query = params.toString();
  return request<Contact[]>(`/contacts${query ? `?${query}` : ""}`);
}

export function getContact(id: string) {
  return request<Contact>(`/contacts/${id}`);
}

export function createContact(data: {
  fullName: string;
  phone: string;
  email?: string;
  notes?: string;
  group?: ContactGroup;
  isFavorite?: boolean;
}) {
  return request<Contact>("/contacts", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateContact(
  id: string,
  data: Partial<{
    fullName: string;
    phone: string;
    email: string;
    notes: string;
    group: ContactGroup;
    isFavorite: boolean;
  }>,
) {
  return request<Contact>(`/contacts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteContact(id: string) {
  return request<Contact>(`/contacts/${id}`, { method: "DELETE" });
}

// --- Photos ---

export function uploadContactPhoto(id: string, file: File) {
  const formData = new FormData();
  formData.append("photo", file);
  return request<Contact>(`/contacts/${id}/photo`, {
    method: "POST",
    body: formData,
  });
}

export function uploadProfilePhoto(file: File) {
  const formData = new FormData();
  formData.append("photo", file);
  return request<User>("/users/me/photo", { method: "POST", body: formData });
}

// Construit l'adresse complète d'une photo à partir de son chemin relatif
export function photoUrl(path?: string | null): string | undefined {
  return path ? `${API_URL}${path}` : undefined;
}