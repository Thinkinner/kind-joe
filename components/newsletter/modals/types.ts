export type RecapType = "Republican" | "Democratic" | "American Party" | "All";

export type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  zipCode: string;
  recapType?: RecapType | null;
};

export type FormErrors = {
  firstName?: string;
  lastName?: string;
  email?: string;
  zipCode?: string;
  recapType?: string;
};

export enum SubmissionStatus {
  IDLE = 'IDLE',
  SUBMITTING = 'SUBMITTING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}