// bcryptjs does not ship with its own types, and @types/bcryptjs is now a deprecated stub.
// This declaration allows TypeScript to import the module without errors.
declare module 'bcryptjs';