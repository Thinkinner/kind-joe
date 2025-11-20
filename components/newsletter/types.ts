export interface Newsletter {
  id: string;
  title: string;
  description: string;
  frequency: string;
  imageUrl: string;
  topic: string; // Used for AI generation
}

export interface SubscriptionFormData {
  email: string;
  name: string;
  newsletterIds: string[];
}

export enum ModalType {
  NONE = 'NONE',
  SUBSCRIBE = 'SUBSCRIBE',
  PREVIEW = 'PREVIEW'
}