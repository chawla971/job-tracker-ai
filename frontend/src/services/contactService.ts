import { api } from "@/lib/api";
import type {
  Contact, ContactWithChats, ContactCreate, ContactUpdate, ContactStatus,
  CoffeeChat, CoffeeChatCreate, CoffeeChatUpdate,
} from "@/types/contact";

export const contactService = {
  getAll: (params?: { status?: ContactStatus; overdue_only?: boolean; job_id?: string }): Promise<Contact[]> => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.overdue_only) qs.set("overdue_only", "true");
    if (params?.job_id) qs.set("job_id", params.job_id);
    const query = qs.toString() ? `?${qs}` : "";
    return api.get<Contact[]>(`/api/contacts/${query}`);
  },
  getOne: (id: string) => api.get<ContactWithChats>(`/api/contacts/${id}`),
  create: (data: ContactCreate) => api.post<Contact>("/api/contacts/", data),
  update: (id: string, data: ContactUpdate) => api.patch<Contact>(`/api/contacts/${id}`, data),
  delete: (id: string) => api.delete(`/api/contacts/${id}`),
};

export const coffeeChatService = {
  getByContact: (contactId: string) => api.get<CoffeeChat[]>(`/api/coffee-chats/?contact_id=${contactId}`),
  create: (data: CoffeeChatCreate) => api.post<CoffeeChat>("/api/coffee-chats/", data),
  update: (id: string, data: CoffeeChatUpdate) => api.patch<CoffeeChat>(`/api/coffee-chats/${id}`, data),
  delete: (id: string) => api.delete(`/api/coffee-chats/${id}`),
};
