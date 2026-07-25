export const normalizeEmail = (email: string): string => {
  return email.trim().toLowerCase();
};

export enum StringFormat {
  Email = 'email',
  Slug = 'slug'
}
