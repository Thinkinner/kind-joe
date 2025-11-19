
export interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  zipCode: string;
  agreedToTerms: boolean;
}

export interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  zipCode?: string;
  agreedToTerms?: string;
  // you can add serverError?: string if you want
}